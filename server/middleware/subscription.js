import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';

// Check if user has active subscription
export const requireSubscription = async (req, res, next) => {
  try {
    console.log('   🔒 requireSubscription middleware');
    if (!req.user) {
      console.log('   ❌ No user on request');
      return res.status(401).json({
        success: false,
        message: 'Please login to access this resource'
      });
    }

    const user = await User.findById(req.user.id);
    console.log(`   🔒 User: ${user?.email}, role: ${user?.role}`);

    // Admin bypasses all subscription restrictions
    if (user.role === 'admin') {
      console.log('   ✅ Admin bypass - skipping subscription check');
      return next();
    }

    if (!user.subscription.planId || user.subscription.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required',
        requiresSubscription: true
      });
    }

    // Check if subscription expired
    if (user.subscription.endDate && new Date() > user.subscription.endDate) {
      user.subscription.status = 'expired';
      await user.save();
      
      return res.status(403).json({
        success: false,
        message: 'Subscription expired',
        requiresSubscription: true
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Check device limit for shared plans
export const checkDeviceLimit = async (req, res, next) => {
  try {
    console.log('   🔒 checkDeviceLimit middleware');
    const user = await User.findById(req.user.id);
    console.log(`   🔒 User: ${user?.email}, role: ${user?.role}`);

    // Admin bypasses device limit checks
    if (user.role === 'admin') {
      console.log('   ✅ Admin bypass - skipping device limit check');
      return next();
    }

    const deviceId = req.headers['x-device-id'] || req.body.deviceId;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID required'
      });
    }

    const plan = await SubscriptionPlan.findOne({ planId: user.subscription.planId });

    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription plan'
      });
    }

    // Check if device is already registered
    const existingDevice = user.subscription.devices.find(d => d.deviceId === deviceId);

    if (existingDevice) {
      // Update last active time
      existingDevice.lastActive = new Date();
      await user.save();
      return next();
    }

    // Check if device limit reached
    if (user.subscription.devices.length >= plan.features.maxDevices) {
      return res.status(403).json({
        success: false,
        message: `Device limit reached (${plan.features.maxDevices} devices max). Remove a device to continue.`,
        deviceLimitReached: true,
        maxDevices: plan.features.maxDevices,
        currentDevices: user.subscription.devices
      });
    }

    // Auto-register device if under limit
    const ipAddress = req.ip || req.connection.remoteAddress;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';

    user.subscription.devices.push({
      deviceId,
      deviceInfo,
      ipAddress,
      lastActive: new Date(),
      addedAt: new Date()
    });

    await user.save();
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Optional subscription check (allows access but marks if subscription needed)
export const optionalSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      req.hasSubscription = false;
      return next();
    }

    const user = await User.findById(req.user.id);

    if (!user.subscription.planId || user.subscription.status !== 'active') {
      req.hasSubscription = false;
      return next();
    }

    // Check if subscription expired
    if (user.subscription.endDate && new Date() > user.subscription.endDate) {
      user.subscription.status = 'expired';
      await user.save();
      req.hasSubscription = false;
      return next();
    }

    req.hasSubscription = true;
    req.subscriptionPlan = user.subscription.planId;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
  requireSubscription,
  checkDeviceLimit,
  optionalSubscription
};
