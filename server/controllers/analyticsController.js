import User from '../models/User.js';
import Track from '../models/Track.js';
import Album from '../models/Album.js';
import Download from '../models/Download.js';
import Source from '../models/Source.js';
import { FIXED_GENRES } from '../services/genreDetection.js';

// @desc    Get genre and tonality analytics
// @route   GET /api/analytics/genres
// @access  Private/Admin
export const getGenreStats = async (req, res) => {
  try {
    // Genre breakdown with track count, avg BPM, BPM range
    const genreStats = await Track.aggregate([
      { $match: { genre: { $ne: null, $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$genre',
          count: { $sum: 1 },
          avgBpm: { $avg: '$bpm' },
          minBpm: { $min: '$bpm' },
          maxBpm: { $max: '$bpm' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Camelot key distribution
    const camelotStats = await Track.aggregate([
      { $match: { 'tonality.camelot': { $nin: [null, ''], $exists: true } } },
      {
        $group: {
          _id: '$tonality.camelot',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Tonality detection source breakdown
    const tonalitySourceStats = await Track.aggregate([
      {
        $group: {
          _id: '$tonality.source',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Genre + Camelot cross-reference (top combos)
    const genreCamelotCross = await Track.aggregate([
      { $match: { 'tonality.camelot': { $nin: [null, ''], $exists: true } } },
      {
        $group: {
          _id: { genre: '$genre', camelot: '$tonality.camelot' },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // Tracks needing manual tonality review
    const needsReviewCount = await Track.countDocuments({ 'tonality.needsManualReview': true });
    const totalTracks = await Track.countDocuments();
    const tracksWithTonality = await Track.countDocuments({ 'tonality.camelot': { $ne: null, $exists: true } });

    // Use the authoritative fixed genre list (genre field has no schema enum)
    const genreEnum = FIXED_GENRES;

    res.status(200).json({
      success: true,
      data: {
        genreStats,
        camelotStats,
        tonalitySourceStats,
        genreCamelotCross,
        summary: {
          totalTracks,
          tracksWithTonality,
          needsReviewCount,
          genreEnum
        }
      }
    });
  } catch (error) {
    console.error('Genre stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get comprehensive analytics data
// @route   GET /api/analytics
// @access  Private/Admin
export const getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // --- User stats ---
    const individualPlanIds = ['premium', 'individual_monthly', 'individual-monthly', 'individual_quarterly', 'individual-quarterly'];
    const sharedPlanIds    = ['pro', 'shared_monthly', 'shared-monthly', 'shared_quarterly', 'shared-quarterly'];

    const [totalUsers, newUsersThisMonth, newUsersLastMonth, individualUsers, sharedUsers] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth }, role: { $ne: 'admin' } }),
      User.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfMonth }, role: { $ne: 'admin' } }),
      User.countDocuments({
        'subscription.status': 'active',
        $or: [
          { 'subscription.planId': { $in: individualPlanIds } },
          { 'subscription.plan':   { $in: individualPlanIds } }
        ]
      }),
      User.countDocuments({
        'subscription.status': 'active',
        $or: [
          { 'subscription.planId': { $in: sharedPlanIds } },
          { 'subscription.plan':   { $in: sharedPlanIds } }
        ]
      })
    ]);

    // --- Track stats ---
    const [totalTracks, tracksThisMonth, tracksLastMonth] = await Promise.all([
      Track.countDocuments(),
      Track.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Track.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } })
    ]);

    // --- Album stats ---
    const [totalAlbums, albumsThisMonth] = await Promise.all([
      Album.countDocuments(),
      Album.countDocuments({ createdAt: { $gte: startOfMonth } })
    ]);

    // --- Download stats ---
    const [totalDownloads, downloadsToday, downloadsThisMonth, downloadsLastMonth] = await Promise.all([
      Download.countDocuments(),
      Download.countDocuments({ createdAt: { $gte: startOfToday } }),
      Download.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Download.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } })
    ]);

    // --- Downloads over last 30 days (daily) ---
    const downloadsOverTime = await Download.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // --- New users over last 30 days (daily) ---
    const usersOverTime = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // --- Tracks by genre ---
    const tracksByGenre = await Track.aggregate([
      { $group: { _id: '$genre', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // --- Top downloaded tracks (last 30 days) ---
    const topTracks = await Download.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, trackId: { $ne: null } } },
      { $group: { _id: '$trackId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'tracks',
          localField: '_id',
          foreignField: '_id',
          as: 'track'
        }
      },
      { $unwind: '$track' },
      {
        $project: {
          count: 1,
          title: '$track.title',
          artist: '$track.artist',
          genre: '$track.genre'
        }
      }
    ]);

    // --- Users by subscription plan (real aggregation) ---
    const planLabelMap = {
      individual_monthly: 'Indiv. Monthly',   'individual-monthly': 'Indiv. Monthly',
      individual_quarterly: 'Indiv. Quarterly', 'individual-quarterly': 'Indiv. Quarterly',
      shared_monthly: 'Shared Monthly',       'shared-monthly': 'Shared Monthly',
      shared_quarterly: 'Shared Quarterly',   'shared-quarterly': 'Shared Quarterly',
      premium: 'Individual', pro: 'Shared'
    };
    const usersByPlanAgg = await User.aggregate([
      { $match: { role: { $ne: 'admin' } } },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ['$subscription.status', 'active'] },
              then: { $ifNull: ['$subscription.planId', { $ifNull: ['$subscription.plan', 'free'] }] },
              else: 'free'
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);
    const planTotals = {};
    usersByPlanAgg.forEach(p => {
      const label = planLabelMap[p._id] || (p._id && p._id !== 'free' ? p._id : 'Free / Inactive');
      planTotals[label] = (planTotals[label] || 0) + p.count;
    });
    const usersByPlan = Object.entries(planTotals)
      .map(([plan, count]) => ({ plan, count }))
      .sort((a, b) => {
        if (a.plan === 'Free / Inactive') return 1;
        if (b.plan === 'Free / Inactive') return -1;
        return b.count - a.count;
      });

    // --- Source stats ---
    const sourceCount = await Source.countDocuments();

    // --- Recent signups (last 7) ---
    const recentSignups = await User.find({ role: { $ne: 'admin' } })
      .select('name email subscription.plan subscription.planId createdAt')
      .sort('-createdAt')
      .limit(7)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalTracks,
          totalAlbums,
          totalDownloads,
          downloadsToday,
          sourceCount,
          individualUsers,
          sharedUsers
        },
        growth: {
          newUsersThisMonth,
          newUsersLastMonth,
          tracksThisMonth,
          tracksLastMonth,
          downloadsThisMonth,
          downloadsLastMonth,
          albumsThisMonth
        },
        charts: {
          downloadsOverTime,
          usersOverTime,
          tracksByGenre,
          usersByPlan
        },
        topTracks,
        recentSignups
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
