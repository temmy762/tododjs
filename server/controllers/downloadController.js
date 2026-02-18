import Download from '../models/Download.js';
import Track from '../models/Track.js';
import Album from '../models/Album.js';
import Source from '../models/Source.js';
import User from '../models/User.js';
import { getSignedDownloadUrl } from '../config/wasabi.js';
import s3Client from '../config/wasabi.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import archiver from 'archiver';

const buildSafeFilename = (name) => {
  return String(name || 'download')
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
};

// @desc    Download single track
// @route   POST /api/downloads/track/:id
// @access  Private
export const downloadTrack = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track not found'
      });
    }

    const user = await User.findById(req.user.id);

    // Admin bypasses all download restrictions
    if (user.role !== 'admin') {
      // Check if user can download
      if (!user.canDownload()) {
        return res.status(403).json({
          success: false,
          message: `Daily download limit reached. Your plan allows ${
            user.subscription.plan === 'free' ? '5' :
            user.subscription.plan === 'premium' ? '50' : 'unlimited'
          } downloads per day.`,
          upgradeRequired: user.subscription.plan !== 'pro'
        });
      }

      // Check subscription tier requirements
      const tierLevels = { free: 0, premium: 1, pro: 2 };
      const userTier = tierLevels[user.subscription.plan];
      const requiredTier = tierLevels[track.requiredPlan || 'free'];

      if (userTier < requiredTier) {
        return res.status(403).json({
          success: false,
          message: `This track requires ${track.requiredPlan} subscription`,
          upgradeRequired: true
        });
      }
    }

    // Generate signed download URL
    const downloadUrl = await getSignedDownloadUrl(track.audioFile.key, 3600); // 1 hour expiry

    // Log download
    const downloadDoc = {
      userId: user._id,
      trackId: track._id,
      type: 'single',
      fileSize: track.audioFile.size,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    };
    if (track.albumId) downloadDoc.albumId = track.albumId;
    if (track.sourceId) downloadDoc.sourceId = track.sourceId;
    await Download.create(downloadDoc);

    // Update counters
    user.incrementDownload();
    await user.save();

    track.downloads += 1;
    await track.save();

    if (track.albumId) {
      const album = await Album.findById(track.albumId);
      if (album) {
        album.totalDownloads += 1;
        await album.save();
      }
    }

    if (track.sourceId) {
      const source = await Source.findById(track.sourceId);
      if (source) {
        source.totalDownloads += 1;
        await source.save();
      }
    }

    res.status(200).json({
      success: true,
      data: {
        downloadUrl,
        track: {
          id: track._id,
          title: track.title,
          artist: track.artist,
          format: track.audioFile.format,
          size: track.audioFile.size
        },
        expiresIn: 3600
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Download single track file (streamed)
// @route   GET /api/downloads/track/:id/file
// @access  Private
export const downloadTrackFile = async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);

    if (!track) {
      return res.status(404).json({
        success: false,
        message: 'Track not found'
      });
    }

    const user = await User.findById(req.user.id);

    // Admin bypasses all download restrictions
    if (user.role !== 'admin') {
      if (!user.canDownload()) {
        return res.status(403).json({
          success: false,
          message: `Daily download limit reached. Your plan allows ${
            user.subscription.plan === 'free' ? '5' :
            user.subscription.plan === 'premium' ? '50' : 'unlimited'
          } downloads per day.`,
          upgradeRequired: user.subscription.plan !== 'pro'
        });
      }

      const tierLevels = { free: 0, premium: 1, pro: 2 };
      const userTier = tierLevels[user.subscription.plan];
      const requiredTier = tierLevels[track.requiredPlan || 'free'];

      if (userTier < requiredTier) {
        return res.status(403).json({
          success: false,
          message: `This track requires ${track.requiredPlan} subscription`,
          upgradeRequired: true
        });
      }
    }

    // Log download
    const downloadDoc = {
      userId: user._id,
      trackId: track._id,
      type: 'single',
      fileSize: track.audioFile?.size || 0,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    };
    if (track.albumId) downloadDoc.albumId = track.albumId;
    if (track.sourceId) downloadDoc.sourceId = track.sourceId;
    await Download.create(downloadDoc);

    // Update counters
    user.incrementDownload();
    await user.save();

    track.downloads += 1;
    await track.save();

    if (track.albumId) {
      const album = await Album.findById(track.albumId);
      if (album) {
        album.totalDownloads += 1;
        await album.save();
      }
    }

    if (track.sourceId) {
      const source = await Source.findById(track.sourceId);
      if (source) {
        source.totalDownloads += 1;
        await source.save();
      }
    }

    if (!track.audioFile?.key) {
      return res.status(400).json({
        success: false,
        message: 'Track audio file is missing'
      });
    }

    const filename = buildSafeFilename(`${track.artist || 'Unknown Artist'} - ${track.title || 'Unknown Title'}.mp3`);
    const command = new GetObjectCommand({
      Bucket: process.env.WASABI_BUCKET_NAME,
      Key: track.audioFile.key,
      ResponseContentDisposition: `attachment; filename="${filename}"`
    });
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return res.status(200).json({
      success: true,
      downloadUrl: signedUrl,
      filename
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Download album (bulk)
// @route   POST /api/downloads/album/:id
// @access  Private
export const downloadAlbum = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);

    if (!album) {
      return res.status(404).json({
        success: false,
        message: 'Album not found'
      });
    }

    const user = await User.findById(req.user.id);

    // Check subscription (bulk downloads require at least premium)
    if (user.subscription.plan === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Bulk album downloads require Premium or Pro subscription',
        upgradeRequired: true
      });
    }

    // Generate signed download URL for ZIP
    const downloadUrl = await getSignedDownloadUrl(album.zipKey, 3600);

    // Log download
    await Download.create({
      userId: user._id,
      albumId: album._id,
      sourceId: album.sourceId,
      type: 'bulk',
      fileSize: album.totalSize,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Update counters
    album.totalDownloads += 1;
    await album.save();

    const source = await Source.findById(album.sourceId);
    if (source) {
      source.totalDownloads += album.trackCount;
      await source.save();
    }

    res.status(200).json({
      success: true,
      data: {
        downloadUrl,
        album: {
          id: album._id,
          name: album.name,
          trackCount: album.trackCount,
          size: album.totalSize
        },
        expiresIn: 3600
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Download album ZIP file (streamed)
// @route   GET /api/downloads/album/:id/file
// @access  Private
export const downloadAlbumFile = async (req, res) => {
  try {
    console.log(`📥 downloadAlbumFile called for album: ${req.params.id}`);
    const album = await Album.findById(req.params.id);

    if (!album) {
      console.log('   ❌ Album not found');
      return res.status(404).json({
        success: false,
        message: 'Album not found'
      });
    }
    console.log(`   ✓ Album found: "${album.name}", zipKey: ${album.zipKey || 'NONE'}`);

    const user = await User.findById(req.user.id);
    console.log(`   ✓ User: ${user.email}, role: ${user.role}`);

    // Check subscription (bulk downloads require at least premium)
    if (user.role !== 'admin' && user.subscription.plan === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Bulk album downloads require Premium or Pro subscription',
        upgradeRequired: true
      });
    }

    await Download.create({
      userId: user._id,
      albumId: album._id,
      sourceId: album.sourceId,
      type: 'bulk',
      fileSize: album.totalSize,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    album.totalDownloads += 1;
    await album.save();

    if (album.sourceId) {
      const source = await Source.findById(album.sourceId);
      if (source) {
        source.totalDownloads += album.trackCount;
        await source.save();
      }
    }

    // If a pre-built ZIP exists on Wasabi, redirect to a signed URL for fast direct download
    console.log(`   📦 Checking for pre-built ZIP...`);
    if (album.zipKey) {
      console.log(`   📦 Generating signed URL for direct download: ${album.zipKey}`);
      const zipFilename = buildSafeFilename(`${album.name || 'Album'}.zip`);
      const command = new GetObjectCommand({
        Bucket: process.env.WASABI_BUCKET_NAME,
        Key: album.zipKey,
        ResponseContentDisposition: `attachment; filename="${zipFilename}"`
      });
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      console.log(`   ✅ Redirecting to signed URL`);
      return res.status(200).json({
        success: true,
        downloadUrl: signedUrl,
        filename: zipFilename
      });
    }

    // No pre-built ZIP — build one on-the-fly from the album's tracks
    console.log(`   🔧 No pre-built ZIP, building on-the-fly...`);
    const tracks = await Track.find({ albumId: album._id });
    console.log(`   📊 Found ${tracks.length} tracks to zip`);

    if (!tracks || tracks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No tracks found for this album'
      });
    }

    const filename = buildSafeFilename(`${album.name || 'Album'}.zip`);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const archive = archiver('zip', { zlib: { level: 5 } });

    archive.on('error', (err) => {
      console.error('Archiver error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'ZIP creation failed' });
      }
    });

    archive.pipe(res);

    for (const track of tracks) {
      const key = track.audioFile?.wasabiKey || track.audioFile?.key;
      if (!key) continue;

      try {
        const cmd = new GetObjectCommand({
          Bucket: process.env.WASABI_BUCKET_NAME,
          Key: key
        });
        const s3Resp = await s3Client.send(cmd);
        const trackFilename = buildSafeFilename(`${track.artist} - ${track.title}.mp3`);
        archive.append(s3Resp.Body, { name: trackFilename });
      } catch (err) {
        console.error(`Failed to fetch track ${track._id} (${key}):`, err.message);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('downloadAlbumFile error:', error.message, error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
};

// @desc    Get download history
// @route   GET /api/downloads/history
// @access  Private
export const getDownloadHistory = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;

    const downloads = await Download.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('trackId', 'title artist coverArt')
      .populate('albumId', 'name coverArt')
      .populate('sourceId', 'name platform');

    const total = await Download.countDocuments({ userId: req.user.id });

    res.status(200).json({
      success: true,
      count: downloads.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: downloads
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get trending downloads (most downloaded tracks)
// @route   GET /api/downloads/trending
// @access  Public
export const getTrendingDownloads = async (req, res) => {
  try {
    const { limit = 10, period = '7d' } = req.query;

    // Calculate date range
    const periodMap = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      'all': 365 * 10
    };
    const days = periodMap[period] || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get most downloaded tracks
    const trendingTracks = await Download.aggregate([
      {
        $match: {
          type: 'single',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$trackId',
          downloadCount: { $sum: 1 }
        }
      },
      {
        $sort: { downloadCount: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    // Populate track details
    const trackIds = trendingTracks.map(t => t._id);
    const tracks = await Track.find({ _id: { $in: trackIds } })
      .populate('sourceId', 'name platform')
      .populate('albumId', 'name');

    // Merge download counts with track data
    const result = tracks.map(track => {
      const trending = trendingTracks.find(t => t._id.toString() === track._id.toString());
      return {
        ...track.toObject(),
        trendingDownloads: trending?.downloadCount || 0
      };
    });

    // Sort by download count
    result.sort((a, b) => b.trendingDownloads - a.trendingDownloads);

    res.status(200).json({
      success: true,
      period,
      count: result.length,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get recent uploads
// @route   GET /api/downloads/recent
// @access  Public
export const getRecentUploads = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const recentTracks = await Track.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('sourceId', 'name platform')
      .populate('albumId', 'name');

    res.status(200).json({
      success: true,
      count: recentTracks.length,
      data: recentTracks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get download statistics (Admin)
// @route   GET /api/downloads/stats
// @access  Private/Admin
export const getDownloadStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;

    const periodMap = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      'all': 365 * 10
    };
    const days = periodMap[period] || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total downloads
    const totalDownloads = await Download.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Downloads by type
    const downloadsByType = await Download.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // Top sources
    const topSources = await Download.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: '$sourceId', downloads: { $sum: 1 } } },
      { $sort: { downloads: -1 } },
      { $limit: 5 }
    ]);

    const sourcesWithDetails = await Source.find({
      _id: { $in: topSources.map(s => s._id) }
    });

    const topSourcesData = topSources.map(s => {
      const source = sourcesWithDetails.find(src => src._id.toString() === s._id.toString());
      return {
        source: source?.name,
        platform: source?.platform,
        downloads: s.downloads
      };
    });

    // Downloads over time
    const downloadsOverTime = await Download.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      period,
      data: {
        totalDownloads,
        downloadsByType,
        topSources: topSourcesData,
        downloadsOverTime
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
