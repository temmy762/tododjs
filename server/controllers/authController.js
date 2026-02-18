import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getSignedDownloadUrl } from '../config/wasabi.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/emailService.js';

// Sign avatar URL if it's stored in Wasabi
const signAvatarUrl = async (user) => {
  if (user.avatarKey) {
    try {
      return await getSignedDownloadUrl(user.avatarKey, 7200);
    } catch (e) {
      console.warn('Failed to sign avatar URL:', e.message);
    }
  }
  return user.avatar;
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Send token response and register/update device
const sendTokenResponse = async (user, statusCode, res, req) => {
  const token = generateToken(user._id);
  const deviceId = req?.body?.deviceId || req?.headers['x-device-id'] || null;
  const deviceInfo = req?.headers['user-agent'] || 'Unknown Device';
  const ipAddress = req?.ip || req?.connection?.remoteAddress || 'unknown';

  const options = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Register or update device
  if (deviceId) {
    const existingDevice = user.registeredDevices.find(d => d.deviceId === deviceId);
    if (existingDevice) {
      existingDevice.activeToken = token;
      existingDevice.lastLoginAt = new Date();
      existingDevice.deviceInfo = deviceInfo;
      existingDevice.ipAddress = ipAddress;
    } else {
      user.registeredDevices.push({
        deviceId,
        deviceInfo,
        ipAddress,
        activeToken: token,
        registeredAt: new Date(),
        lastLoginAt: new Date()
      });
    }
  }

  await user.save();

  const avatar = await signAvatarUrl(user);

  res.status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber || '',
        role: user.role,
        subscription: user.subscription,
        avatar
      }
    });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, preferredLanguage } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Detect language from request or default to 'en'
    const language = preferredLanguage || 
                    (req.headers['accept-language']?.startsWith('es') ? 'es' : 'en');

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phoneNumber: phoneNumber || undefined,
      preferredLanguage: language
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user).catch(err => console.error('Welcome email failed:', err));

    await sendTokenResponse(user, 201, res, req);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Device registration enforcement
    const deviceId = req.body.deviceId || req.headers['x-device-id'] || null;
    const hasActiveSubscription = user.subscription?.status === 'active' && user.subscription?.plan !== 'free';
    const maxDevices = user.maxDevices || 2;

    if (hasActiveSubscription && deviceId) {
      const isRegistered = user.registeredDevices.some(d => d.deviceId === deviceId);

      if (!isRegistered && user.registeredDevices.length >= maxDevices) {
        return res.status(403).json({
          success: false,
          message: `This account is already registered on ${maxDevices} devices. New devices cannot be added. Contact support if you need to reset your devices.`,
          code: 'DEVICE_LIMIT_REACHED',
          registeredDevices: user.registeredDevices.map(d => ({
            deviceInfo: d.deviceInfo,
            registeredAt: d.registeredAt
          }))
        });
      }
    }

    // Update last login
    user.lastLogin = new Date();

    await sendTokenResponse(user, 200, res, req);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const avatar = await signAvatarUrl(user);
    const userData = user.toObject();
    userData.avatar = avatar;

    res.status(200).json({
      success: true,
      data: userData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  // Clear activeToken on the device but keep it registered
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (token && req.user) {
    try {
      const user = await User.findById(req.user.id);
      if (user) {
        const device = user.registeredDevices.find(d => d.activeToken === token);
        if (device) {
          device.activeToken = null;
          await user.save();
        }
      }
    } catch (err) {
      console.log('Failed to clear device session on logout:', err.message);
    }
  }

  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
};

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
export const updateDetails = async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email,
      avatar: req.body.avatar,
      phoneNumber: req.body.phoneNumber
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
export const updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    await sendTokenResponse(user, 200, res, req);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with that email'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire time (1 hour)
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Send email
    try {
      await sendPasswordResetEmail(user, resetToken);

      res.status(200).json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (err) {
      console.error('Error sending password reset email:', err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    await sendTokenResponse(user, 200, res, req);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
