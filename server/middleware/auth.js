import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { parseDeviceInfo } from '../utils/deviceParser.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header, cookies, or query param (for direct downloads)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user || !req.user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Register/upsert device for ALL authenticated users (fire-and-forget, never blocks)
    const deviceId = req.headers['x-device-id'];
    if (deviceId) {
      setImmediate(async () => {
        try {
          const freshUser = await User.findById(decoded.id).select('subscription role');
          if (!freshUser) return;
          const existing = freshUser.subscription.devices.find(d => d.deviceId === deviceId);
          if (existing) {
            existing.lastActive = new Date();
          } else {
            const info = parseDeviceInfo(req.headers['user-agent'] || '');
            freshUser.subscription.devices.push({
              deviceId,
              deviceName: info.deviceName,
              deviceType: info.deviceType,
              browser: info.browser,
              os: info.os,
              deviceInfo: info.deviceInfo,
              ipAddress: req.ip,
              lastActive: new Date(),
              addedAt: new Date()
            });
          }
          await freshUser.save();
        } catch { /* fire-and-forget — never block the request */ }
      });
    }

    // Per-request device enforcement for active subscribers (paid only, not admin)
    const hasActiveSubscription =
      req.user.role !== 'admin' &&
      req.user.subscription?.status === 'active' &&
      req.user.subscription?.planId;

    if (hasActiveSubscription) {
      const registeredDevices = req.user.subscription?.devices || [];

      // Only enforce if the client sends a device ID AND the user already has registered devices
      // (avoids locking out legacy sessions that predate device tracking)
      if (deviceId && registeredDevices.length > 0) {
        const isRegistered = registeredDevices.some(d => d.deviceId === deviceId);
        if (!isRegistered) {
          return res.status(401).json({
            success: false,
            message: 'This device is not authorized on your account. Please log in again.',
            code: 'DEVICE_NOT_REGISTERED'
          });
        }
      }
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Optional auth - populates req.user if token is present and valid, but never blocks
export const optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch { /* invalid token — proceed as anonymous */ }
  }
  next();
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check subscription plan
export const checkSubscription = (...plans) => {
  return (req, res, next) => {
    if (req.user.role === 'admin') return next();
    const _isWithinPeriod = !!req.user.subscription?.endDate && new Date() <= new Date(req.user.subscription.endDate);
    const _hasAccess = req.user.subscription?.status === 'active' || (req.user.subscription?.status === 'cancelled' && _isWithinPeriod);
    if (!_hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required',
        subscriptionStatus: req.user.subscription?.status
      });
    }
    if (!plans.includes(req.user.subscription.plan)) {
      return res.status(403).json({
        success: false,
        message: 'Upgrade your subscription to access this feature',
        requiredPlan: plans
      });
    }
    next();
  };
};

// Check if subscription is active
export const checkSubscriptionActive = (req, res, next) => {
  if (req.user.role === 'admin') return next();
  const isWithinPeriod = !!req.user.subscription?.endDate && new Date() <= new Date(req.user.subscription.endDate);
  const hasAccess = req.user.subscription?.status === 'active' || (req.user.subscription?.status === 'cancelled' && isWithinPeriod);
  if (!hasAccess) {
    return res.status(403).json({
      success: false,
      message: 'Your subscription is not active. Please renew to continue.',
      subscriptionStatus: req.user.subscription?.status
    });
  }
  next();
};
