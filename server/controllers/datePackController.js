import DatePack from '../models/DatePack.js';
import Source from '../models/Source.js';
import Album from '../models/Album.js';
import Track from '../models/Track.js';
import Download from '../models/Download.js';
import { uploadToWasabi, deleteFromWasabi } from '../config/wasabi.js';
import { resolveSignedUrls, resolveSignedUrl } from '../utils/signedUrls.js';
import path from 'path';

// @desc    Create date card under a source
// @route   POST /api/date-packs
// @access  Private/Admin
export const createDatePack = async (req, res) => {
  try {
    const { name, sourceId, date, thumbnail } = req.body;
    const thumbnailFile = req.file;

    const source = await Source.findById(sourceId);
    if (!source) {
      return res.status(404).json({
        success: false,
        message: 'Source not found'
      });
    }

    let thumbnailUrl = thumbnail;
    let thumbnailKeyVal = null;

    if (thumbnailFile) {
      const thumbnailKey = `sources/${source.name}-${source.year}/date-cards/${name}/thumbnail${path.extname(thumbnailFile.originalname)}`;
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

    const datePack = await DatePack.create({
      name,
      sourceId,
      date,
      thumbnail: thumbnailUrl,
      thumbnailKey: thumbnailKeyVal || null,
      uploadedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: datePack
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get date cards for a source
// @route   GET /api/date-packs/source/:sourceId
// @access  Public
export const getDatePacksBySource = async (req, res) => {
  try {
    const datePacks = await DatePack.find({
      sourceId: req.params.sourceId,
      isActive: true
    })
      .populate('sourceId', 'name thumbnail')
      .sort('-date')
      .lean();

    // Compute live counts for each date pack
    for (const dp of datePacks) {
      const [albumCount, trackCount] = await Promise.all([
        Album.countDocuments({ datePackId: dp._id }),
        Track.countDocuments({ datePackId: dp._id })
      ]);
      dp.totalAlbums = albumCount;
      dp.totalTracks = trackCount;
    }

    const datePacksWithUrls = await resolveSignedUrls(datePacks, ['thumbnail']);

    res.status(200).json({
      success: true,
      count: datePacksWithUrls.length,
      data: datePacksWithUrls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get date packs for a collection (legacy)
// @route   GET /api/collections/:collectionId/date-packs
// @access  Public
export const getDatePacksByCollection = async (req, res) => {
  try {
    const datePacks = await DatePack.find({ collectionId: req.params.collectionId })
      .populate('sourceId', 'name')
      .sort('date');

    res.status(200).json({
      success: true,
      count: datePacks.length,
      data: datePacks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single date card with albums
// @route   GET /api/date-packs/:id
// @access  Public
export const getDatePack = async (req, res) => {
  try {
    const datePack = await DatePack.findById(req.params.id)
      .populate('sourceId', 'name thumbnail year');

    if (!datePack) {
      return res.status(404).json({
        success: false,
        message: 'Date card not found'
      });
    }

    const datePackWithUrl = await resolveSignedUrl(datePack, ['thumbnail']);

    const albums = await Album.find({ datePackId: datePack._id, isActive: true })
      .sort('-createdAt');

    const albumsWithUrls = await resolveSignedUrls(albums, ['coverArt']);

    res.status(200).json({
      success: true,
      data: {
        datePack: datePackWithUrl,
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

// @desc    Get albums for a date card
// @route   GET /api/date-packs/:id/albums
// @access  Public
export const getAlbumsByDatePack = async (req, res) => {
  try {
    const albums = await Album.find({ datePackId: req.params.id, isActive: true })
      .populate('sourceId', 'name')
      .sort('-createdAt')
      .lean();

    // Compute live download counts per album
    for (const album of albums) {
      album.totalDownloads = await Download.countDocuments({ albumId: album._id });
    }

    const albumsWithUrls = await resolveSignedUrls(albums, ['coverArt']);

    res.status(200).json({
      success: true,
      count: albumsWithUrls.length,
      data: albumsWithUrls
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update date card
// @route   PUT /api/date-packs/:id
// @access  Private/Admin
export const updateDatePack = async (req, res) => {
  try {
    const { name, date, thumbnail } = req.body;
    const thumbnailFile = req.file;

    const datePack = await DatePack.findById(req.params.id);

    if (!datePack) {
      return res.status(404).json({
        success: false,
        message: 'Date card not found'
      });
    }

    if (thumbnailFile) {
      const source = await Source.findById(datePack.sourceId);
      const thumbnailKey = `sources/${source?.name || 'unknown'}-${source?.year || '0'}/date-cards/${datePack.name}/thumbnail${path.extname(thumbnailFile.originalname)}`;
      const upload = await uploadToWasabi(
        thumbnailFile.buffer,
        thumbnailKey,
        thumbnailFile.mimetype
      );
      datePack.thumbnail = upload.location;
      datePack.thumbnailKey = upload.key;
    } else if (thumbnail) {
      datePack.thumbnail = thumbnail;
      datePack.thumbnailKey = null;
    }

    if (name) datePack.name = name;
    if (date) datePack.date = date;

    await datePack.save();

    res.status(200).json({
      success: true,
      data: datePack
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete date card and all related data
// @route   DELETE /api/date-packs/:id
// @access  Private/Admin
export const deleteDatePack = async (req, res) => {
  try {
    const datePack = await DatePack.findById(req.params.id);

    if (!datePack) {
      return res.status(404).json({
        success: false,
        message: 'Date card not found'
      });
    }

    await Track.deleteMany({ datePackId: datePack._id });
    await Album.deleteMany({ datePackId: datePack._id });
    await datePack.deleteOne();

    // Update source stats
    const source = await Source.findById(datePack.sourceId);
    if (source) {
      source.totalAlbums = await Album.countDocuments({ sourceId: source._id, isActive: true });
      source.totalTracks = await Track.countDocuments({ sourceId: source._id });
      await source.save();
    }

    res.status(200).json({
      success: true,
      message: 'Date card and all related data deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
