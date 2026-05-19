import Download from '../models/Download.js';
import Track from '../models/Track.js';
import Mashup from '../models/Mashup.js';
import Album from '../models/Album.js';
import Source from '../models/Source.js';
import User from '../models/User.js';
import { getSignedDownloadUrl } from '../config/wasabi.js';
import s3Client from '../config/wasabi.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import archiver from 'archiver';

const parseUA = (ua = '') => {
  const s = ua.toLowerCase();
  const browser =
    s.includes('chrome') ? 'Chrome' :
    s.includes('firefox') ? 'Firefox' :
    s.includes('safari') && !s.includes('chrome') ? 'Safari' :
    s.includes('edge') ? 'Edge' :
    s.includes('opera') ? 'Opera' : 'Other';
  const os =
    s.includes('windows') ? 'Windows' :
    s.includes('mac os') ? 'macOS' :
    s.includes('android') ? 'Android' :
    s.includes('iphone') || s.includes('ipad') ? 'iOS' :
    s.includes('linux') ? 'Linux' : 'Other';
  const device =
    s.includes('mobile') || s.includes('android') || s.includes('iphone') ? 'Mobile' :
    s.includes('tablet') || s.includes('ipad') ? 'Tablet' : 'Desktop';
  return { browser, os, device };
};

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
            user.subscription.planId === 'free' ? '5' :
            user.subscription.planId === 'premium' ? '50' : 'unlimited'
          } downloads per day.`,
          upgradeRequired: user.subscription.planId !== 'pro'
        });
      }

      // Check subscription tier requirements
      const tierLevels = { free: 0, premium: 1, pro: 2 };
      const userTier = tierLevels[user.subscription.planId];
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
    const { browser: b1, os: o1, device: d1 } = parseUA(req.get('user-agent'));
    const downloadDoc = {
      userId: user._id,
      trackId: track._id,
      type: 'single',
      fileType: 'MP3',
      fileName: `${track.artist || 'Unknown'} - ${track.title || 'Unknown'}.mp3`,
      email: user.email || '',
      section: req.headers['x-download-section'] || req.query.section || 'library',
      planId: user.subscription?.planId || user.subscription?.plan || 'free',
      deviceBrowser: b1,
      deviceOS: o1,
      deviceName: d1,
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
    const track = await Track.findById(req.params.id) || await Mashup.findById(req.params.id);

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
        const isWithinPeriod = !!user.subscription.endDate && new Date() <= new Date(user.subscription.endDate);
        const hasSubscription = (user.subscription.status === 'active' || (user.subscription.status === 'cancelled' && isWithinPeriod)) && user.subscription.planId;
        return res.status(403).json({
          success: false,
          message: hasSubscription ? 'Daily download limit reached' : 'Active subscription required for downloads',
          upgradeRequired: !hasSubscription
        });
      }
    }

    // Verify audio file key exists BEFORE logging or incrementing counters
    if (!track.audioFile?.key) {
      return res.status(400).json({
        success: false,
        message: 'Track audio file is missing'
      });
    }

    // Log download
    const { browser: b2, os: o2, device: d2 } = parseUA(req.get('user-agent'));
    const downloadDoc = {
      userId: user._id,
      trackId: track._id,
      type: 'single',
      fileType: 'MP3',
      fileName: `${track.artist || 'Unknown'} - ${track.title || 'Unknown'}.mp3`,
      email: user.email || '',
      section: req.headers['x-download-section'] || req.query.section || 'library',
      planId: user.subscription?.planId || user.subscription?.plan || 'free',
      deviceBrowser: b2,
      deviceOS: o2,
      deviceName: d2,
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

    const filename = buildSafeFilename(`${track.artist || 'Unknown Artist'} - ${track.title || 'Unknown Title'}.mp3`);
    const command = new GetObjectCommand({
      Bucket: process.env.WASABI_BUCKET_NAME,
      Key: track.audioFile.key,
      ResponseContentDisposition: `attachment; filename="${filename}"`
    });
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    // If opened directly in browser (token via query param), redirect for native download
    if (req.query.token) {
      return res.redirect(signedUrl);
    }

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

    // Admin bypasses all subscription checks
    if (user.role !== 'admin') {
      const hasPlan = user.subscription?.planId || (user.subscription?.plan && user.subscription.plan !== 'free');
      const isWithinPeriod = !!user.subscription?.endDate && new Date() <= new Date(user.subscription.endDate);
      const hasAccess = user.subscription?.status === 'active' || (user.subscription?.status === 'cancelled' && isWithinPeriod);
      if (!hasPlan || !hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Bulk album downloads require an active subscription',
          upgradeRequired: true
        });
      }
    }

    // Generate signed download URL for ZIP
    const downloadUrl = await getSignedDownloadUrl(album.zipKey, 3600);

    // Log download
    const { browser: b3, os: o3, device: d3 } = parseUA(req.get('user-agent'));
    await Download.create({
      userId: user._id,
      albumId: album._id,
      sourceId: album.sourceId,
      type: 'bulk',
      fileType: 'ZIP',
      fileName: `${album.name || 'Album'}.zip`,
      email: user.email || '',
      section: req.headers['x-download-section'] || req.query.section || 'record-pool',
      planId: user.subscription?.planId || user.subscription?.plan || 'free',
      deviceBrowser: b3,
      deviceOS: o3,
      deviceName: d3,
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
    const album = await Album.findById(req.params.id);

    if (!album) {
      return res.status(404).json({
        success: false,
        message: 'Album not found'
      });
    }
    const user = await User.findById(req.user.id);

    const { browser: b4, os: o4, device: d4 } = parseUA(req.get('user-agent'));
    await Download.create({
      userId: user._id,
      albumId: album._id,
      sourceId: album.sourceId,
      type: 'bulk',
      fileType: 'ZIP',
      fileName: `${album.name || 'Album'}.zip`,
      email: user.email || '',
      section: req.headers['x-download-section'] || req.query.section || 'record-pool',
      planId: user.subscription?.planId || user.subscription?.plan || 'free',
      deviceBrowser: b4,
      deviceOS: o4,
      deviceName: d4,
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
    if (album.zipKey) {
      const zipFilename = buildSafeFilename(`${album.name || 'Album'}.zip`);
      const command = new GetObjectCommand({
        Bucket: process.env.WASABI_BUCKET_NAME,
        Key: album.zipKey,
        ResponseContentDisposition: `attachment; filename="${zipFilename}"`
      });
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      // If opened directly in browser (token via query param), redirect so the browser downloads natively
      if (req.query.token) {
        return res.redirect(signedUrl);
      }
      return res.status(200).json({
        success: true,
        downloadUrl: signedUrl,
        filename: zipFilename
      });
    }

    // No pre-built ZIP — build one on-the-fly from the album's tracks
    const tracks = await Track.find({ albumId: album._id });

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

    // Fetch up to 5 tracks concurrently from Wasabi then append to archive
    const CONCURRENCY = 5;
    for (let i = 0; i < tracks.length; i += CONCURRENCY) {
      const batch = tracks.slice(i, i + CONCURRENCY);
      await Promise.all(batch.map(async (track) => {
        const key = track.audioFile?.wasabiKey || track.audioFile?.key;
        if (!key) return;
        try {
          const cmd = new GetObjectCommand({ Bucket: process.env.WASABI_BUCKET_NAME, Key: key });
          const s3Resp = await s3Client.send(cmd);
          const trackFilename = buildSafeFilename(`${track.artist} - ${track.title}.mp3`);
          archive.append(s3Resp.Body, { name: trackFilename });
        } catch (err) {
          console.error(`Failed to fetch track ${track._id} (${key}):`, err.message);
        }
      }));
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
      .populate('albumId', 'name coverArtKey coverArt');

    // Merge download counts with track data and sign cover art URLs
    const result = await Promise.all(tracks.map(async (track) => {
      const trending = trendingTracks.find(t => t._id.toString() === track._id.toString());
      const trackObj = track.toObject();
      
      // Sign cover art URL
      if (trackObj.coverArtKey) {
        try {
          trackObj.coverArt = await getSignedDownloadUrl(trackObj.coverArtKey, 7200);
        } catch (e) { /* fallback to existing coverArt */ }
      } else if (!trackObj.coverArt && trackObj.albumId?.coverArtKey) {
        try {
          trackObj.coverArt = await getSignedDownloadUrl(trackObj.albumId.coverArtKey, 7200);
        } catch (e) { /* fallback */ }
      }
      
      return {
        ...trackObj,
        trendingDownloads: trending?.downloadCount || 0
      };
    }));

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
      .populate('albumId', 'name coverArtKey coverArt');

    // Sign cover art URLs
    const tracksWithUrls = await Promise.all(recentTracks.map(async (track) => {
      const trackObj = track.toObject();
      if (trackObj.coverArtKey) {
        try {
          trackObj.coverArt = await getSignedDownloadUrl(trackObj.coverArtKey, 7200);
        } catch (e) { /* fallback */ }
      } else if (!trackObj.coverArt && trackObj.albumId?.coverArtKey) {
        try {
          trackObj.coverArt = await getSignedDownloadUrl(trackObj.albumId.coverArtKey, 7200);
        } catch (e) { /* fallback */ }
      }
      return trackObj;
    }));

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
    // Some downloads may not have sourceId (e.g. legacy downloads tied to album/track only)
    const topSources = await Download.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          sourceId: { $ne: null }
        }
      },
      { $group: { _id: '$sourceId', downloads: { $sum: 1 } } },
      { $sort: { downloads: -1 } },
      { $limit: 5 }
    ]);

    const sourcesWithDetails = await Source.find({
      _id: { $in: topSources.map(s => s._id) }
    });

    const topSourcesData = topSources
      .filter(s => s?._id)
      .map(s => {
        const source = sourcesWithDetails.find(src => String(src._id) === String(s._id));
        return {
          source: source?.name,
          platform: source?.platform,
          downloads: s.downloads || 0
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

// @desc    Get paginated download logs (Admin)
// @route   GET /api/downloads/admin/logs
// @access  Private/Admin
export const getAdminDownloadLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', dateFrom, dateTo, fileType, userId: filterUserId } = req.query;
    const query = {};
    if (search) query.$or = [{ email: { $regex: search, $options: 'i' } }, { fileName: { $regex: search, $options: 'i' } }];
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); query.createdAt.$lte = d; }
    }
    if (fileType === 'MP3' || fileType === 'ZIP') query.fileType = fileType;
    if (filterUserId) query.userId = filterUserId;

    const total = await Download.countDocuments(query);
    const logs = await Download.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('userId', 'name email')
      .populate('trackId', 'title artist')
      .populate('albumId', 'name')
      .lean();

    const data = logs.map(d => ({
      _id: d._id,
      userName: d.userId?.name || '—',
      email: d.email || d.userId?.email || '—',
      fileName: d.fileName || (d.trackId ? `${d.trackId.artist} - ${d.trackId.title}` : d.albumId?.name) || '—',
      fileType: d.fileType || (d.type === 'bulk' ? 'ZIP' : 'MP3'),
      section: d.section || '—',
      planId: d.planId || '—',
      ipAddress: d.ipAddress || '—',
      deviceBrowser: d.deviceBrowser || '—',
      deviceOS: d.deviceOS || '—',
      deviceName: d.deviceName || '—',
      fileSize: d.fileSize || 0,
      createdAt: d.createdAt
    }));

    res.status(200).json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export download logs as CSV (Admin)
// @route   GET /api/downloads/admin/export
// @access  Private/Admin
export const exportDownloadLogs = async (req, res) => {
  try {
    const { search = '', dateFrom, dateTo, fileType } = req.query;
    const query = {};
    if (search) query.$or = [{ email: { $regex: search, $options: 'i' } }, { fileName: { $regex: search, $options: 'i' } }];
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59, 999); query.createdAt.$lte = d; }
    }
    if (fileType === 'MP3' || fileType === 'ZIP') query.fileType = fileType;

    const logs = await Download.find(query).sort({ createdAt: -1 }).limit(10000)
      .populate('userId', 'name email').populate('trackId', 'title artist').populate('albumId', 'name').lean();

    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['Date', 'User', 'Email', 'File', 'Type', 'Section', 'Plan', 'IP', 'Browser', 'OS', 'Device', 'Size (bytes)'];
    const rows = logs.map(d => [
      d.createdAt?.toISOString() ?? '',
      d.userId?.name ?? '—',
      d.email || d.userId?.email || '—',
      d.fileName || (d.trackId ? `${d.trackId.artist} - ${d.trackId.title}` : d.albumId?.name) || '—',
      d.fileType || (d.type === 'bulk' ? 'ZIP' : 'MP3'),
      d.section || '—', d.planId || '—', d.ipAddress || '—',
      d.deviceBrowser || '—', d.deviceOS || '—', d.deviceName || '—', d.fileSize ?? 0
    ].map(esc).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="downloads-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Piracy / suspicious activity alerts (Admin)
// @route   GET /api/downloads/admin/alerts
// @access  Private/Admin
export const getDownloadAlerts = async (req, res) => {
  try {
    const now = new Date();
    const h1  = new Date(now - 60 * 60 * 1000);
    const h24 = new Date(now - 24 * 60 * 60 * 1000);
    const d7  = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const alerts = [];

    // >10 ZIPs in 1 hour
    const bulkSpree = await Download.aggregate([
      { $match: { fileType: 'ZIP', createdAt: { $gte: h1 } } },
      { $group: { _id: '$userId', count: { $sum: 1 }, email: { $first: '$email' } } },
      { $match: { count: { $gt: 10 } } }, { $sort: { count: -1 } }
    ]);
    bulkSpree.forEach(u => alerts.push({ type: 'bulk_spree', severity: 'high',
      message: `${u.email || u._id} downloaded ${u.count} ZIPs in the last hour`, userId: u._id, email: u.email, count: u.count }));

    // >3 unique IPs in 24h
    const multiIp = await Download.aggregate([
      { $match: { createdAt: { $gte: h24 } } },
      { $group: { _id: { userId: '$userId', ip: '$ipAddress' } } },
      { $group: { _id: '$_id.userId', uniqueIPs: { $sum: 1 }, email: { $first: '$email' } } },
      { $match: { uniqueIPs: { $gt: 3 } } }, { $sort: { uniqueIPs: -1 } }
    ]);
    multiIp.forEach(u => alerts.push({ type: 'multi_ip', severity: 'high',
      message: `${u.email || u._id} accessed from ${u.uniqueIPs} different IPs in 24h`, userId: u._id, email: u.email, count: u.uniqueIPs }));

    // >20 downloads in first hour after subscription start
    const newSubs = await User.aggregate([
      { $match: { 'subscription.startDate': { $gte: h24 } } },
      { $project: { email: 1, startDate: '$subscription.startDate' } }
    ]);
    await Promise.all(newSubs.map(async (u) => {
      const endWindow = new Date(new Date(u.startDate).getTime() + 60 * 60 * 1000);
      const cnt = await Download.countDocuments({ userId: u._id, createdAt: { $gte: u.startDate, $lte: endWindow } });
      if (cnt > 20) alerts.push({ type: 'new_sub_mass_download', severity: 'medium',
        message: `${u.email} downloaded ${cnt} files in first hour after subscribing`, userId: u._id, email: u.email, count: cnt });
    }));

    // Unusual hours 2–5am (>15 downloads in 7 days)
    const lateNight = await Download.aggregate([
      { $match: { createdAt: { $gte: d7 } } },
      { $addFields: { hour: { $hour: '$createdAt' } } },
      { $match: { hour: { $gte: 2, $lte: 5 } } },
      { $group: { _id: '$userId', count: { $sum: 1 }, email: { $first: '$email' } } },
      { $match: { count: { $gt: 15 } } }, { $sort: { count: -1 } }
    ]);
    lateNight.forEach(u => alerts.push({ type: 'unusual_hours', severity: 'low',
      message: `${u.email || u._id} made ${u.count} downloads between 2–5am in 7 days`, userId: u._id, email: u.email, count: u.count }));

    // >50 downloads in 24h
    const massDownload = await Download.aggregate([
      { $match: { createdAt: { $gte: h24 } } },
      { $group: { _id: '$userId', count: { $sum: 1 }, email: { $first: '$email' } } },
      { $match: { count: { $gt: 50 } } }, { $sort: { count: -1 } }
    ]);
    massDownload.forEach(u => alerts.push({ type: 'mass_download', severity: 'high',
      message: `${u.email || u._id} downloaded ${u.count} files in 24h`, userId: u._id, email: u.email, count: u.count }));

    alerts.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] ?? 3) - ({ high: 0, medium: 1, low: 2 }[b.severity] ?? 3));
    res.status(200).json({ success: true, total: alerts.length, data: alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
