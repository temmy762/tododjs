import Track from '../models/Track.js';
import Album from '../models/Album.js';
import Collection from '../models/Collection.js';
import DatePack from '../models/DatePack.js';

// @desc    Advanced track search with filters
// @route   GET /api/search/tracks
// @access  Public
export const searchTracks = async (req, res) => {
  try {
    const {
      query,
      genre,
      tonalityKey,
      camelot,
      bpmMin,
      bpmMax,
      pool,
      collectionId,
      datePackId,
      albumId,
      limit = 50,
      page = 1
    } = req.query;

    const filter = { status: 'published' };

    // Text search across title, artist, featuredArtist
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { artist: { $regex: query, $options: 'i' } },
        { featuredArtist: { $regex: query, $options: 'i' } }
      ];
    }

    // Genre filter
    if (genre) {
      filter.genre = { $regex: genre, $options: 'i' };
    }

    // Tonality filters
    if (tonalityKey) {
      filter['tonality.key'] = { $regex: tonalityKey, $options: 'i' };
    }

    if (camelot) {
      filter['tonality.camelot'] = camelot;
    }

    // BPM range filter
    if (bpmMin || bpmMax) {
      filter.bpm = {};
      if (bpmMin) filter.bpm.$gte = parseInt(bpmMin);
      if (bpmMax) filter.bpm.$lte = parseInt(bpmMax);
    }

    // Pool filter
    if (pool) {
      filter.pool = { $regex: pool, $options: 'i' };
    }

    // Hierarchy filters
    if (collectionId) filter.collectionId = collectionId;
    if (datePackId) filter.datePackId = datePackId;
    if (albumId) filter.albumId = albumId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tracks, total] = await Promise.all([
      Track.find(filter)
        .populate('albumId', 'name coverArt')
        .populate('collectionId', 'name platform')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Track.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: tracks,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Search tracks error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get available filter options
// @route   GET /api/search/filters
// @access  Public
export const getFilterOptions = async (req, res) => {
  try {
    const { collectionId, datePackId, albumId } = req.query;
    
    const filter = { status: 'published' };
    if (collectionId) filter.collectionId = collectionId;
    if (datePackId) filter.datePackId = datePackId;
    if (albumId) filter.albumId = albumId;

    const [genres, tonalityKeys, camelotKeys, pools] = await Promise.all([
      Track.distinct('genre', filter),
      Track.distinct('tonality.key', filter),
      Track.distinct('tonality.camelot', filter),
      Track.distinct('pool', filter)
    ]);

    // Get BPM range
    const bpmStats = await Track.aggregate([
      { $match: { ...filter, bpm: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          min: { $min: '$bpm' },
          max: { $max: '$bpm' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        genres: genres.filter(g => g).sort(),
        tonalityKeys: tonalityKeys.filter(k => k).sort(),
        camelotKeys: camelotKeys.filter(c => c).sort(),
        pools: pools.filter(p => p).sort(),
        bpmRange: bpmStats[0] || { min: 80, max: 180 }
      }
    });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Search collections
// @route   GET /api/search/collections
// @access  Public
export const searchCollections = async (req, res) => {
  try {
    const { query, platform, year, limit = 20, page = 1 } = req.query;

    const filter = {};

    if (query) {
      filter.name = { $regex: query, $options: 'i' };
    }

    if (platform) {
      filter.platform = { $regex: platform, $options: 'i' };
    }

    if (year) {
      filter.year = parseInt(year);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [collections, total] = await Promise.all([
      Collection.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Collection.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: collections,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Search collections error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Search albums
// @route   GET /api/search/albums
// @access  Public
export const searchAlbums = async (req, res) => {
  try {
    const { query, genre, year, collectionId, datePackId, limit = 20, page = 1 } = req.query;

    const filter = { isActive: true };

    if (query) {
      filter.name = { $regex: query, $options: 'i' };
    }

    if (genre) {
      filter.genre = { $regex: genre, $options: 'i' };
    }

    if (year) {
      filter.year = parseInt(year);
    }

    if (collectionId) filter.collectionId = collectionId;
    if (datePackId) filter.datePackId = datePackId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [albums, total] = await Promise.all([
      Album.find(filter)
        .populate('collectionId', 'name platform')
        .populate('datePackId', 'name date')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip),
      Album.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: albums,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Search albums error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
