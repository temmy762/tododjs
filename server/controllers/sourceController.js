import Source from '../models/Source.js';
import Album from '../models/Album.js';
import Track from '../models/Track.js';
import DatePack from '../models/DatePack.js';
import Download from '../models/Download.js';
import { uploadToWasabi, deleteFromWasabi } from '../config/wasabi.js';
import { resolveSignedUrls, resolveSignedUrl } from '../utils/signedUrls.js';
import path from 'path';

// @desc    Create new source
// @route   POST /api/sources
// @access  Private/Admin
export const createSource = async (req, res) => {
  try {
    const { name, year, platform, thumbnail } = req.body;
    const thumbnailFile = req.file;

    // Check if source already exists
    const existingSource = await Source.findOne({ name, year });
    if (existingSource) {
      return res.status(400).json({
        success: false,
        message: 'Source with this name and year already exists'
      });
    }

    let thumbnailUrl = thumbnail;
    let thumbnailKeyVal = null;

    // Upload thumbnail file to Wasabi if provided
    if (thumbnailFile) {
      const thumbnailKey = `sources/${name}-${year}/thumbnail${path.extname(thumbnailFile.originalname)}`;
      const upload = await uploadToWasabi(
        thumbnailFile.buffer,
        thumbnailKey,
        thumbnailFile.mimetype
      );
      thumbnailUrl = upload.location;
      thumbnailKeyVal = upload.key;
    }

    if (!thumbnailUrl) {
      return res.status(400).json({
        success: false,
        message: 'Thumbnail is required (upload a file or provide a URL)'
      });
    }

    const source = await Source.create({
      name,
      year,
      platform: platform || '',
      thumbnail: thumbnailUrl,
      thumbnailKey: thumbnailKeyVal || null,
      uploadedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: source
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all sources
// @route   GET /api/sources
// @access  Public
export const getSources = async (req, res) => {
  try {
    const { year, platform, search } = req.query;
    
    let query = { isActive: true };
    
    if (year) query.year = year;
    if (platform) query.platform = platform;
    if (search) {
      query.$text = { $search: search };
    }

    const sources = await Source.find(query)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name email')
      .lean();

    // Compute live counts for each source
    for (const source of sources) {
      const [albumCount, trackCount] = await Promise.all([
        Album.countDocuments({ sourceId: source._id }),
        Track.countDocuments({ sourceId: source._id })
      ]);
      source.totalAlbums = albumCount;
      source.totalTracks = trackCount;

      // Get all albums and tracks belonging to this source
      const albumIds = await Album.find({ sourceId: source._id }).distinct('_id');
      const trackIds = await Track.find({ sourceId: source._id }).distinct('_id');
      
      // Count downloads:
      // 1. Direct sourceId match
      // 2. albumId belongs to this source
      // 3. trackId belongs to this source (even if download.sourceId is null)
      source.totalDownloads = await Download.countDocuments({
        $or: [
          { sourceId: source._id },
          { albumId: { $in: albumIds } },
          { trackId: { $in: trackIds } }
        ]
      });
    }

    const sourcesWithUrls = await resolveSignedUrls(sources, ['thumbnail']);

    res.status(200).json({
      success: true,
      count: sourcesWithUrls.length,
      data: sourcesWithUrls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single source with albums
// @route   GET /api/sources/:id
// @access  Public
export const getSource = async (req, res) => {
  try {
    const source = await Source.findById(req.params.id)
      .populate('uploadedBy', 'name email');

    if (!source) {
      return res.status(404).json({
        success: false,
        message: 'Source not found'
      });
    }

    const sourceWithUrl = await resolveSignedUrl(source, ['thumbnail']);

    // Get albums for this source
    const albums = await Album.find({ sourceId: source._id, isActive: true })
      .sort({ year: -1, createdAt: -1 });

    const albumsWithUrls = await resolveSignedUrls(albums, ['coverArt']);

    res.status(200).json({
      success: true,
      data: {
        source: sourceWithUrl,
        albums: albumsWithUrls
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update source
// @route   PUT /api/sources/:id
// @access  Private/Admin
export const updateSource = async (req, res) => {
  try {
    const { name, year, platform, thumbnail, isActive } = req.body;
    const thumbnailFile = req.file;

    const source = await Source.findById(req.params.id);

    if (!source) {
      return res.status(404).json({
        success: false,
        message: 'Source not found'
      });
    }

    // Upload new thumbnail file if provided
    if (thumbnailFile) {
      const thumbnailKey = `sources/${source.name}-${source.year}/thumbnail${path.extname(thumbnailFile.originalname)}`;
      const upload = await uploadToWasabi(
        thumbnailFile.buffer,
        thumbnailKey,
        thumbnailFile.mimetype
      );
      source.thumbnail = upload.location;
      source.thumbnailKey = upload.key;
    } else if (thumbnail) {
      source.thumbnail = thumbnail;
      source.thumbnailKey = null;
    }

    if (name) source.name = name;
    if (year) source.year = year;
    if (platform !== undefined) source.platform = platform;
    if (typeof isActive !== 'undefined') source.isActive = isActive;

    await source.save();

    res.status(200).json({
      success: true,
      data: source
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete source and all related data
// @route   DELETE /api/sources/:id
// @access  Private/Admin
export const deleteSource = async (req, res) => {
  try {
    const source = await Source.findById(req.params.id);

    if (!source) {
      return res.status(404).json({
        success: false,
        message: 'Source not found'
      });
    }

    // Clean up Wasabi files for all tracks under this source
    const tracks = await Track.find({ sourceId: source._id }).select('audioFile.key coverArtKey');
    for (const track of tracks) {
      if (track.audioFile?.key) {
        try { await deleteFromWasabi(track.audioFile.key); } catch {}
      }
      if (track.coverArtKey) {
        try { await deleteFromWasabi(track.coverArtKey); } catch {}
      }
    }

    // Clean up album ZIPs and cover art
    const albums = await Album.find({ sourceId: source._id }).select('zipKey coverArtKey');
    for (const album of albums) {
      if (album.zipKey) {
        try { await deleteFromWasabi(album.zipKey); } catch {}
      }
      if (album.coverArtKey) {
        try { await deleteFromWasabi(album.coverArtKey); } catch {}
      }
    }

    // Clean up source thumbnail
    if (source.thumbnailKey) {
      try { await deleteFromWasabi(source.thumbnailKey); } catch {}
    }

    // Delete all related date packs, albums, and tracks from DB
    await Track.deleteMany({ sourceId: source._id });
    await Album.deleteMany({ sourceId: source._id });
    await DatePack.deleteMany({ sourceId: source._id });
    await source.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Source and all related data deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get source statistics
// @route   GET /api/sources/:id/stats
// @access  Public
export const getSourceStats = async (req, res) => {
  try {
    const source = await Source.findById(req.params.id);

    if (!source) {
      return res.status(404).json({
        success: false,
        message: 'Source not found'
      });
    }

    const albums = await Album.find({ sourceId: source._id, isActive: true });
    const tracks = await Track.find({ sourceId: source._id });

    const stats = {
      totalAlbums: albums.length,
      totalTracks: tracks.length,
      totalDownloads: source.totalDownloads,
      totalSize: albums.reduce((sum, album) => sum + album.totalSize, 0),
      recentAlbums: albums.slice(0, 5)
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
