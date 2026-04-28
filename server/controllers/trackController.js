import Track from '../models/Track.js';
import Mashup from '../models/Mashup.js';
import Album from '../models/Album.js';
import Source from '../models/Source.js';
import DatePack from '../models/DatePack.js';
import { getSignedDownloadUrl, uploadToWasabi, deleteFromWasabi } from '../config/wasabi.js';
import { detectTonality } from '../services/tonalityDetection.js';
import { detectGenre } from '../services/genreDetection.js';
import { parseBuffer } from 'music-metadata';
import AdmZip from 'adm-zip';
import https from 'https';
import http from 'http';
import path from 'path';

// @desc    Get all tracks with search, pagination, filtering
// @route   GET /api/tracks
// @access  Private/Admin
export const getAllTracks = async (req, res) => {
  try {
    const {
      search = '',
      genre,
      pool,
      status,
      sort = '-createdAt',
      page = 1,
      limit = 25
    } = req.query;

    const query = {};

    // Text search across title, artist
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } }
      ];
    }

    if (genre) query.genre = genre;
    if (pool) query.pool = pool;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Track.countDocuments(query);

    const tracks = await Track.find(query)
      .populate('sourceId', 'name')
      .populate('albumId', 'name coverArt coverArtKey')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Resolve signed URLs for cover art
    const tracksWithUrls = await Promise.all(tracks.map(async (t) => {
      let cover = '';
      if (t.coverArtKey) {
        try { cover = await getSignedDownloadUrl(t.coverArtKey, 3600); } catch (e) { /* fallback */ }
      }
      if (!cover && t.coverArt) cover = t.coverArt;
      if (!cover && t.albumId?.coverArtKey) {
        try { cover = await getSignedDownloadUrl(t.albumId.coverArtKey, 3600); } catch (e) { /* fallback */ }
      }
      if (!cover && t.albumId?.coverArt) cover = t.albumId.coverArt;
      return { ...t, coverArt: cover || '' };
    }));

    res.status(200).json({
      success: true,
      data: tracksWithUrls,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Browse tracks (public library)
// @route   GET /api/tracks/browse
// @access  Public
export const browseTracks = async (req, res) => {
  try {
    const {
      search = '',
      genre,
      tonality,
      sort = '-dateAdded',
      page = 1,
      limit = 30
    } = req.query;

    const query = { status: 'published', 'tonality.camelot': { $exists: true, $nin: [null, ''] } };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } }
      ];
    }

    if (genre) query.genre = genre;
    if (tonality) query['tonality.camelot'] = tonality;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Track.countDocuments(query);

    const tracks = await Track.find(query)
      .select('title artist featuredArtist genre versionType bpm tonality pool collection coverArt coverArtKey dateAdded audioFile.duration isLocked requiredPlan albumId')
      .populate('albumId', 'coverArt coverArtKey')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Resolve cover art: track coverArtKey → album coverArt → fallback empty
    const mapped = await Promise.all(tracks.map(async (t) => {
      let cover = '';

      // Priority 1: Track has its own coverArtKey → generate signed URL
      if (t.coverArtKey) {
        try {
          cover = await getSignedDownloadUrl(t.coverArtKey, 3600);
        } catch (e) {
          cover = t.coverArt || '';
        }
      }

      // Priority 2: Track coverArt URL (may already be signed or public)
      if (!cover) {
        cover = t.coverArt || '';
      }

      // Priority 3: Album cover as fallback
      if (!cover || cover.endsWith('thumbnail.png') || cover.endsWith('thumbnail.jpg')) {
        const albumCover = t.albumId?.coverArt || '';
        cover = albumCover || cover;
      }

      return { ...t, coverArt: cover, coverArtKey: undefined, albumId: undefined };
    }));

    // Cache browse results for 5 min to reduce repeated cover art signing
    res.set('Cache-Control', 'private, max-age=300');
    res.status(200).json({
      success: true,
      data: mapped,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Browse all content (tracks + mashups) for the library
// @route   GET /api/tracks/library
// @access  Public
export const libraryTracks = async (req, res) => {
  try {
    const {
      search = '',
      genre,
      tonality,
      category,
      sort = '-dateAdded',
      page = 1,
      limit = 30
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    const sortDir = sort.startsWith('-') ? -1 : 1;
    const sortField = sort.replace(/^-/, '');

    // Track query
    const trackMatch = { status: 'published' };
    if (search) {
      trackMatch.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } }
      ];
    }
    if (genre) trackMatch.genre = genre;
    if (category) trackMatch.category = category;
    if (tonality) trackMatch['tonality.camelot'] = tonality;

    // The 9 non-"Others" fixed genres — used for genre normalization in aggregation
    const fixedGenresExcludingOthers = [
      'Reggaeton', 'Old School Reggaeton', 'Dembow', 'Trap',
      'House', 'EDM', 'Afro House', 'Remember', 'International'
    ];

    // Mashup query (tonality stored as a flat string, not nested)
    const mashupMatch = { isPublished: true };
    if (search) {
      mashupMatch.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) mashupMatch.category = category;
    if (genre) {
      // Mashups that predate the fixed-genre system may have genre='Mashup'.
      // When filtering 'Others', capture those non-fixed genres too.
      if (genre === 'Others') {
        mashupMatch.$or = [
          { genre: 'Others' },
          { genre: { $nin: [...fixedGenresExcludingOthers, 'Others'] } }
        ];
      } else {
        mashupMatch.genre = genre;
      }
    }
    if (tonality) mashupMatch.tonality = tonality;

    // Normalize mashup fields to match track shape.
    // Genre: if stored value is not a fixed genre, remap to 'Others'.
    const mashupNorm = [
      { $match: mashupMatch },
      {
        $addFields: {
          source: 'mashup',
          dateAdded: '$createdAt',
          pool: 'mashup',
          collection: 'Mashup',
          isLocked: false,
          requiredPlan: null,
          tonality: { camelot: '$tonality' },
          genre: {
            $cond: {
              if: { $in: ['$genre', [...fixedGenresExcludingOthers, 'Others']] },
              then: '$genre',
              else: 'Others'
            }
          }
        }
      }
    ];

    // Base pipeline: tracks first, then union with mashups
    const basePipeline = [
      { $match: trackMatch },
      {
        $addFields: {
          source: 'track',
          dateAdded: { $ifNull: ['$dateAdded', '$createdAt'] }
        }
      },
      { $unionWith: { coll: 'mashups', pipeline: mashupNorm } }
    ];

    // Total count
    const countResult = await Track.aggregate([
      ...basePipeline,
      { $count: 'total' }
    ]);
    const total = countResult[0]?.total || 0;

    // Paginated data
    const combined = await Track.aggregate([
      ...basePipeline,
      { $sort: { [sortField]: sortDir } },
      { $skip: skip },
      { $limit: limitNum },
      {
        $project: {
          title: 1, artist: 1, genre: 1, bpm: 1, tonality: 1,
          pool: 1, collection: 1, coverArt: 1, coverArtKey: 1,
          'audioFile.duration': 1, isLocked: 1, requiredPlan: 1,
          dateAdded: 1, source: 1, albumId: 1
        }
      }
    ]);

    // Resolve cover art signed URLs
    const mapped = await Promise.all(combined.map(async (t) => {
      let cover = '';
      if (t.coverArtKey) {
        try { cover = await getSignedDownloadUrl(t.coverArtKey, 3600); }
        catch { cover = t.coverArt || ''; }
      }
      if (!cover) cover = t.coverArt || '';
      return { ...t, coverArt: cover, coverArtKey: undefined };
    }));

    res.set('Cache-Control', 'private, max-age=300');
    res.status(200).json({
      success: true,
      data: mapped,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single track
// @route   GET /api/tracks/:id
// @access  Public
export const getTrack = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id)
      .populate('sourceId', 'name')
      .populate('albumId', 'name coverArt');

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track not found'
      });
    }

    res.status(200).json({
      success: true,
      data: track
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update track
// @route   PUT /api/tracks/:id
// @access  Private/Admin
export const updateTrack = async (req, res) => {
  try {
    const { title, artist, featuredArtist, bpm, genre } = req.body;

    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track not found'
      });
    }

    // Update fields
    if (title) track.title = title;
    if (artist) track.artist = artist;
    if (featuredArtist !== undefined) track.featuredArtist = featuredArtist;
    if (bpm !== undefined) track.bpm = bpm;
    if (genre) track.genre = genre;

    await track.save();

    res.status(200).json({
      success: true,
      data: track
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get track playback URL
// @route   GET /api/tracks/:id/playback
// @access  Private
export const getTrackPlaybackUrl = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track not found'
      });
    }

    if (!track.audioFile?.key) {
      return res.status(404).json({
        success: false,
        message: 'Audio file not available for this track'
      });
    }

    // Generate signed URL for streaming (valid for 1 hour)
    const playbackUrl = await getSignedDownloadUrl(track.audioFile.key, 3600);

    // Cache response for 55 min to reduce repeated Wasabi egress
    res.set('Cache-Control', 'private, max-age=3300');
    res.status(200).json({
      success: true,
      data: {
        url: playbackUrl,
        track: {
          id: track._id,
          title: track.title,
          artist: track.artist,
          duration: track.audioFile.duration,
          coverArt: track.coverArt
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete track
// @route   DELETE /api/tracks/:id
// @access  Private/Admin
// @desc    Re-analyze all tracks in an album with Essentia.js audio analysis
// @route   POST /api/tracks/reanalyze/:albumId
// @access  Private/Admin
export const reanalyzeAlbumTracks = async (req, res) => {
  try {
    const tracks = await Track.find({ albumId: req.params.albumId });
    if (tracks.length === 0) {
      return res.status(404).json({ success: false, message: 'No tracks found for this album' });
    }

    res.status(200).json({
      success: true,
      message: `Re-analyzing ${tracks.length} tracks in background...`
    });

    // Background processing
    (async () => {
      let updated = 0;
      for (const track of tracks) {
        try {
          if (!track.audioFile?.key) {
            console.log(`   ⚠ Skipping ${track.title} — no audio key stored`);
            continue;
          }

          console.log(`\n🔄 Re-analyzing: ${track.title}`);
          const signedUrl = await getSignedDownloadUrl(track.audioFile.key, 600);

          // Download audio from Wasabi
          const audioBuffer = await new Promise((resolve, reject) => {
            const client = signedUrl.startsWith('https') ? https : http;
            client.get(signedUrl, (response) => {
              const chunks = [];
              response.on('data', chunk => chunks.push(chunk));
              response.on('end', () => resolve(Buffer.concat(chunks)));
              response.on('error', reject);
            }).on('error', reject);
          });

          const metadata = { title: track.title, artist: track.artist };
          const { tonality, detectedBpm } = await detectTonality(audioBuffer, metadata);

          track.tonality = tonality;
          track.bpm = detectedBpm || track.bpm || 128;
          await track.save();
          updated++;
          console.log(`   ✅ Updated: ${track.title} → ${tonality.camelot || 'unknown'} | ${detectedBpm || track.bpm} BPM`);
        } catch (err) {
          console.error(`   ❌ Failed to re-analyze ${track.title}:`, err.message);
        }
      }
      console.log(`\n✅ Re-analysis complete: ${updated}/${tracks.length} tracks updated`);
    })();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk-fix tracks with missing/zero BPM using filename extraction + default fallback
// @route   PATCH /api/tracks/fix-bpm
// @access  Private/Admin
export const fixMissingBpm = async (req, res) => {
  try {
    const defaultBpm = parseInt(req.body.defaultBpm) || 128;

    const tracks = await Track.find({ $or: [{ bpm: { $lte: 0 } }, { bpm: null }, { bpm: { $exists: false } }] })
      .select('_id title bpm');

    if (!tracks.length) {
      return res.status(200).json({ success: true, message: 'No tracks with missing BPM found', updated: 0 });
    }

    let updated = 0;
    const results = [];

    for (const track of tracks) {
      let newBpm = null;

      // Try to extract BPM from title (e.g. "Song Title 128 BPM" or "Song [128]")
      const bpmMatch = track.title?.match(/(\d{2,3})\s*BPM/i) || track.title?.match(/\[(\d{2,3})\]/);
      if (bpmMatch) {
        const parsed = parseInt(bpmMatch[1]);
        if (parsed >= 60 && parsed <= 220) newBpm = parsed;
      }

      // Fall back to default
      if (!newBpm) newBpm = defaultBpm;

      await Track.updateOne({ _id: track._id }, { $set: { bpm: newBpm } });
      updated++;
      results.push({ title: track.title, bpm: newBpm, fromFilename: !!bpmMatch });
    }

    res.status(200).json({
      success: true,
      message: `Fixed BPM for ${updated} track(s)`,
      updated,
      results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload/replace track thumbnail
// @route   PUT /api/tracks/:id/thumbnail
// @access  Private/Admin
export const uploadTrackThumbnail = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) {
      return res.status(404).json({ success: false, message: 'Track not found' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    // Delete old cover art from Wasabi if it has a key
    if (track.coverArtKey) {
      try {
        await deleteFromWasabi(track.coverArtKey);
      } catch (err) {
        console.warn('Failed to delete old cover art:', err.message);
      }
    }

    // Upload new cover art
    const ext = path.extname(file.originalname) || '.jpg';
    const coverKey = `tracks/${track._id}/cover${ext}`;
    const upload = await uploadToWasabi(file.buffer, coverKey, file.mimetype);

    track.coverArt = upload.location;
    track.coverArtKey = upload.key;
    await track.save();

    // Return signed URL for immediate display
    const signedUrl = await getSignedDownloadUrl(upload.key, 3600);

    res.status(200).json({
      success: true,
      message: 'Track thumbnail updated',
      data: { coverArt: signedUrl, coverArtKey: upload.key }
    });
  } catch (error) {
    console.error('Thumbnail upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTrack = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track not found'
      });
    }

    const albumId = track.albumId;

    // Delete audio file from Wasabi
    if (track.audioFile?.key) {
      try { await deleteFromWasabi(track.audioFile.key); } catch (err) {
        console.warn('Failed to delete audio from Wasabi:', err.message);
      }
    }

    // Delete cover art from Wasabi
    if (track.coverArtKey) {
      try { await deleteFromWasabi(track.coverArtKey); } catch (err) {
        console.warn('Failed to delete cover art from Wasabi:', err.message);
      }
    }

    // Delete the track
    await track.deleteOne();

    // Update album track count
    if (albumId) {
      const remainingTracks = await Track.countDocuments({ albumId });
      await Album.findByIdAndUpdate(albumId, {
        trackCount: remainingTracks
      });
    }

    res.status(200).json({
      success: true,
      message: 'Track deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Upload tracks (individual MP3 or ZIP of MP3s)
// @route   POST /api/tracks/upload
// @access  Private/Admin
export const uploadTracks = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const isZip = file.mimetype === 'application/zip' || 
                  file.mimetype === 'application/x-zip-compressed' ||
                  file.originalname.toLowerCase().endsWith('.zip');

    if (isZip) {
      // Handle ZIP file
      let zip;
      try {
        zip = new AdmZip(file.buffer);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid ZIP file' });
      }

      const zipEntries = zip.getEntries();
      const mp3Files = zipEntries.filter(entry =>
        !entry.isDirectory &&
        entry.entryName.toLowerCase().endsWith('.mp3') &&
        !entry.entryName.includes('__MACOSX') &&
        !entry.entryName.startsWith('.')
      );

      if (mp3Files.length === 0) {
        return res.status(400).json({ success: false, message: 'No MP3 files found in ZIP' });
      }

      const zipName = path.parse(file.originalname).name;
      console.log(`\n🎵 ZIP upload: ${file.originalname} — ${mp3Files.length} tracks`);

      const createdTracks = [];
      const errors = [];

      for (const mp3Entry of mp3Files) {
        try {
          const track = await processOneTrack(mp3Entry.getData(), path.basename(mp3Entry.entryName), `tracks/uploads/${zipName}`, req.user.id);
          createdTracks.push(track);
          console.log(`   ✓ Track ${createdTracks.length}/${mp3Files.length}: ${track.title}`);
        } catch (err) {
          const name = path.basename(mp3Entry.entryName);
          errors.push({ file: name, error: err.message });
          console.log(`   ✗ Failed: ${name} — ${err.message}`);
        }
      }

      console.log(`\n✅ ZIP "${zipName}" complete: ${createdTracks.length}/${mp3Files.length} tracks processed`);

      res.status(200).json({
        success: true,
        message: `Processed ${createdTracks.length} of ${mp3Files.length} tracks from ${file.originalname}`,
        data: { trackCount: createdTracks.length, totalFiles: mp3Files.length, errors }
      });
    } else {
      // Handle individual MP3
      console.log(`\n🎵 Single track upload: ${file.originalname}`);
      const track = await processOneTrack(file.buffer, file.originalname, `tracks/uploads`, req.user.id);
      console.log(`   ✅ Uploaded: ${track.title} by ${track.artist}`);

      res.status(200).json({
        success: true,
        message: 'Track uploaded successfully',
        data: track
      });
    }
  } catch (error) {
    console.error('Track upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

async function processOneTrack(mp3Buffer, mp3Name, basePath, userId) {
  let metadata = {
    title: path.parse(mp3Name).name,
    artist: 'Unknown Artist',
    bpm: null,
    duration: 0
  };

  let embeddedCoverUrl = null;
  let embeddedCoverKey = null;

  try {
    const musicMetadata = await parseBuffer(mp3Buffer, { mimeType: 'audio/mpeg' });
    metadata = {
      title: musicMetadata.common.title || metadata.title,
      artist: musicMetadata.common.artist || metadata.artist,
      bpm: musicMetadata.common.bpm || null,
      duration: musicMetadata.format.duration || 0
    };

    // Extract embedded cover art
    const pictures = musicMetadata.common.picture;
    if (pictures && pictures.length > 0) {
      const pic = pictures[0];
      const ext = pic.format === 'image/png' ? '.png' : '.jpg';
      const coverKey = `${basePath}/${path.parse(mp3Name).name}-cover${ext}`;
      try {
        const coverUpload = await uploadToWasabi(pic.data, coverKey, pic.format);
        embeddedCoverUrl = coverUpload.location;
        embeddedCoverKey = coverUpload.key;
      } catch (coverErr) {
        console.warn(`   ⚠ Cover art upload failed for ${mp3Name}:`, coverErr.message);
      }
    }
  } catch (err) {
    console.warn(`   ⚠ Metadata parsing failed for ${mp3Name}`);
  }

  const { tonality, detectedBpm } = await detectTonality(mp3Buffer, metadata);
  const genreResult = await detectGenre(mp3Buffer, metadata);

  const trackKey = `${basePath}/${Date.now()}-${mp3Name}`;
  const trackUpload = await uploadToWasabi(mp3Buffer, trackKey, 'audio/mpeg');

  const track = await Track.create({
    title: metadata.title,
    artist: metadata.artist,
    genre: genreResult.genre || 'House',
    genreConfidence: genreResult.confidence,
    genreSource: genreResult.source,
    genreNeedsReview: genreResult.needsManualReview,
    bpm: detectedBpm || metadata.bpm || 128,
    tonality,
    coverArt: embeddedCoverUrl || undefined,
    coverArtKey: embeddedCoverKey || undefined,
    audioFile: {
      url: trackUpload.location,
      key: trackUpload.key,
      format: 'MP3',
      size: mp3Buffer.length,
      duration: metadata.duration
    },
    versionType: 'Original Mix',
    uploadedBy: userId,
    status: 'published'
  });

  return track;
}
