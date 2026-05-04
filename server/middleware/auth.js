import jwt from 'jsonwebtoken';
import User from '../models/User.js';

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

    // Per-request device enforcement for active subscribers
    const hasActiveSubscription =
      req.user.subscription?.status === 'active' &&
      req.user.subscription?.planId;

    if (hasActiveSubscription) {
      const deviceId = req.headers['x-device-id'];
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

        // Update lastActive for this device (fire-and-forget, don't block the request)
        const device = registeredDevices.find(d => d.deviceId === deviceId);
        if (device) {
          device.lastActive = new Date();
          req.user.save().catch(() => {});
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
    if (req.user.subscription?.status !== 'active') {
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
  if (req.user.subscription.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Your subscription is not active. Please renew to continue.',
      subscriptionStatus: req.user.subscription.status
    });
  }
  next();
};
