import User from '../models/User.js';
import Track from '../models/Track.js';
import Album from '../models/Album.js';
import Download from '../models/Download.js';
import Source from '../models/Source.js';
import os from 'os';

// @desc    Get site settings and system info
// @route   GET /api/settings
// @access  Private/Admin
export const getSettings = async (req, res) => {
  try {
    const [totalTracks, totalAlbums, totalUsers, totalDownloads, totalSources] = await Promise.all([
      Track.countDocuments(),
      Album.countDocuments(),
      User.countDocuments(),
      Download.countDocuments(),
      Source.countDocuments()
    ]);

    // Estimate storage from album totalSize
    const storageAgg = await Album.aggregate([
      { $group: { _id: null, totalBytes: { $sum: '$totalSize' } } }
    ]);
    const totalStorageBytes = storageAgg[0]?.totalBytes || 0;

    res.status(200).json({
      success: true,
      data: {
        server: {
          nodeVersion: process.version,
          platform: os.platform(),
          uptime: Math.floor(process.uptime()),
          memoryUsage: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
          },
          env: process.env.NODE_ENV || 'development'
        },
        config: {
          port: process.env.PORT || 5000,
          frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
          maxFileSize: process.env.MAX_FILE_SIZE ? `${Math.round(parseInt(process.env.MAX_FILE_SIZE) / 1024 / 1024)}MB` : 'N/A',
          jwtExpire: process.env.JWT_EXPIRE || '7d',
          tonalityDetection: process.env.TONALITY_DETECTION_ENABLED === 'true',
          tonalityAiFallback: process.env.TONALITY_AI_FALLBACK === 'true',
          openaiModel: process.env.OPENAI_MODEL || 'N/A',
          wasabiRegion: process.env.WASABI_REGION || 'N/A',
          wasabiBucket: process.env.WASABI_BUCKET_NAME || 'N/A',
          stripeConfigured: !!process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_your_stripe_secret_key',
          emailConfigured: !!process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your_email@gmail.com'
        },
        database: {
          totalTracks,
          totalAlbums,
          totalUsers,
          totalDownloads,
          totalSources,
          totalStorageBytes,
          totalStorageMB: Math.round(totalStorageBytes / 1024 / 1024)
        }
      }
    });
  } catch (error) {
    console.error('Settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get security logs and activity
// @route   GET /api/settings/security
// @access  Private/Admin
export const getSecurityData = async (req, res) => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Recent logins (users who logged in recently)
    const recentLogins = await User.find({ lastLogin: { $gte: sevenDaysAgo } })
      .select('name email role lastLogin subscription.plan')
      .sort('-lastLogin')
      .limit(20)
      .lean();

    // New accounts in last 7 days
    const recentSignups = await User.find({ createdAt: { $gte: sevenDaysAgo } })
      .select('name email role createdAt subscription.plan')
      .sort('-createdAt')
      .limit(20)
      .lean();

    // Admin users
    const adminUsers = await User.find({ role: 'admin' })
      .select('name email lastLogin createdAt isActive')
      .sort('-lastLogin')
      .lean();

    // Inactive users (haven't logged in for 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const inactiveCount = await User.countDocuments({
      $or: [
        { lastLogin: { $lt: thirtyDaysAgo } },
        { lastLogin: null }
      ]
    });

    // Deactivated accounts
    const deactivatedCount = await User.countDocuments({ isActive: false });

    // Active sessions estimate (logged in within 24h)
    const activeSessions = await User.countDocuments({ lastLogin: { $gte: twentyFourHoursAgo } });

    // Downloads in last 24h (potential abuse detection)
    const recentDownloads = await Download.aggregate([
      { $match: { createdAt: { $gte: twentyFourHoursAgo } } },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          count: 1,
          name: '$user.name',
          email: '$user.email',
          plan: '$user.subscription.plan'
        }
      }
    ]);

    // User role distribution
    const roleDistribution = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Unverified emails
    const unverifiedEmails = await User.countDocuments({ isEmailVerified: false });
    const totalUsers = await User.countDocuments();

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeSessions,
          inactiveCount,
          deactivatedCount,
          unverifiedEmails,
          adminCount: adminUsers.length
        },
        adminUsers,
        recentLogins,
        recentSignups,
        recentDownloads,
        roleDistribution
      }
    });
  } catch (error) {
    console.error('Security data error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
