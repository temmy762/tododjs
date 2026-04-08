import Mashup from '../models/Mashup.js';
import MashupSettings from '../models/MashupSettings.js';
import { getSignedDownloadUrl, uploadToWasabi, deleteFromWasabi } from '../config/wasabi.js';
import { resolveSignedUrls } from '../utils/signedUrls.js';
import { detectGenreWithAI } from '../services/openai.js';
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
      tonality,
    } = req.query;

    const query = { isPublished: true };
    if (genre && genre !== 'all') query.genre = genre;
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
    const { videoUrl, pageTitle, pageDescription, bannerImageUrl } = req.body;
    let settings = await MashupSettings.findOne();
    if (!settings) {
      settings = await MashupSettings.create({});
    }

    if (videoUrl !== undefined) settings.videoUrl = videoUrl;
    if (bannerImageUrl !== undefined) settings.bannerImageUrl = bannerImageUrl;
    if (pageTitle !== undefined) settings.pageTitle = pageTitle;
    if (pageDescription !== undefined) settings.pageDescription = pageDescription;

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
    const { title, artist, genre, bpm, tonality } = req.body;

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

    // Detect genre using AI if not provided
    let detectedGenre = genre || 'Mashup';
    if (!genre) {
      const trackTitle = title || audioFile.originalname.replace(/\.[^/.]+$/, '');
      const trackArtist = artist || 'Unknown Artist';
      const aiGenre = await detectGenreWithAI(trackTitle, trackArtist);
      if (aiGenre) {
        detectedGenre = aiGenre;
      }
    }

    // Detect tonality and BPM if not provided
    let detectedTonality = tonality || '';
    let detectedBpm = bpm ? parseInt(bpm) : undefined;
    
    if (!tonality || !bpm) {
      try {
        const trackTitle = title || audioFile.originalname.replace(/\.[^/.]+$/, '');
        const trackArtist = artist || 'Unknown Artist';
        const { tonality: tonalityResult, detectedBpm: bpmResult } = await detectTonality(audioFile.buffer, {
          title: trackTitle,
          artist: trackArtist
        });
        
        if (!tonality && tonalityResult?.camelot) {
          detectedTonality = tonalityResult.camelot;
        }
        if (!bpm && bpmResult) {
          detectedBpm = Math.round(bpmResult);
        }
      } catch (error) {
        console.error('Tonality/BPM detection error for mashup:', error.message);
      }
    }

    const mashupData = {
      title: title || audioFile.originalname.replace(/\.[^/.]+$/, ''),
      artist: artist || 'Unknown Artist',
      genre: detectedGenre,
      bpm: detectedBpm,
      tonality: detectedTonality,
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
    const { title, artist, genre, bpm, tonality, isPublished, tonalityNeedsReview } = req.body;
    const mashup = await Mashup.findById(req.params.id);

    if (!mashup) {
      return res.status(404).json({ success: false, message: 'Mashup not found' });
    }

    if (title !== undefined) mashup.title = title;
    if (artist !== undefined) mashup.artist = artist;
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
