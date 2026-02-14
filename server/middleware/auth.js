import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  let token;

  console.log(' Auth middleware - protect');
  
  // Check for token in Authorization header or cookies
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('Token found in Authorization header');
  } else if (req.cookies.token) {
    token = req.cookies.token;
    console.log('Token found in cookies');
  }

  if (!token) {
    console.log(' No token found - unauthorized');
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

    // Validate device token is still active (token matches an activeToken on a registered device)
    const hasActiveSubscription = req.user.subscription?.status === 'active' && req.user.subscription?.plan !== 'free';
    if (hasActiveSubscription && req.user.registeredDevices?.length > 0) {
      const deviceWithToken = req.user.registeredDevices.some(d => d.activeToken === token);
      if (!deviceWithToken) {
        return res.status(401).json({
          success: false,
          message: 'Session expired or device no longer authorized. Please log in again from a registered device.',
          code: 'SESSION_INVALIDATED'
        });
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
