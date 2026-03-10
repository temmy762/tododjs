import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { parseDeviceInfo, cleanupInactiveDevices } from '../utils/deviceParser.js';
import { sendEmail } from '../services/emailService.js';

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

    // Auto-cleanup inactive devices (90+ days)
    const originalDeviceCount = user.subscription.devices.length;
    user.subscription.devices = cleanupInactiveDevices(user.subscription.devices);
    const cleanedUp = originalDeviceCount - user.subscription.devices.length;
    if (cleanedUp > 0) {
      console.log(`   🧹 Cleaned up ${cleanedUp} inactive device(s)`);
    }

    // Check if device is already registered
    const existingDevice = user.subscription.devices.find(d => d.deviceId === deviceId);

    if (existingDevice) {
      // Update last active time
      existingDevice.lastActive = new Date();
      await user.save();
      return next();
    }

    // Check if device limit reached (after cleanup)
    if (user.subscription.devices.length >= plan.features.maxDevices) {
      return res.status(403).json({
        success: false,
        message: `Device limit reached (${plan.features.maxDevices} devices max). Remove a device to continue.`,
        deviceLimitReached: true,
        maxDevices: plan.features.maxDevices,
        currentDevices: user.subscription.devices.map(d => ({
          deviceName: d.deviceName || `${d.browser} on ${d.os}`,
          lastActive: d.lastActive
        }))
      });
    }

    // Parse device information
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress = req.ip || req.connection.remoteAddress;
    const deviceInfo = parseDeviceInfo(userAgent);

    // Auto-register device if under limit
    const newDevice = {
      deviceId,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      deviceInfo: deviceInfo.deviceInfo,
      ipAddress,
      lastActive: new Date(),
      addedAt: new Date()
    };

    user.subscription.devices.push(newDevice);
    await user.save();

    console.log(`   ✅ New device registered: ${deviceInfo.deviceName}`);

    // Send email notification for new device
    try {
      await sendEmail({
        to: user.email,
        subject: 'New Device Added to Your Account',
        html: `
          <h2>New Device Registered</h2>
          <p>Hi ${user.name},</p>
          <p>A new device was added to your TodoDJS account:</p>
          <ul>
            <li><strong>Device:</strong> ${deviceInfo.deviceName}</li>
            <li><strong>Type:</strong> ${deviceInfo.deviceType}</li>
            <li><strong>IP Address:</strong> ${ipAddress}</li>
            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p>If this wasn't you, please sign out all devices immediately from your account settings.</p>
          <p>You can manage your devices at any time from your dashboard.</p>
        `
      });
    } catch (emailError) {
      console.error('Failed to send new device email:', emailError);
      // Don't block the request if email fails
    }

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
