import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import { parseDeviceInfo, cleanupInactiveDevices } from '../utils/deviceParser.js';
import { sendEmail, getDeviceBlockedEmailTemplate, getNewDeviceEmailTemplate } from '../services/emailService.js';

// Check if user has active subscription
export const requireSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Please login to access this resource'
      });
    }

    const user = await User.findById(req.user.id);

    // Admin bypasses all subscription restrictions
    if (user.role === 'admin') {
      return next();
    }

    const hasPlan = user.subscription.planId || (user.subscription.plan && user.subscription.plan !== 'free');
    if (!hasPlan || user.subscription.status !== 'active') {
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
    const user = await User.findById(req.user.id);

    // Admin bypasses device limit checks
    if (user.role === 'admin') {
      return next();
    }

    const deviceId = req.headers['x-device-id'] || req.body.deviceId || req.query.deviceId;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID required'
      });
    }

    // Admin-granted subscriptions may not have a Stripe planId — skip device limit
    if (!user.subscription.planId && user.subscription.grantedByAdmin) {
      return next();
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
      console.log(`   ❌ Device limit reached for user ${user.email}. Blocking unrecognized device.`);

      // Notify account owner
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'Unknown Device';
      const { parseDeviceInfo } = await import('../utils/deviceParser.js');
      const deviceInfo = parseDeviceInfo(userAgent);

      try {
        const lang = user.preferredLanguage || 'es';
        const { subject, html, text } = getDeviceBlockedEmailTemplate(user, plan.features.maxDevices, deviceInfo, ipAddress, lang);
        await sendEmail({ to: user.email, subject, html, text });
      } catch (emailError) {
        console.error('Failed to send device block email:', emailError);
      }

      return res.status(403).json({
        success: false,
        deviceLimitReached: true,
        message: `Device limit reached (${plan.features.maxDevices} device${plan.features.maxDevices > 1 ? 's' : ''} allowed). The account owner has been notified. Please ask the account owner to remove a device from their settings.`
      });
    }

    // Parse device information for new device registration
    const userAgent2 = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress2 = req.ip || req.connection.remoteAddress;
    const deviceInfo = parseDeviceInfo(userAgent2);

    // Auto-register device if under limit
    const newDevice = {
      deviceId,
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      deviceInfo: deviceInfo.deviceInfo,
      ipAddress: ipAddress2,
      lastActive: new Date(),
      addedAt: new Date()
    };

    user.subscription.devices.push(newDevice);
    await user.save();

    console.log(`   ✅ New device registered: ${deviceInfo.deviceName}`);

    // Send email notification for new device
    try {
      const lang = user.preferredLanguage || 'es';
      const { subject, html, text } = getNewDeviceEmailTemplate(user, deviceInfo, ipAddress2, lang);
      await sendEmail({ to: user.email, subject, html, text });
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

    const hasPlan = user.subscription.planId || (user.subscription.plan && user.subscription.plan !== 'free');
    if (!hasPlan || user.subscription.status !== 'active') {
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
