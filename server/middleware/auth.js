import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { parseDeviceInfo } from '../utils/deviceParser.js';
import { registerDevice } from '../utils/deviceRegistry.js';

// How long a removal keeps locking a device out. It only has to outlast the
// old device's live session; signing in again with a password clears it
// sooner (see clearDeviceRevocation), so the user is never permanently stuck
// with a device they later want back.
export const DEVICE_REVOCATION_TTL_MS = 24 * 60 * 60 * 1000;

function isDeviceRevoked(user, deviceId) {
  const entry = (user.revokedDevices || []).find(d => d.deviceId === deviceId);
  if (!entry) return false;
  return Date.now() - new Date(entry.revokedAt).getTime() < DEVICE_REVOCATION_TTL_MS;
}

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

    if (req.user.isBlocked) {
      return res.status(403).json({
        success: false,
        blocked: true,
        blockReason: req.user.blockReason,
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    const deviceId = req.headers['x-device-id'];

    // Enforce revocations from the device-management page. Without this the
    // removal does nothing: the block below re-registers whatever device it
    // sees, so the removed device would re-add itself on its very next request
    // and immediately reclaim the slot the user just freed.
    if (deviceId && isDeviceRevoked(req.user, deviceId)) {
      return res.status(401).json({
        success: false,
        deviceRevoked: true,
        message: 'This device was removed from your account. Please sign in again.'
      });
    }

    // Register/upsert device for ALL authenticated users (fire-and-forget, never blocks).
    // Atomic so concurrent requests from different devices can't clobber each other.
    if (deviceId) {
      const info = parseDeviceInfo(req.headers['user-agent'] || '');
      setImmediate(() => {
        registerDevice(decoded.id, deviceId, { ...info, ipAddress: req.ip })
          .catch(() => { /* fire-and-forget — never block the request */ });
      });
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
