import User from '../models/User.js';
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
    if (plan) query['subscription.plan'] = plan;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);

    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Compute stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalUsers, premiumCount, proCount, newThisMonth] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ 'subscription.plan': 'premium' }),
      User.countDocuments({ 'subscription.plan': 'pro' }),
      User.countDocuments({ createdAt: { $gte: startOfMonth } })
    ]);

    res.status(200).json({
      success: true,
      data: users,
      stats: {
        totalUsers,
        premiumCount,
        proCount,
        newThisMonth
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
    if (plan) user.subscription.plan = plan;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.status(200).json({ success: true, data: user });
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
