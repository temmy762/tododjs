import Track from '../models/Track.js';
import User from '../models/User.js';
import Album from '../models/Album.js';
import Download from '../models/Download.js';
import Source from '../models/Source.js';

// @desc    Get admin dashboard overview stats (live)
// @route   GET /api/admin/overview
// @access  Private/Admin
export const getOverview = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date(todayStart);
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const thirtyDaysAgo = new Date(todayStart);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(todayStart);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // ── Stat cards ──
    const [
      totalTracks,
      tracksLast30,
      tracksPrev30,
      totalUsers,
      usersLast30,
      usersPrev30,
      downloadsToday,
      downloadsYesterday,
      activeSubscriptions,
      subsLast30,
      subsPrev30
    ] = await Promise.all([
      Track.countDocuments(),
      Track.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Track.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      Download.countDocuments({ createdAt: { $gte: todayStart } }),
      Download.countDocuments({ createdAt: { $gte: yesterdayStart, $lt: todayStart } }),
      User.countDocuments({ 'subscription.plan': { $in: ['premium', 'pro'] }, 'subscription.status': 'active' }),
      User.countDocuments({ 'subscription.plan': { $in: ['premium', 'pro'] }, 'subscription.status': 'active', createdAt: { $gte: thirtyDaysAgo } }),
      User.countDocuments({ 'subscription.plan': { $in: ['premium', 'pro'] }, 'subscription.status': 'active', createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } })
    ]);

    const pctChange = (current, previous) => {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const change = Math.round(((current - previous) / previous) * 100);
      return change >= 0 ? `+${change}%` : `${change}%`;
    };

    const stats = {
      totalTracks,
      tracksChange: pctChange(tracksLast30, tracksPrev30),
      totalUsers,
      usersChange: pctChange(usersLast30, usersPrev30),
      downloadsToday,
      downloadsChange: pctChange(downloadsToday, downloadsYesterday),
      activeSubscriptions,
      subscriptionsChange: pctChange(subsLast30, subsPrev30)
    };

    // ── Recent activity (last 20 real events) ──
    const [recentDownloads, recentUsers, recentTracks] = await Promise.all([
      Download.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'name')
        .populate('trackId', 'title')
        .populate('albumId', 'name')
        .lean(),
      User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name subscription createdAt')
        .lean(),
      Track.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title artist createdAt')
        .lean()
    ]);

    // Merge and sort all activity by time
    const activity = [];

    for (const dl of recentDownloads) {
      const userName = dl.userId?.name || 'Unknown User';
      const trackName = dl.trackId?.title || dl.albumId?.name || 'a track';
      activity.push({
        type: 'download',
        user: userName,
        action: `downloaded "${trackName}"`,
        time: dl.createdAt
      });
    }

    for (const u of recentUsers) {
      const plan = u.subscription?.plan || 'free';
      const isPaid = plan !== 'free';
      activity.push({
        type: isPaid ? 'upgrade' : 'signup',
        user: u.name,
        action: isPaid ? `subscribed to ${plan.charAt(0).toUpperCase() + plan.slice(1)}` : 'created an account',
        time: u.createdAt
      });
    }

    for (const t of recentTracks) {
      activity.push({
        type: 'upload',
        user: t.artist || 'Admin',
        action: `uploaded "${t.title}"`,
        time: t.createdAt
      });
    }

    // Sort by time descending, take top 10
    activity.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentActivity = activity.slice(0, 10);

    // ── System status ──
    const memUsage = process.memoryUsage();
    const systemStatus = {
      server: 'online',
      memoryUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      memoryTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      uptime: Math.round(process.uptime())
    };

    res.status(200).json({
      success: true,
      data: {
        stats,
        recentActivity,
        systemStatus
      }
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
