import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { uploadToWasabi, deleteFromWasabi, getSignedDownloadUrl } from '../config/wasabi.js';
import stripe from '../config/stripe.js';
import { sendBlockedAccountEmail } from '../services/emailService.js';

// Shared plan-id variant matcher (covers Stripe planIds, legacy hyphenated
// values, and the admin-set `subscription.plan` field).
const planMatch = (ids) => ({
  'subscription.status': 'active',
  $or: [
    { 'subscription.plan': { $in: ids } },
    { 'subscription.planId': { $in: ids } }
  ]
});
const INDIVIDUAL_PLAN_IDS = ['premium', 'individual-monthly', 'individual_monthly', 'individual-quarterly', 'individual_quarterly'];
const SHARED_PLAN_IDS = ['pro', 'shared-monthly', 'shared_monthly', 'shared-quarterly', 'shared_quarterly'];

// Maps a stat-card "segment" to its Mongo filter. Kept in one place so the
// displayed count (from getAllUsers' stats block) and the filtered table
// (query built from this same function) can never disagree.
function buildSegmentQuery(segment) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  switch (segment) {
    case 'free':
      return { 'subscription.status': { $ne: 'active' } };
    case 'individual':
      return planMatch(INDIVIDUAL_PLAN_IDS);
    case 'shared':
      return planMatch(SHARED_PLAN_IDS);
    case 'flagged':
      return { $or: [{ downloadSuspended: true }, { downloadFlaggedForReview: true }, { isBlocked: true }] };
    case 'new':
      return { createdAt: { $gte: startOfMonth } };
    default:
      return {};
  }
}

// @desc    Get all users with search, pagination, stats
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const {
      search = '',
      role,
      plan,
      status,
      segment,
      sort = '-createdAt',
      page = 1,
      limit = 25
    } = req.query;

    const query = { role: { $ne: 'admin' } };
    const andConditions = [];

    if (search) {
      andConditions.push({ $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]});
    }

    if (role) query.role = role;
    if (plan) {
      const planVariants = [plan, plan.replace(/-/g, '_'), plan.replace(/_/g, '-')];
      andConditions.push({ $or: [
        { 'subscription.planId': { $in: planVariants } },
        { 'subscription.plan': { $in: planVariants } }
      ]});
    }
    if (status) query['subscription.status'] = status;

    // segment=all (or omitted) shows everyone — the Total Members card.
    if (segment && segment !== 'all') {
      Object.assign(query, buildSegmentQuery(segment));
    }

    if (andConditions.length) query.$and = andConditions;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Compute stats by subscription.plan (covers both Stripe and admin-granted plans).
    // Each count uses buildSegmentQuery so the number on a stat card always
    // matches exactly what clicking that card filters the table to.
    const [
      totalUsers,
      activeCount,
      individualMonthlyCount,
      individualQuarterlyCount,
      sharedMonthlyCount,
      sharedQuarterlyCount,
      freeCount,
      flaggedCount,
      newThisMonth,
      activePlans
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ 'subscription.status': 'active', role: { $ne: 'admin' } }),
      User.countDocuments(planMatch(['premium', 'individual-monthly', 'individual_monthly'])),
      User.countDocuments(planMatch(['individual-quarterly', 'individual_quarterly'])),
      User.countDocuments(planMatch(['pro', 'shared-monthly', 'shared_monthly'])),
      User.countDocuments(planMatch(['shared-quarterly', 'shared_quarterly'])),
      User.countDocuments({ role: { $ne: 'admin' }, ...buildSegmentQuery('free') }),
      User.countDocuments({ role: { $ne: 'admin' }, ...buildSegmentQuery('flagged') }),
      User.countDocuments({ role: { $ne: 'admin' }, ...buildSegmentQuery('new') }),
      SubscriptionPlan.find({ isActive: true }).select('planId price duration').lean()
    ]);

    const priceOf = (id) => (activePlans.find(p => p.planId === id)?.price || 0);
    const estimatedRevenue = (
      individualMonthlyCount  * priceOf('individual_monthly') +
      individualQuarterlyCount * (priceOf('individual_quarterly') / 3) +
      sharedMonthlyCount      * priceOf('shared_monthly') +
      sharedQuarterlyCount    * (priceOf('shared_quarterly') / 3)
    ).toFixed(2);

    res.status(200).json({
      success: true,
      data: users,
      stats: {
        totalUsers,
        activeCount,
        individualMonthlyCount,
        individualQuarterlyCount,
        sharedMonthlyCount,
        sharedQuarterlyCount,
        freeCount,
        flaggedCount,
        newThisMonth,
        estimatedRevenue: parseFloat(estimatedRevenue)
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export users (matching the current search/segment filter) as CSV
// @route   GET /api/users/export
// @access  Private/Admin
const EXPORT_ROW_CAP = 10000;
export const exportUsers = async (req, res) => {
  try {
    const { search = '', segment } = req.query;

    const query = { role: { $ne: 'admin' } };
    if (search) {
      query.$and = [{ $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]}];
    }
    if (segment && segment !== 'all') {
      Object.assign(query, buildSegmentQuery(segment));
    }

    const users = await User.find(query)
      .select('-password')
      .sort('-createdAt')
      .limit(EXPORT_ROW_CAP)
      .lean();

    const escapeCsv = (val) => {
      const s = val === null || val === undefined ? '' : String(val);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const planOf = (u) => u.subscription?.planId || u.subscription?.plan || 'free';
    const statusOf = (u) => {
      if (u.isBlocked) return `Blocked (${u.blockReason || 'unspecified'})`;
      if (u.downloadSuspended) return 'Download suspended';
      if (u.isActive === false) return 'Inactive';
      return 'Active';
    };

    const header = ['Name', 'Email', 'Phone', 'Plan', 'Subscription Status', 'Joined', 'Last Login', 'Downloads Total', 'Downloads Today', 'Account Status'];
    const rows = users.map(u => [
      u.name || '',
      u.email || '',
      u.phoneNumber || '',
      planOf(u),
      u.subscription?.status || '',
      u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : '',
      u.lastLogin ? new Date(u.lastLogin).toISOString() : '',
      u.downloads?.total || 0,
      u.downloads?.today || 0,
      statusOf(u)
    ].map(escapeCsv).join(','));

    const csv = [header.join(','), ...rows].join('\r\n');
    const filename = `users-export-${segment || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user role/subscription
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
  try {
    const { role, plan, isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (role) user.role = role;

    if (plan !== undefined) {
      if (plan && plan !== 'free') {
        user.subscription.plan   = plan;
        user.subscription.planId = plan; // keep plan and planId in sync for admin grants
        user.subscription.status = 'active';
        if (!user.subscription.startDate) user.subscription.startDate = new Date();
        // Only null endDate for true admin-grants (no Stripe sub). If Stripe manages this
        // subscription, keep the existing endDate so access doesn't become unlimited.
        if (!user.subscription.stripeSubscriptionId) {
          user.subscription.endDate = null;
        }
        user.subscription.grantedByAdmin = true;
      } else {
        user.subscription.plan   = 'free';
        user.subscription.planId = null; // clear Stripe planId when reverting to free
        user.subscription.status = 'cancelled';
        user.subscription.startDate      = null;
        user.subscription.endDate        = null;
        user.subscription.grantedByAdmin = false;
        user.subscription.stripeSubscriptionId = user.subscription.stripeSubscriptionId || null;
      }
    }

    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        downloads: { total: user.downloads?.total || 0, today: user.downloads?.today || 0 },
        subscription: {
          status: user.subscription?.status,
          plan: user.subscription?.plan,
          planId: user.subscription?.planId,
          endDate: user.subscription?.endDate || null,
          grantedByAdmin: user.subscription?.grantedByAdmin || false
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, message: 'Cannot delete admin users' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all users with device/session details for admin
// @route   GET /api/users/devices
// @access  Private/Admin
export const getDeviceOverview = async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .select('name email role subscription.status subscription.plan subscription.planId subscription.devices subscription.sharedWith subscription.sharedBy subscription.stripeCustomerId subscription.stripeSubscriptionId blockedLoginAttempts lastLogin isActive createdAt downloads')
      .sort('-lastLogin')
      .skip(skip)
      .limit(parseInt(limit))
      .populate('subscription.sharedWith', 'name email')
      .populate('subscription.sharedBy', 'name email')
      .lean();

    const now = new Date();
    const activeThreshold = new Date(now - 15 * 60 * 1000); // 15 min

    const enriched = users.map(u => {
      const devices = u.subscription?.devices || [];
      const activeSessions = devices.filter(d => d.lastActive && new Date(d.lastActive) > activeThreshold).length;
      const uniqueIPs = [...new Set(devices.map(d => d.ipAddress).filter(Boolean))];
      const uniqueCountries = [...new Set(devices.map(d => d.location).filter(Boolean))];
      const blockedAttempts = u.blockedLoginAttempts || [];
      const suspiciousSharing = (
        uniqueIPs.length > 2 ||
        (u.subscription?.sharedWith?.length > 0) ||
        blockedAttempts.length > 0
      );
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        lastLogin: u.lastLogin,
        createdAt: u.createdAt,
        downloads: { total: u.downloads?.total || 0, today: u.downloads?.today || 0 },
        subscription: {
          status: u.subscription?.status,
          plan: u.subscription?.plan,
          planId: u.subscription?.planId,
          sharedWith: u.subscription?.sharedWith || [],
          sharedBy: u.subscription?.sharedBy || null,
          stripeCustomerId: u.subscription?.stripeCustomerId || null,
          stripeSubscriptionId: u.subscription?.stripeSubscriptionId || null
        },
        devices,
        blockedLoginAttempts: blockedAttempts,
        activeSessions,
        uniqueIPs,
        uniqueCountries,
        suspiciousSharing
      };
    });

    res.status(200).json({
      success: true,
      data: enriched,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Revoke a specific device for a user
// @route   DELETE /api/users/:id/devices/:deviceId
// @access  Private/Admin
export const revokeDevice = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Atomic $pull so an admin revoke can't clobber a concurrent device
    // registration by writing back a stale devices array.
    const result = await User.updateOne(
      { _id: req.params.id },
      { $pull: { 'subscription.devices': { deviceId: req.params.deviceId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    res.status(200).json({ success: true, message: 'Device revoked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get users suspected of subscription sharing
// @route   GET /api/users/sharing-suspects
// @access  Private/Admin
export const getSharingSuspects = async (req, res) => {
  try {
    const users = await User.find({
      'subscription.status': 'active',
      $or: [
        { 'subscription.devices.1': { $exists: true } },
        { 'subscription.sharedWith.0': { $exists: true } }
      ]
    })
      .select('name email subscription.plan subscription.devices subscription.sharedWith subscription.sharedBy lastLogin')
      .populate('subscription.sharedWith', 'name email')
      .populate('subscription.sharedBy', 'name email')
      .lean();

    const suspects = users
      .map(u => {
        const devices = u.subscription?.devices || [];
        const uniqueIPs = [...new Set(devices.map(d => d.ipAddress).filter(Boolean))];
        const uniqueLocations = [...new Set(devices.map(d => d.location).filter(Boolean))];
        const riskScore =
          (uniqueIPs.length > 1 ? uniqueIPs.length * 20 : 0) +
          (uniqueLocations.length > 1 ? uniqueLocations.length * 15 : 0) +
          ((u.subscription?.sharedWith?.length || 0) * 30);
        return {
          _id: u._id,
          name: u.name,
          email: u.email,
          plan: u.subscription?.plan,
          devices,
          uniqueIPs,
          uniqueLocations,
          sharedWith: u.subscription?.sharedWith || [],
          sharedBy: u.subscription?.sharedBy || null,
          deviceCount: devices.length,
          riskScore
        };
      })
      .filter(u => u.riskScore > 0)
      .sort((a, b) => b.riskScore - a.riskScore);

    res.status(200).json({ success: true, data: suspects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Sync a user's subscription endDate from Stripe
// @route   POST /api/users/:id/sync-stripe
// @access  Private/Admin
export const syncUserStripeSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Use stored ID or the one manually provided by the admin
    const stripeSubscriptionId = user.subscription?.stripeSubscriptionId || req.body?.stripeSubscriptionId;
    if (!stripeSubscriptionId) {
      return res.status(400).json({ success: false, message: 'No Stripe Subscription ID found. Paste it from the Stripe Dashboard.' });
    }

    const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    // Persist the subscription ID if it wasn't stored yet (e.g. webhook missed on first purchase)
    if (!user.subscription.stripeSubscriptionId) {
      user.subscription.stripeSubscriptionId = stripeSubscriptionId;
    }
    if (stripeSub.customer && !user.subscription.stripeCustomerId) {
      user.subscription.stripeCustomerId = stripeSub.customer;
    }

    const newEndDate = stripeSub.current_period_end
      ? new Date(stripeSub.current_period_end * 1000)
      : null;

    const statusMap = { active: 'active', canceled: 'cancelled', past_due: 'past_due', unpaid: 'past_due', paused: 'inactive', trialing: 'active' };
    const newStatus = statusMap[stripeSub.status] || user.subscription.status;

    if (newEndDate) user.subscription.endDate = newEndDate;
    user.subscription.status = newStatus;
    user.subscription.cancelAtPeriodEnd = stripeSub.cancel_at_period_end || false;
    await user.save();

    console.log(`[Admin] Synced Stripe sub for user ${user._id}: status=${newStatus}, endDate=${newEndDate}`);

    res.status(200).json({
      success: true,
      message: 'Subscription synced from Stripe.',
      data: {
        endDate: user.subscription.endDate,
        status: user.subscription.status,
        cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd
      }
    });
  } catch (error) {
    console.error('[syncUserStripeSubscription] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Bulk sync ALL paid users' subscription data from Stripe
// @route   POST /api/users/bulk-sync-stripe
// @access  Private/Admin
export const bulkSyncStripeSubscriptions = async (req, res) => {
  try {
    // Target users who have a paid plan OR any Stripe ID stored
    const users = await User.find({
      $or: [
        { 'subscription.stripeSubscriptionId': { $exists: true, $ne: null } },
        { 'subscription.stripeCustomerId': { $exists: true, $ne: null } },
        { 'subscription.planId': { $nin: [null, 'free', ''] } }
      ]
    });

    let synced = 0, skipped = 0, failed = 0;
    const results = [];

    const statusMap = {
      active: 'active', canceled: 'cancelled', cancelled: 'cancelled',
      past_due: 'past_due', unpaid: 'past_due', paused: 'inactive', trialing: 'active'
    };

    for (const user of users) {
      try {
        let subId = user.subscription?.stripeSubscriptionId;
        let customerId = user.subscription?.stripeCustomerId;

        // Step 1: if no IDs at all, search Stripe by email
        if (!subId && !customerId) {
          const customers = await stripe.customers.list({ email: user.email, limit: 1 });
          if (customers.data.length) {
            customerId = customers.data[0].id;
            user.subscription.stripeCustomerId = customerId;
          }
        }

        // Step 2: resolve the active subscription
        let stripeSub = null;
        if (subId) {
          try {
            stripeSub = await stripe.subscriptions.retrieve(subId);
          } catch (retrieveErr) {
            // Invalid/deleted/mode-mismatched sub ID — clear it and fall back to email lookup
            console.warn(`[BulkSync] sub ID invalid for ${user.email} (${retrieveErr.message}) — clearing and trying email lookup`);
            user.subscription.stripeSubscriptionId = null;
            subId = null;
          }
        }
        if (!stripeSub && !customerId) {
          const customers = await stripe.customers.list({ email: user.email, limit: 1 });
          if (customers.data.length) {
            customerId = customers.data[0].id;
            user.subscription.stripeCustomerId = customerId;
          }
        }
        if (!stripeSub && customerId) {
          const subs = await stripe.subscriptions.list({ customer: customerId, limit: 5, status: 'all' });
          stripeSub = subs.data.find(s => s.status === 'active') ||
                      subs.data.find(s => s.status === 'trialing') ||
                      subs.data[0] || null;
          if (stripeSub) {
            user.subscription.stripeSubscriptionId = stripeSub.id;
          }
        }

        if (!stripeSub) {
          skipped++;
          results.push({ email: user.email, result: 'no_stripe_subscription_found' });
          continue;
        }

        const newEndDate = stripeSub.current_period_end
          ? new Date(stripeSub.current_period_end * 1000)
          : null;
        const newStatus = statusMap[stripeSub.status] || user.subscription.status;

        if (newEndDate) user.subscription.endDate = newEndDate;
        user.subscription.status = newStatus;
        user.subscription.cancelAtPeriodEnd = stripeSub.cancel_at_period_end || false;
        if (stripeSub.customer && !user.subscription.stripeCustomerId) {
          user.subscription.stripeCustomerId = stripeSub.customer;
        }
        await user.save();

        synced++;
        results.push({ email: user.email, result: 'synced', status: newStatus, endDate: newEndDate });
        console.log(`[BulkSync] ${user.email}: status=${newStatus}, endDate=${newEndDate}`);
      } catch (err) {
        failed++;
        results.push({ email: user.email, result: 'error', error: err.message });
        console.error(`[BulkSync] Failed for ${user.email}:`, err.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk sync complete: ${synced} synced, ${skipped} skipped, ${failed} failed`,
      data: { synced, skipped, failed, total: users.length, results }
    });
  } catch (error) {
    console.error('[bulkSyncStripeSubscriptions] Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload profile photo (avatar)
// @route   PUT /api/users/avatar
// @access  Private (authenticated user)
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file' });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Only JPEG, PNG, WebP, and GIF images are allowed' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete old avatar from S3 if it's a Wasabi key (not a default URL)
    if (user.avatarKey) {
      try {
        await deleteFromWasabi(user.avatarKey);
      } catch (e) {
        console.warn('Failed to delete old avatar:', e.message);
      }
    }

    // Upload new avatar to Wasabi
    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const key = `avatars/${user._id}-${Date.now()}.${ext}`;
    const upload = await uploadToWasabi(req.file.buffer, key, req.file.mimetype);

    user.avatar = upload.location || upload.Location;
    user.avatarKey = key;
    await user.save();

    // Generate signed URL for immediate use
    const signedUrl = await getSignedDownloadUrl(key, 7200);

    res.status(200).json({
      success: true,
      message: 'Profile photo updated',
      data: {
        avatar: signedUrl,
        avatarKey: key
      }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Block a user
// @route   PUT /api/users/:id/block
// @access  Private/Admin
export const blockUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot block admin users' });

    user.isBlocked = true;
    user.blockReason = reason || 'other';
    user.blockedAt = new Date();
    await user.save();

    try { await sendBlockedAccountEmail(user); } catch (e) { console.warn('Block email failed:', e.message); }

    res.status(200).json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unblock a user
// @route   PUT /api/users/:id/unblock
// @access  Private/Admin
export const unblockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isBlocked = false;
    user.blockReason = null;
    user.blockedAt = null;
    await user.save();

    res.status(200).json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Lift download suspension for a user
// @route   PUT /api/users/:id/lift-download-suspension
// @access  Private/Admin
export const liftDownloadSuspension = async (req, res) => {
  try {
    // Atomic $set so the lift can't be clobbered by a concurrent download
    // request, and downloadLiftedAt reliably becomes the fresh-count baseline.
    const result = await User.updateOne(
      { _id: req.params.id },
      {
        $set: {
          downloadSuspended: false,
          downloadSuspendedAt: null,
          downloadWarningLevel: 0,
          downloadPausedUntil: null,
          downloadFlaggedForReview: false,
          downloadLiftedAt: new Date(), // Start counting fresh from this moment
        },
      }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, message: 'Download suspension lifted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
