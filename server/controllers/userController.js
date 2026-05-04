import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { uploadToWasabi, deleteFromWasabi, getSignedDownloadUrl } from '../config/wasabi.js';

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
      sort = '-createdAt',
      page = 1,
      limit = 25
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) query.role = role;
    if (plan) {
      const planVariants = [plan, plan.replace(/-/g, '_'), plan.replace(/_/g, '-')];
      const planCondition = { $or: [
        { 'subscription.planId': { $in: planVariants } },
        { 'subscription.plan': { $in: planVariants } }
      ]};
      if (query.$or) {
        query.$and = [{ $or: query.$or }, planCondition];
        delete query.$or;
      } else {
        query.$or = planCondition.$or;
      }
    }
    if (status) query['subscription.status'] = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Compute stats by subscription.plan (covers both Stripe and admin-granted plans)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const planMatch = (ids) => ({
      'subscription.status': 'active',
      $or: [
        { 'subscription.plan': { $in: ids } },
        { 'subscription.planId': { $in: ids } }
      ]
    });

    const [
      totalUsers,
      activeCount,
      individualMonthlyCount,
      individualQuarterlyCount,
      sharedMonthlyCount,
      sharedQuarterlyCount,
      freeCount,
      newThisMonth,
      activePlans
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ 'subscription.status': 'active', role: { $ne: 'admin' } }),
      User.countDocuments(planMatch(['premium', 'individual-monthly', 'individual_monthly'])),
      User.countDocuments(planMatch(['individual-quarterly', 'individual_quarterly'])),
      User.countDocuments(planMatch(['pro', 'shared-monthly', 'shared_monthly'])),
      User.countDocuments(planMatch(['shared-quarterly', 'shared_quarterly'])),
      User.countDocuments({ 'subscription.status': { $ne: 'active' }, role: { $ne: 'admin' } }),
      User.countDocuments({ createdAt: { $gte: startOfMonth }, role: { $ne: 'admin' } }),
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
        user.subscription.endDate      = null;
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

    const before = user.subscription.devices.length;
    user.subscription.devices = user.subscription.devices.filter(
      d => d.deviceId !== req.params.deviceId
    );

    if (user.subscription.devices.length === before) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    await user.save();
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
