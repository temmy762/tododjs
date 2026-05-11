import Album from '../models/Album.js';
import Source from '../models/Source.js';
import DatePack from '../models/DatePack.js';
import Track from '../models/Track.js';
import { uploadToWasabi, deleteFromWasabi, getSignedDownloadUrl } from '../config/wasabi.js';
import { resolveSignedUrls, resolveSignedUrl } from '../utils/signedUrls.js';
import { extractMetadataFromZip, detectDuplicates } from '../utils/metadataExtractor.js';
import { detectTonality } from '../services/tonalityDetection.js';
import { detectGenre } from '../services/genreDetection.js';
import { detectCategoryAsync } from '../services/categoryDetection.js';
import AdmZip from 'adm-zip';
import path from 'path';
import { parseBuffer } from 'music-metadata';

function withTimeout(promise, timeoutMs, timeoutValue) {
  let timer;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => resolve(timeoutValue), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// @desc    Upload album ZIP (single ZIP of MP3s) under a Source + DateCard
// @route   POST /api/albums/upload
// @access  Private/Admin
export const uploadAlbum = async (req, res) => {
  try {
    const { sourceId, datePackId, albumName, albumYear, genre, category } = req.body;
    const zipFile = req.files?.albumZip?.[0];
    const coverFile = req.files?.coverArt?.[0];

    if (!zipFile) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a ZIP file'
      });
    }

    if (!sourceId || !datePackId) {
      return res.status(400).json({
        success: false,
        message: 'Source and Date Card are required'
      });
    }

    const source = await Source.findById(sourceId);
    if (!source) {
      return res.status(404).json({ success: false, message: 'Source not found' });
    }

    const datePack = await DatePack.findById(datePackId);
    if (!datePack) {
      return res.status(404).json({ success: false, message: 'Date Card not found' });
    }

    // Extract ZIP
    const zip = new AdmZip(zipFile.buffer);
    const zipEntries = zip.getEntries();

    const mp3Files = zipEntries.filter(entry =>
      !entry.isDirectory &&
      entry.entryName.toLowerCase().endsWith('.mp3') &&
      !entry.entryName.includes('__MACOSX')
    );

    if (mp3Files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No MP3 files found in ZIP'
      });
    }

    console.log(`\n🎵 Album upload: ${albumName || zipFile.originalname} — ${mp3Files.length} tracks`);

    // Upload cover art if provided
    let coverArtUrl = source.thumbnail;
    let coverArtKeyVal = source.thumbnailKey || null;
    if (coverFile) {
      const coverKey = `sources/${source.name}-${source.year}/albums/${albumName || 'album'}/cover${path.extname(coverFile.originalname)}`;
      const coverUpload = await uploadToWasabi(coverFile.buffer, coverKey, coverFile.mimetype);
      coverArtUrl = coverUpload.location;
      coverArtKeyVal = coverUpload.key;
    }

    // Create album record
    // Auto-detect category if not explicitly provided by admin
    const finalAlbumName = albumName || path.parse(zipFile.originalname).name;
    let resolvedCategory = category || null;
    let resolvedCategoryRaw = null;
    if (!resolvedCategory) {
      const catResult  = await detectCategoryAsync(null, finalAlbumName);
      const detected   = catResult.category && catResult.category !== 'Others' ? catResult.category : null;
      resolvedCategory    = detected || 'Premium Pack';
      resolvedCategoryRaw = catResult.raw || null;
    }

    const album = await Album.create({
      sourceId,
      datePackId,
      name: finalAlbumName,
      genre: genre || null,
      year: albumYear || source.year || new Date().getFullYear(),
      coverArt: coverArtUrl,
      coverArtKey: coverArtKeyVal,
      trackCount: mp3Files.length,
      totalSize: zipFile.size,
      uploadedBy: req.user.id,
      category: resolvedCategory,
      categoryRaw: resolvedCategoryRaw
    });

    // Respond immediately — ZIP upload + track processing happen in background
    res.status(201).json({
      success: true,
      message: `Album created. Processing ${mp3Files.length} tracks in background.`,
      data: { album }
    });

    // Background: upload ZIP to Wasabi + process tracks
    processAlbumTracksAsync(album, mp3Files, source, datePack, coverArtUrl, req.user.id, zipFile);
  } catch (error) {
    console.error('Album upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

async function processAlbumTracksAsync(album, mp3Files, source, datePack, coverArtUrl, userId, zipFile) {
  let totalSize = 0;
  let processedCount = 0;

  console.log(`\n🔄 Starting background track processing for album: ${album.name}`);
  console.log(`   Album ID: ${album._id}`);
  console.log(`   Tracks to process: ${mp3Files.length}`);

  // Set initial processing status
  album.processingStatus = 'processing';
  album.processingProgress = 0;
  album.processedTracks = 0;
  await album.save();

  try {
    // Upload ZIP to Wasabi for bulk download — run in background so it does NOT
    // block per-track progress updates (large ZIPs can take minutes).
    if (zipFile) {
      const zipKey = `sources/${source.name}-${source.year}/albums/${album.name}/album.zip`;
      console.log(`   📦 ZIP upload started in background (${(zipFile.size / 1024 / 1024).toFixed(1)} MB)...`);
      uploadToWasabi(zipFile.buffer, zipKey, 'application/zip')
        .then(zipUpload =>
          Album.findByIdAndUpdate(album._id, { zipUrl: zipUpload.location, zipKey: zipUpload.key })
            .then(() => console.log(`   ✓ ZIP uploaded to Wasabi`))
        )
        .catch(err => console.warn(`   ⚠ ZIP background upload failed:`, err.message));
    }

    for (const mp3Entry of mp3Files) {
      const mp3Buffer = mp3Entry.getData();
      const mp3Name = path.basename(mp3Entry.entryName);

      // Each track is wrapped in its own try-catch so a single failure
      // (bad metadata, Wasabi blip, validation error) does NOT abort
      // the remaining tracks in the album.
      try {
        const baseName = path.parse(mp3Name).name;
        let metadata = {
          title: baseName,
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

          // Extract embedded cover art from ID3 tags
          const pictures = musicMetadata.common.picture;
          if (pictures && pictures.length > 0) {
            const pic = pictures[0];
            const ext = pic.format === 'image/png' ? '.png' : '.jpg';
            const coverKey = `sources/${source.name}-${source.year}/albums/${album.name}/covers/${path.parse(mp3Name).name}${ext}`;
            try {
              const coverUploadResult = await uploadToWasabi(pic.data, coverKey, pic.format);
              embeddedCoverUrl = coverUploadResult.location;
              embeddedCoverKey = coverUploadResult.key;
            } catch (coverErr) {
              console.warn(`   ⚠ Failed to upload embedded cover for ${mp3Name}:`, coverErr.message);
            }
          }
        } catch (err) {
          console.warn(`   ⚠ Metadata parsing failed for ${mp3Name}`);
        }

        // Artist/Title fallback: if ID3 artist missing, parse filename "Artist - Title"
        const UNKNOWN_RE = /^unknown\s*artist$/i;
        if (!metadata.artist || UNKNOWN_RE.test(metadata.artist)) {
          const dashIdx = baseName.indexOf(' - ');
          if (dashIdx > 0) {
            const fnArtist = baseName.slice(0, dashIdx).trim();
            const fnTitle  = baseName.slice(dashIdx + 3).trim();
            if (fnArtist) {
              metadata.artist = fnArtist;
              if (metadata.title === baseName) metadata.title = fnTitle || metadata.title;
            }
          }
        }

        // Skip track if artist is still unresolvable after all fallbacks
        if (!metadata.artist || UNKNOWN_RE.test(metadata.artist)) {
          console.warn(`   ⚠ Skipping ${mp3Name} — artist could not be determined`);
          processedCount++;
          const progress = Math.round((processedCount / mp3Files.length) * 100);
          album.processingProgress = progress;
          album.processedTracks = processedCount;
          try { await album.save(); } catch { /* ignore */ }
          continue;
        }

        // Tonality + BPM detection — wrapped with 45 s timeout so a hanging
        // AI/Essentia worker does not stall the entire track loop.
        const tonalityResult = await withTimeout(
          detectTonality(mp3Buffer, metadata),
          45000,
          { tonality: null, detectedBpm: null }
        );
        const tonality = tonalityResult?.tonality || {
          key: null, scale: null, camelot: null,
          source: 'timeout', confidence: 0, needsManualReview: true
        };
        const detectedBpm = tonalityResult?.detectedBpm ?? null;
        if (!metadata.bpm && detectedBpm) metadata.bpm = detectedBpm;

        const genreResult = await withTimeout(
          detectGenre(mp3Buffer, metadata),
          45000,
          { genre: null, confidence: 0, source: 'timeout', needsManualReview: true }
        );

        const trackKey = `sources/${source.name}-${source.year}/albums/${album.name}/${mp3Name}`;
        const trackUpload = await uploadToWasabi(mp3Buffer, trackKey, 'audio/mpeg');

        const trackCoverArt = embeddedCoverUrl || coverArtUrl;
        // Bug fix: fall back to album.coverArtKey so the track inherits the
        // album/source cover art key and signed URLs can be regenerated later.
        const trackCoverArtKey = embeddedCoverKey || album.coverArtKey || null;

        const track = await Track.create({
          sourceId: source._id,
          datePackId: datePack._id,
          albumId: album._id,
          title: metadata.title,
          artist: metadata.artist,
          genre: genreResult.genre || album.genre || source.name || 'House',
          genreConfidence: genreResult.confidence,
          genreSource: genreResult.source,
          genreNeedsReview: genreResult.needsManualReview,
          bpm: detectedBpm || metadata.bpm || 128,
          tonality,
          pool: source.name,
          category: album.category || 'Premium Pack',
          categoryRaw: album.categoryRaw || null,
          coverArt: trackCoverArt,
          coverArtKey: trackCoverArtKey,
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

        console.log(`   ✓ Track ${processedCount + 1}/${mp3Files.length}: ${metadata.title} (genre: ${track.genre})`);
        totalSize += mp3Buffer.length;
      } catch (trackErr) {
        console.error(`   ❌ Failed to process track "${mp3Name}":`, trackErr.message);
      }

      processedCount++;
      // Update progress after every track (success or failure)
      const progress = Math.round((processedCount / mp3Files.length) * 100);
      album.processingProgress = progress;
      album.processedTracks = processedCount;
      try { await album.save(); } catch (saveErr) {
        console.warn(`   ⚠ Progress save failed at ${progress}%:`, saveErr.message);
      }
    }

    // Update album stats and mark as completed
    album.totalSize = totalSize;
    album.trackCount = await Track.countDocuments({ albumId: album._id });
    album.processingStatus = 'completed';
    album.processingProgress = 100;
    album.processedTracks = processedCount;
    await album.save();

    // Update date card stats
    datePack.totalAlbums = await Album.countDocuments({ datePackId: datePack._id, isActive: true });
    datePack.totalTracks = await Track.countDocuments({ datePackId: datePack._id });
    datePack.totalSize = (datePack.totalSize || 0) + totalSize;
    await datePack.save();

    // Update source stats
    source.totalAlbums = await Album.countDocuments({ sourceId: source._id, isActive: true });
    source.totalTracks = await Track.countDocuments({ sourceId: source._id });
    await source.save();

    console.log(`\n✅ Album "${album.name}" complete: ${processedCount} tracks, ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
  } catch (error) {
    console.error(`\n❌ CRITICAL: Album processing failed for "${album.name}"`);
    console.error(`   Album ID: ${album._id}`);
    console.error(`   Processed: ${processedCount}/${mp3Files.length} tracks`);
    console.error(`   Error:`, error.message);
    console.error(`   Stack:`, error.stack);
    
    // Mark album as failed
    try {
      album.processingStatus = 'failed';
      album.processingError = error.message;
      album.processedTracks = processedCount;
      await album.save();
    } catch (saveErr) {
      console.error(`   Failed to save error status:`, saveErr.message);
    }
  }
}

// @desc    Upload single track (MP3) to an album
// @route   POST /api/albums/:id/tracks
// @access  Private/Admin
export const uploadTrackToAlbum = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) {
      return res.status(404).json({ success: false, message: 'Album not found' });
    }

    const mp3File = req.file;
    if (!mp3File) {
      return res.status(400).json({ success: false, message: 'Please upload an MP3 file' });
    }

    const source = await Source.findById(album.sourceId);
    const datePack = album.datePackId ? await DatePack.findById(album.datePackId) : null;

    let metadata = {
      title: path.parse(mp3File.originalname).name,
      artist: 'Unknown Artist',
      bpm: null,
      duration: 0
    };

    let embeddedCoverUrl = null;
    let embeddedCoverKey = null;

    try {
      const musicMetadata = await parseBuffer(mp3File.buffer, { mimeType: 'audio/mpeg' });
      metadata = {
        title: musicMetadata.common.title || metadata.title,
        artist: musicMetadata.common.artist || metadata.artist,
        bpm: musicMetadata.common.bpm || null,
        duration: musicMetadata.format.duration || 0
      };

      // Extract embedded cover art from ID3 tags
      const pictures = musicMetadata.common.picture;
      if (pictures && pictures.length > 0) {
        const pic = pictures[0];
        const ext = pic.format === 'image/png' ? '.png' : '.jpg';
        const coverKey = `sources/${source?.name || 'unknown'}-${source?.year || '0'}/albums/${album.name}/covers/${path.parse(mp3File.originalname).name}${ext}`;
        try {
          const coverUploadResult = await uploadToWasabi(pic.data, coverKey, pic.format);
          embeddedCoverUrl = coverUploadResult.location;
          embeddedCoverKey = coverUploadResult.key;
          } catch (coverErr) {
          console.warn(`   ⚠ Failed to upload embedded cover:`, coverErr.message);
        }
      }
    } catch (err) {
      console.warn(`⚠ Metadata parsing failed for ${mp3File.originalname}`);
    }

    const tonalityResult = await withTimeout(
      detectTonality(mp3File.buffer, metadata),
      45000,
      { tonality: null, detectedBpm: null }
    );
    const tonality = tonalityResult?.tonality || {
      key: null, scale: null, camelot: null,
      source: 'timeout', confidence: 0, needsManualReview: true
    };
    const detectedBpm = tonalityResult?.detectedBpm ?? null;
    if (!metadata.bpm && detectedBpm) metadata.bpm = detectedBpm;

    const genreResult = await withTimeout(
      detectGenre(mp3File.buffer, metadata),
      45000,
      { genre: null, confidence: 0, source: 'timeout', needsManualReview: true }
    );

    const trackKey = `sources/${source?.name || 'unknown'}-${source?.year || '0'}/albums/${album.name}/${mp3File.originalname}`;
    const trackUpload = await uploadToWasabi(mp3File.buffer, trackKey, 'audio/mpeg');

    const trackCoverArt = embeddedCoverUrl || album.coverArt;
    const trackCoverArtKey = embeddedCoverKey || album.coverArtKey || null;

    const track = await Track.create({
      sourceId: album.sourceId,
      datePackId: album.datePackId,
      albumId: album._id,
      title: metadata.title,
      artist: metadata.artist,
      genre: genreResult.genre || album.genre || 'House',
      genreConfidence: genreResult.confidence,
      genreSource: genreResult.source,
      genreNeedsReview: genreResult.needsManualReview,
      bpm: detectedBpm || metadata.bpm || 128,
      tonality,
      pool: source?.name || '',
      coverArt: trackCoverArt,
      coverArtKey: trackCoverArtKey,
      audioFile: {
        url: trackUpload.location,
        key: trackUpload.key,
        format: 'MP3',
        size: mp3File.buffer.length,
        duration: metadata.duration
      },
      versionType: 'Original Mix',
      uploadedBy: req.user.id,
      status: 'published'
    });

    // Update album stats
    album.trackCount = await Track.countDocuments({ albumId: album._id });
    album.totalSize = (album.totalSize || 0) + mp3File.buffer.length;
    await album.save();

    // Update source/datepack stats
    if (source) {
      source.totalTracks = await Track.countDocuments({ sourceId: source._id });
      await source.save();
    }
    if (datePack) {
      datePack.totalTracks = await Track.countDocuments({ datePackId: datePack._id });
      await datePack.save();
    }

    res.status(201).json({
      success: true,
      message: 'Track uploaded successfully',
      data: track
    });
  } catch (error) {
    console.error('Track upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get tracks for a specific album
// @route   GET /api/albums/:id/tracks
// @access  Private
export const getAlbumTracks = async (req, res) => {
  try {
    const tracks = await Track.find({ albumId: req.params.id })
      .sort({ trackNumber: 1 })
      .select('-fileKey');

    const tracksWithUrls = await resolveSignedUrls(tracks, ['coverArt']);

    res.status(200).json({
      success: true,
      count: tracksWithUrls.length,
      data: tracksWithUrls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update album (name, genre, cover art)
// @route   PUT /api/albums/:id
// @access  Private/Admin
export const updateAlbum = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ success: false, message: 'Album not found' });

    const { name, genre, year, category } = req.body;
    if (name) album.name = name;
    if (genre) album.genre = genre;
    if (year) album.year = parseInt(year);
    if (category) album.category = category;

    if (req.file) {
      const ext = path.extname(req.file.originalname) || '.jpg';
      const coverKey = `albums/${album._id}/cover${ext}`;
      const coverUpload = await uploadToWasabi(req.file.buffer, coverKey, req.file.mimetype);
      album.coverArt = coverUpload.location;
      album.coverArtKey = coverKey;
    }

    await album.save();
    const albumWithUrl = await resolveSignedUrl(album, ['coverArt']);
    res.status(200).json({ success: true, data: albumWithUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all albums
// @route   GET /api/albums
// @access  Public
export const getAlbums = async (req, res) => {
  try {
    const { sourceId, year, search, genre, category, sort, limit = 20, page = 1 } = req.query;

    let query = { isActive: true };

    if (sourceId) query.sourceId = sourceId;
    if (year) query.year = year;
    if (genre) query.genre = { $regex: genre, $options: 'i' };

    // category filter — direct match on album.category field
    if (category && !sourceId) {
      const escaped = category.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const exactRegex = { $regex: `^${escaped}$`, $options: 'i' };
      // Premium Pack (or Pack Premium in Spanish) is the fallback — also include albums with no category set
      if (/^(premium\s*pack|pack\s*premium)$/i.test(category)) {
        query.$or = [
          { category: exactRegex },
          { category: null },
          { category: '' },
          { category: { $exists: false } }
        ];
      } else {
        query.category = exactRegex;
      }
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // sort param: -createdAt | createdAt | name | -trackCount
    const sortMap = {
      '-createdAt':  { createdAt: -1 },
      'createdAt':   { createdAt:  1 },
      'name':        { name: 1 },
      '-trackCount': { trackCount: -1 }
    };
    const sortOrder = sortMap[sort] || { createdAt: -1 };

    const pageNum  = parseInt(page);
    const limitNum = parseInt(limit);

    const [albums, total] = await Promise.all([
      Album.find(query)
        .sort(sortOrder)
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum)
        .populate('sourceId', 'name year platform thumbnail')
        .populate('uploadedBy', 'name'),
      Album.countDocuments(query)
    ]);

    const albumsWithUrls = await resolveSignedUrls(albums, ['coverArt']);

    res.status(200).json({
      success: true,
      count: albumsWithUrls.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: albumsWithUrls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get album processing status
// @route   GET /api/albums/:id/status
// @access  Public
export const getAlbumStatus = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id)
      .select('processingStatus processingProgress processedTracks trackCount processingError name updatedAt');

    if (!album) {
      return res.status(404).json({
        success: false,
        message: 'Album not found'
      });
    }

    // Detect stale processing: if no progress update for >60 minutes, report as failed
    // Only report — don't save, to avoid overwriting active background processing
    let reportedStatus = album.processingStatus;
    let reportedError = album.processingError;
    if (album.processingStatus === 'processing') {
      const minutesSinceUpdate = (Date.now() - new Date(album.updatedAt).getTime()) / 60000;
      if (minutesSinceUpdate > 60) {
        reportedStatus = 'failed';
        reportedError = 'Processing stalled — server may have restarted. Please delete and re-upload.';
      }
    }

    res.status(200).json({
      success: true,
      data: {
        albumId: album._id,
        name: album.name,
        status: reportedStatus,
        progress: album.processingProgress,
        processedTracks: album.processedTracks,
        totalTracks: album.trackCount,
        error: reportedError
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single album with tracks
// @route   GET /api/albums/:id
// @access  Public
export const getAlbum = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id)
      .populate('sourceId', 'name year platform thumbnail')
      .populate('uploadedBy', 'name');

    if (!album) {
      return res.status(404).json({
        success: false,
        message: 'Album not found'
      });
    }

    const albumWithUrl = await resolveSignedUrl(album, ['coverArt']);

    // Get tracks for this album
    const tracks = await Track.find({ albumId: album._id })
      .sort({ title: 1 });

    // Resolve signed URLs for track cover art and audio files
    const tracksWithUrls = await Promise.all(tracks.map(async (track) => {
      const trackObj = track.toObject();
      if (trackObj.coverArt && trackObj.coverArtKey) {
        trackObj.coverArt = await getSignedDownloadUrl(trackObj.coverArtKey, 7200);
      }
      if (trackObj.audioFile?.key) {
        trackObj.audioFile.url = await getSignedDownloadUrl(trackObj.audioFile.key, 7200);
      }
      return trackObj;
    }));

    res.status(200).json({
      success: true,
      data: {
        album: albumWithUrl,
        tracks: tracksWithUrls
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete album
// @route   DELETE /api/albums/:id
// @access  Private/Admin
export const deleteAlbum = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);

    if (!album) {
      return res.status(404).json({
        success: false,
        message: 'Album not found'
      });
    }

    // Soft delete
    album.isActive = false;
    await album.save();

    // Update source statistics
    const source = await Source.findById(album.sourceId);
    if (source) {
      source.totalAlbums = Math.max(0, source.totalAlbums - 1);
      source.totalTracks = Math.max(0, source.totalTracks - album.trackCount);
      await source.save();
    }

    res.status(200).json({
      success: true,
      message: 'Album deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Toggle featured status on an album
// @route   PUT /api/albums/:id/featured
// @access  Private/Admin
export const toggleFeatured = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) {
      return res.status(404).json({ success: false, message: 'Album not found' });
    }

    album.isFeatured = !album.isFeatured;
    await album.save();

    res.status(200).json({
      success: true,
      data: { isFeatured: album.isFeatured },
      message: album.isFeatured ? 'Album marked as featured' : 'Album removed from featured'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all featured albums
// @route   GET /api/albums/featured
// @access  Public
export const getFeaturedAlbums = async (req, res) => {
  try {
    const albums = await Album.find({ isFeatured: true, isActive: true })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate('sourceId', 'name year platform thumbnail');

    const albumsWithUrls = await resolveSignedUrls(albums, ['coverArt']);

    res.status(200).json({
      success: true,
      count: albumsWithUrls.length,
      data: albumsWithUrls
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
