import https from 'https';
import http from 'http';
import Mashup from '../models/Mashup.js';
import MashupSettings from '../models/MashupSettings.js';
import { getSignedDownloadUrl, uploadToWasabi, deleteFromWasabi, ensureSignedUrl } from '../config/wasabi.js';
import { resolveSignedUrls } from '../utils/signedUrls.js';
import { detectGenreWithAI } from '../services/openai.js';
import { detectCategoryAsync } from '../services/categoryDetection.js';
import { detectTonality } from '../services/tonalityDetection.js';
import { parseBuffer } from 'music-metadata';

// @desc    Get all mashups (public) with optional server-side filtering
// @route   GET /api/mashups
// @access  Public
export const getMashups = async (req, res) => {
  try {
    const {
      sort = '-createdAt',
      limit = 30,
      page = 1,
      genre,
      category,
      tonality,
    } = req.query;

    const query = { isPublished: true, tonality: { $exists: true, $nin: [null, ''] } };
    if (genre && genre !== 'all') query.genre = genre;
    if (category && category !== 'all') query.category = category;
    if (tonality && tonality !== 'all') query.tonality = tonality;

    const total = await Mashup.countDocuments(query);
    const mashups = await Mashup.find(query)
      .sort(sort)
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const signed = await resolveSignedUrls(mashups, ['coverArt']);
    res.status(200).json({
      success: true,
      count: signed.length,
      data: signed,
      pagination: {
        total,
        pages: Math.ceil(total / parseInt(limit)),
        page: parseInt(page),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Mashup category keyword rules (same list as categorizeMashups.js) ────────
const MASHUP_CATEGORIES = [
  'Reggaeton', 'Old School Reggaeton', 'Dembow', 'Trap',
  'House', 'EDM', 'Afro House', 'Remember', 'International',
];

const MASHUP_CATEGORY_RULES = [
  { category: 'Old School Reggaeton', keywords: ['old school reggaeton','old-school reggaeton','reggaeton clasico','reggaeton clásico','reggaeton viejo','old school perreo'] },
  { category: 'Dembow',               keywords: ['dembow','dem bow'] },
  { category: 'Reggaeton',            keywords: ['reggaeton','reggaetón','regueton','reguetón','perreo','urbano latino'] },
  { category: 'Trap',                 keywords: ['trap','latin trap','trap latino','drill'] },
  { category: 'Afro House',           keywords: ['afro house','afrohouse','afro-house','afrobeat','amapiano','tribal house'] },
  { category: 'House',                keywords: ['tech house','deep house','progressive house','funky house','vocal house'] },
  { category: 'EDM',                  keywords: ['edm','electro house','big room','dubstep','trance','techno','drum and bass'] },
  { category: 'Remember',             keywords: ['remember','throwback','retro','oldies','80s','90s','clasicos','clásicos'] },
  { category: 'International',        keywords: ['hip hop','hip-hop','r&b','soul','funk','rock','indie','bachata','salsa','merengue','cumbia','reggae','dancehall'] },
];

function detectMashupCategoryByKeyword(text) {
  const lower = (text || '').toLowerCase();
  for (const rule of MASHUP_CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule.category;
    }
  }
  return null;
}

// Helper: download a remote audio file into a Buffer (follows up to 5 redirects)
function downloadAudioBuffer(url) {
  return new Promise((resolve, reject) => {
    const get = (targetUrl, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      const mod = targetUrl.startsWith('https') ? https : http;
      mod.get(targetUrl, res => {
        if ([301, 302, 307].includes(res.statusCode)) {
          res.resume();
          return get(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    get(url);
  });
}

function cleanMashupTitle(raw) {
  const FORCE_UPPER = new Set(['DJ', 'BPM', 'EDM', 'EP', 'LP']);
  const LOWER_WORDS = new Set(['a','an','the','of','in','on','at','to','by','de','del','la','el','y','e']);
  let t = (raw || '')
    .replace(/_/g, ' ')
    .replace(/\.(mp3|wav|flac|m4a)$/i, '')
    .replace(/\s*\(\s*\d+\s*\)\s*$/g, '')
    .replace(/\s*-?\s*copy$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const words = t.split(/\s+/);
  return words.map((word, idx) => {
    const core = word.replace(/[^a-zA-Z]/g, '');
    if (!core) return word;
    if (FORCE_UPPER.has(core.toUpperCase())) return word.toUpperCase();
    if (/^(ft\.?|feat\.?)$/i.test(word)) return idx === 0 ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase();
    if (idx !== 0 && idx !== words.length - 1 && LOWER_WORDS.has(core.toLowerCase())) return word.toLowerCase();
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

// @desc    Detect tonality + BPM for mashups missing a key, streams SSE progress
// @route   POST /api/mashups/detect-tonality
// @access  Private/Admin
export const detectMashupTonalitySSE = async (req, res) => {
  const { force = false } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const query = force
      ? { 'audioFile.url': { $exists: true, $ne: '' } }
      : {
          'audioFile.url': { $exists: true, $ne: '' },
          $or: [
            { tonality: '' },
            { tonality: null },
            { tonality: { $exists: false } },
            { tonalityNeedsReview: true },
          ],
        };

    const mashups = await Mashup.find(query).lean();
    send({ type: 'start', total: mashups.length });

    const stats = { ok: 0, needsReview: 0, failed: 0, skipped: 0 };

    for (let i = 0; i < mashups.length; i++) {
      const m = mashups[i];
      send({ type: 'progress', current: i + 1, total: mashups.length, title: m.title });

      try {
        const signedUrl = await ensureSignedUrl(m.audioFile.key || m.audioFile.url, 3600);
        const audioBuffer = await downloadAudioBuffer(signedUrl);

        const { tonality: tonalityResult, detectedBpm } = await detectTonality(audioBuffer, {
          title: m.title,
          artist: m.artist,
        });

        const newTonality = tonalityResult?.camelot || '';
        const newBpm = (!m.bpm || m.bpm === 0) && detectedBpm ? Math.round(detectedBpm) : null;
        const needsReview = !newTonality || tonalityResult?.needsManualReview === true;

        const update = { tonalityNeedsReview: needsReview };
        if (newTonality) update.tonality = newTonality;
        if (newBpm) update.bpm = newBpm;
        await Mashup.updateOne({ _id: m._id }, { $set: update });

        if (needsReview) stats.needsReview++; else stats.ok++;
        send({
          type: 'result',
          id: String(m._id),
          title: m.title,
          tonality: newTonality || null,
          bpm: newBpm || m.bpm || null,
          needsReview,
          ok: !needsReview,
        });
      } catch (err) {
        stats.failed++;
        send({ type: 'result', id: String(m._id), title: m.title, ok: false, error: err.message, needsReview: true });
      }
    }

    send({ type: 'done', stats });
  } catch (err) {
    send({ type: 'fatal', message: err.message });
  } finally {
    res.end();
  }
};

// @desc    Auto-categorize and clean titles for all mashups
// @route   POST /api/mashups/auto-categorize
// @access  Admin
export const autoCategorizeMashups = async (req, res) => {
  try {
    const { force = false, dryRun = false } = req.body;

    // In non-force mode, re-process mashups that still carry old genre-style categories
    const OLD_GENRE_CATS = new Set(['Reggaeton', 'Old School Reggaeton', 'Dembow', 'Trap', 'House', 'EDM', 'Afro House', 'Remember', 'International']);
    const filter = force
      ? {}
      : { $or: [{ category: { $exists: false } }, { category: null }, { category: '' }, { category: { $in: [...OLD_GENRE_CATS] } }] };

    const mashups = await Mashup.find(filter).lean();

    const results = [];
    let updated = 0;

    for (const m of mashups) {
      const cleanedTitle = cleanMashupTitle(m.title);
      const { category: detectedCategory, raw: categoryRaw } = await detectCategoryAsync(cleanedTitle, null);

      const categoryChanged = detectedCategory !== m.category;
      const titleChanged    = cleanedTitle !== m.title;

      if (!categoryChanged && !titleChanged) continue;

      const entry = {
        id:          m._id,
        title:       m.title,
        newTitle:    titleChanged    ? cleanedTitle      : m.title,
        category:    m.category,
        newCategory: categoryChanged ? detectedCategory  : m.category,
        raw:         categoryRaw,
      };
      results.push(entry);

      if (!dryRun) {
        const update = {};
        if (categoryChanged) { update.category = detectedCategory; update.categoryRaw = categoryRaw; }
        if (titleChanged)    update.title = cleanedTitle;
        await Mashup.updateOne({ _id: m._id }, { $set: update });
        updated++;
      }
    }

    res.json({
      success: true,
      dryRun,
      processed: mashups.length,
      changed: results.length,
      updated: dryRun ? 0 : updated,
      results,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get distinct genres from published mashups
// @route   GET /api/mashups/genres
// @access  Public
export const getMashupGenres = async (req, res) => {
  try {
    const genres = await Mashup.distinct('genre', { isPublished: true });
    res.status(200).json({ success: true, data: genres.filter(Boolean).sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get mashup settings (video link, page title)
// @route   GET /api/mashups/settings
// @access  Public
export const getMashupSettings = async (req, res) => {
  try {
    let settings = await MashupSettings.findOne();
    if (!settings) {
      settings = await MashupSettings.create({});
    }
    const data = settings.toObject ? settings.toObject() : settings;

    if (data.bannerImageKey) {
      try {
        data.bannerImageUrl = await getSignedDownloadUrl(data.bannerImageKey);
      } catch {
        // ignore
      }
    }
    if (!Array.isArray(data.categories) || data.categories.length === 0) {
      data.categories = ['Reggaeton', 'Old School Reggaeton', 'Dembow', 'Trap', 'House', 'EDM', 'Afro House', 'Remember', 'International'];
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadMashupBanner = async (req, res) => {
  try {
    const bannerFile = req.files?.banner?.[0];
    if (!bannerFile) {
      return res.status(400).json({ success: false, message: 'Please upload a banner image' });
    }

    let settings = await MashupSettings.findOne();
    if (!settings) {
      settings = await MashupSettings.create({});
    }

    if (settings.bannerImageKey) {
      try { await deleteFromWasabi(settings.bannerImageKey); } catch {}
    }

    const ext = (bannerFile.originalname.split('.').pop() || 'jpg').toLowerCase();
    const key = `site/banners/mashups-${Date.now()}.${ext}`;
    const upload = await uploadToWasabi(bannerFile.buffer, key, bannerFile.mimetype);

    settings.bannerImageUrl = upload.location || upload.Location;
    settings.bannerImageKey = key;
    await settings.save();

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update mashup settings
// @route   PUT /api/mashups/settings
// @access  Private/Admin
export const updateMashupSettings = async (req, res) => {
  try {
    const { videoUrl, pageTitle, pageDescription, bannerImageUrl, categories } = req.body;
    let settings = await MashupSettings.findOne();
    if (!settings) {
      settings = await MashupSettings.create({});
    }

    if (videoUrl !== undefined) settings.videoUrl = videoUrl;
    if (bannerImageUrl !== undefined) settings.bannerImageUrl = bannerImageUrl;
    if (pageTitle !== undefined) settings.pageTitle = pageTitle;
    if (pageDescription !== undefined) settings.pageDescription = pageDescription;
    if (categories !== undefined && Array.isArray(categories)) settings.categories = categories;

    await settings.save();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all mashups (admin - includes unpublished)
// @route   GET /api/mashups/admin
// @access  Private/Admin
export const getAdminMashups = async (req, res) => {
  try {
    const mashups = await Mashup.find()
      .sort('-createdAt')
      .populate('uploadedBy', 'name email')
      .lean();

    const signed = await resolveSignedUrls(mashups, ['coverArt']);
    res.status(200).json({ success: true, count: signed.length, data: signed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload a new mashup track
// @route   POST /api/mashups
// @access  Private/Admin
export const createMashup = async (req, res) => {
  try {
    const { title, artist, category, genre, bpm, tonality } = req.body;

    if (!req.files || !req.files.audio) {
      return res.status(400).json({ success: false, message: 'Please upload an audio file' });
    }

    const audioFile = req.files.audio[0];
    const allowedAudio = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/x-wav', 'audio/mp3'];
    if (!allowedAudio.includes(audioFile.mimetype)) {
      return res.status(400).json({ success: false, message: 'Only MP3, WAV, and FLAC files are allowed' });
    }

    // Upload audio to Wasabi
    const audioExt = audioFile.originalname.split('.').pop() || 'mp3';
    const audioKey = `mashups/audio/${Date.now()}-${audioFile.originalname.replace(/\s+/g, '_')}`;
    const audioUpload = await uploadToWasabi(audioFile.buffer, audioKey, audioFile.mimetype);

    const formatMap = { mp3: 'MP3', wav: 'WAV', flac: 'FLAC' };

    // Clean title professionally (strip underscores, filename artifacts, apply Title Case)
    const rawTitle   = title || audioFile.originalname.replace(/\.[^/.]+$/, '');
    const cleanTitle = cleanMashupTitle(rawTitle);

    // Detect pool-brand category from title (e.g. "(Latin Box Edit)" → "Latin Box")
    const trackArtist = artist || 'Unknown Artist';
    let detectedCategory = category || null;
    let categoryRaw = null;

    if (!detectedCategory) {
      const catResult = await detectCategoryAsync(cleanTitle, null);
      detectedCategory = catResult.category;   // 'Latin Box', 'DJ City', … or 'Others'
      categoryRaw = catResult.raw;             // raw extracted string
    }

    // Detect genre using AI (independent of pool-brand category)
    let detectedGenre = genre || 'Mashup';
    try {
      const aiGenre = await detectGenreWithAI(cleanTitle, trackArtist);
      if (aiGenre) detectedGenre = aiGenre;
    } catch { /* AI genre detection is best-effort */ }

    // Detect tonality and BPM if not provided
    let detectedTonality = tonality || '';
    let detectedBpm = bpm ? parseInt(bpm) : undefined;
    let tonalityNeedsReview = false;

    if (!tonality || !bpm) {
      try {
        const { tonality: tonalityResult, detectedBpm: bpmResult } = await detectTonality(audioFile.buffer, {
          title: cleanTitle,
          artist: trackArtist
        });

        if (!tonality) {
          if (tonalityResult?.camelot) {
            detectedTonality = tonalityResult.camelot;
          }
          tonalityNeedsReview = tonalityResult?.needsManualReview || !tonalityResult?.camelot;
        }
        if (!bpm && bpmResult) {
          detectedBpm = Math.round(bpmResult);
        }
      } catch (error) {
        console.error('Tonality/BPM detection error for mashup:', error.message);
        tonalityNeedsReview = true;
      }
    }

    const mashupData = {
      title: cleanTitle,
      artist: trackArtist,
      category: detectedCategory || 'Others',
      categoryRaw,
      genre: detectedGenre,
      bpm: detectedBpm,
      tonality: detectedTonality,
      tonalityNeedsReview,
      audioFile: {
        url: audioUpload.location || audioUpload.Location,
        key: audioKey,
        format: formatMap[audioExt.toLowerCase()] || 'MP3',
        size: audioFile.size
      },
      uploadedBy: req.user.id
    };

    // Upload cover art if provided
    if (req.files.coverArt && req.files.coverArt[0]) {
      const coverFile = req.files.coverArt[0];
      const coverKey = `mashups/covers/${Date.now()}-${coverFile.originalname.replace(/\s+/g, '_')}`;
      const coverUpload = await uploadToWasabi(coverFile.buffer, coverKey, coverFile.mimetype);
      mashupData.coverArt = coverUpload.location || coverUpload.Location;
      mashupData.coverArtKey = coverKey;
    }

    // Extract embedded cover art from audio if no cover art uploaded
    if (!req.files.coverArt || !req.files.coverArt[0]) {
      try {
        const musicMetadata = await parseBuffer(audioFile.buffer, { mimeType: audioFile.mimetype });
        const pictures = musicMetadata.common.picture;
        if (pictures && pictures.length > 0) {
          const pic = pictures[0];
          const ext = pic.format === 'image/png' ? '.png' : '.jpg';
          const coverKey = `mashups/covers/${Date.now()}-extracted${ext}`;
          const coverUpload = await uploadToWasabi(pic.data, coverKey, pic.format);
          mashupData.coverArt = coverUpload.location || coverUpload.Location;
          mashupData.coverArtKey = coverKey;
        }
      } catch (err) {
        console.warn('   ⚠ No embedded cover art found or extraction failed');
      }
    }

    const mashup = await Mashup.create(mashupData);

    res.status(201).json({ success: true, data: mashup });
  } catch (error) {
    console.error('Mashup upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a mashup
// @route   PUT /api/mashups/:id
// @access  Private/Admin
export const updateMashup = async (req, res) => {
  try {
    const { title, artist, category, genre, bpm, tonality, isPublished, tonalityNeedsReview } = req.body;
    const mashup = await Mashup.findById(req.params.id);

    if (!mashup) {
      return res.status(404).json({ success: false, message: 'Mashup not found' });
    }

    if (title !== undefined) mashup.title = title;
    if (artist !== undefined) mashup.artist = artist;
    if (category !== undefined) mashup.category = category;
    if (genre !== undefined) mashup.genre = genre;
    if (bpm !== undefined) mashup.bpm = parseInt(bpm);
    if (tonality !== undefined) {
      mashup.tonality = tonality;
      // Automatically clear the review flag when a tonality is assigned
      if (tonality) mashup.tonalityNeedsReview = false;
    }
    if (tonalityNeedsReview !== undefined) mashup.tonalityNeedsReview = tonalityNeedsReview;
    if (isPublished !== undefined) mashup.isPublished = isPublished;

    // Update cover art if provided
    if (req.files && req.files.coverArt && req.files.coverArt[0]) {
      if (mashup.coverArtKey) {
        try { await deleteFromWasabi(mashup.coverArtKey); } catch {}
      }
      const coverFile = req.files.coverArt[0];
      const coverKey = `mashups/covers/${Date.now()}-${coverFile.originalname.replace(/\s+/g, '_')}`;
      const coverUpload = await uploadToWasabi(coverFile.buffer, coverKey, coverFile.mimetype);
      mashup.coverArt = coverUpload.location || coverUpload.Location;
      mashup.coverArtKey = coverKey;
    }

    await mashup.save();
    res.status(200).json({ success: true, data: mashup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a mashup
// @route   DELETE /api/mashups/:id
// @access  Private/Admin
export const deleteMashup = async (req, res) => {
  try {
    const mashup = await Mashup.findById(req.params.id);

    if (!mashup) {
      return res.status(404).json({ success: false, message: 'Mashup not found' });
    }

    // Delete files from Wasabi
    if (mashup.audioFile?.key) {
      try { await deleteFromWasabi(mashup.audioFile.key); } catch {}
    }
    if (mashup.coverArtKey) {
      try { await deleteFromWasabi(mashup.coverArtKey); } catch {}
    }

    await mashup.deleteOne();
    res.status(200).json({ success: true, message: 'Mashup deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get mashup playback URL
// @route   GET /api/mashups/:id/playback
// @access  Public
export const getMashupPlayback = async (req, res) => {
  try {
    const mashup = await Mashup.findById(req.params.id);
    if (!mashup || !mashup.audioFile?.key) {
      return res.status(404).json({ success: false, message: 'Mashup not found' });
    }

    const url = await getSignedDownloadUrl(mashup.audioFile.key, 3600);

    mashup.plays = (mashup.plays || 0) + 1;
    await mashup.save();

    // Cache response for 55 min to reduce repeated Wasabi egress
    res.set('Cache-Control', 'private, max-age=3300');
    res.status(200).json({ success: true, data: { url } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
