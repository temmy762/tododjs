import Album from '../models/Album.js';
import Source from '../models/Source.js';
import DatePack from '../models/DatePack.js';
import Track from '../models/Track.js';
import { uploadToWasabi, deleteFromWasabi } from '../config/wasabi.js';
import { resolveSignedUrls, resolveSignedUrl } from '../utils/signedUrls.js';
import { extractMetadataFromZip, detectDuplicates } from '../utils/metadataExtractor.js';
import { detectTonality } from '../services/tonalityDetection.js';
import AdmZip from 'adm-zip';
import path from 'path';
import { parseBuffer } from 'music-metadata';

// @desc    Upload album ZIP (single ZIP of MP3s) under a Source + DateCard
// @route   POST /api/albums/upload
// @access  Private/Admin
export const uploadAlbum = async (req, res) => {
  try {
    const { sourceId, datePackId, albumName, albumYear, genre } = req.body;
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
    const album = await Album.create({
      sourceId,
      datePackId,
      name: albumName || path.parse(zipFile.originalname).name,
      genre: genre || null,
      year: albumYear || source.year || new Date().getFullYear(),
      coverArt: coverArtUrl,
      coverArtKey: coverArtKeyVal,
      trackCount: mp3Files.length,
      totalSize: zipFile.size,
      uploadedBy: req.user.id
    });

    // Upload ZIP to Wasabi for bulk download
    const zipKey = `sources/${source.name}-${source.year}/albums/${album.name}/album.zip`;
    const zipUpload = await uploadToWasabi(zipFile.buffer, zipKey, 'application/zip');
    album.zipUrl = zipUpload.location;
    album.zipKey = zipUpload.key;

    // Respond immediately, process tracks in background
    res.status(201).json({
      success: true,
      message: `Album created. Processing ${mp3Files.length} tracks in background.`,
      data: album
    });

    // Background: process tracks
    processAlbumTracksAsync(album, mp3Files, source, datePack, coverArtUrl, req.user.id);
  } catch (error) {
    console.error('Album upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

async function processAlbumTracksAsync(album, mp3Files, source, datePack, coverArtUrl, userId) {
  let totalSize = 0;
  let processedCount = 0;

  try {
    for (const mp3Entry of mp3Files) {
      const mp3Buffer = mp3Entry.getData();
      const mp3Name = path.basename(mp3Entry.entryName);

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
            console.log(`   🖼 Extracted cover art for ${mp3Name}`);
          } catch (coverErr) {
            console.log(`   ⚠ Failed to upload embedded cover for ${mp3Name}:`, coverErr.message);
          }
        }
      } catch (err) {
        console.log(`   ⚠ Metadata parsing failed for ${mp3Name}`);
      }

      // Tonality + BPM detection (ID3 → Essentia.js audio analysis → AI fallback)
      const { tonality, detectedBpm } = await detectTonality(mp3Buffer, metadata);

      const trackKey = `sources/${source.name}-${source.year}/albums/${album.name}/${mp3Name}`;
      const trackUpload = await uploadToWasabi(mp3Buffer, trackKey, 'audio/mpeg');

      const trackCoverArt = embeddedCoverUrl || coverArtUrl;
      const trackCoverArtKey = embeddedCoverKey || null;

      await Track.create({
        sourceId: source._id,
        datePackId: datePack._id,
        albumId: album._id,
        title: metadata.title,
        artist: metadata.artist,
        genre: album.genre || 'House',
        bpm: detectedBpm || metadata.bpm || 128,
        tonality,
        pool: source.name,
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

      totalSize += mp3Buffer.length;
      processedCount++;
      console.log(`   ✓ Track ${processedCount}/${mp3Files.length}: ${metadata.title}`);
    }

    // Update album stats
    album.totalSize = totalSize;
    album.trackCount = processedCount;
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
    console.error(`❌ Album processing error for "${album.name}":`, error);
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
          console.log(`   🖼 Extracted cover art for ${mp3File.originalname}`);
        } catch (coverErr) {
          console.log(`   ⚠ Failed to upload embedded cover:`, coverErr.message);
        }
      }
    } catch (err) {
      console.log(`⚠ Metadata parsing failed for ${mp3File.originalname}`);
    }

    const { tonality, detectedBpm } = await detectTonality(mp3File.buffer, metadata);

    const trackKey = `sources/${source?.name || 'unknown'}-${source?.year || '0'}/albums/${album.name}/${mp3File.originalname}`;
    const trackUpload = await uploadToWasabi(mp3File.buffer, trackKey, 'audio/mpeg');

    const trackCoverArt = embeddedCoverUrl || album.coverArt;
    const trackCoverArtKey = embeddedCoverKey || null;

    const track = await Track.create({
      sourceId: album.sourceId,
      datePackId: album.datePackId,
      albumId: album._id,
      title: metadata.title,
      artist: metadata.artist,
      genre: album.genre || 'House',
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
      .select('-fileKey'); // Don't send file keys to frontend

    res.status(200).json({
      success: true,
      count: tracks.length,
      data: tracks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all albums
// @route   GET /api/albums
// @access  Public
export const getAlbums = async (req, res) => {
  try {
    const { sourceId, year, search, limit = 20, page = 1 } = req.query;
    
    let query = { isActive: true };
    
    if (sourceId) query.sourceId = sourceId;
    if (year) query.year = year;
    if (search) {
      query.$text = { $search: search };
    }

    const albums = await Album.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('sourceId', 'name year platform thumbnail')
      .populate('uploadedBy', 'name');

    const total = await Album.countDocuments(query);
    const albumsWithUrls = await resolveSignedUrls(albums, ['coverArt']);

    res.status(200).json({
      success: true,
      count: albumsWithUrls.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: albumsWithUrls
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

    res.status(200).json({
      success: true,
      data: {
        album: albumWithUrl,
        tracks
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
