import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import stripe from '../config/stripe.js';
import { parseDeviceInfo } from '../utils/deviceParser.js';
import { registerDevice, pruneInactiveDevices } from '../utils/deviceRegistry.js';
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

    // Admin-granted subscriptions may not have a Stripe planId — allow them through
    if (!user.subscription.planId && user.subscription.grantedByAdmin) {
      return next();
    }

    const hasPlan = user.subscription.planId || (user.subscription.plan && user.subscription.plan !== 'free');

    // Stripe fallback: if cancelled + stripeSubscriptionId still set + endDate missing/stale,
    // look up Stripe once to recover the real current_period_end and persist it.
    // This recovers accounts cancelled with old code that never synced endDate.
    if (
      user.subscription.status === 'cancelled' &&
      user.subscription.stripeSubscriptionId &&
      (!user.subscription.endDate || new Date() > new Date(user.subscription.endDate))
    ) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(user.subscription.stripeSubscriptionId);
        if (stripeSub.current_period_end) {
          user.subscription.endDate = new Date(stripeSub.current_period_end * 1000);
          await user.save();
        }
      } catch (_) { /* Stripe lookup failed — proceed with existing data */ }
    }

    // past_due grace: compute BEFORE the expired block so the expired block can skip it.
    // Stripe retries failed renewals over ~10 days — keep access during that window.
    // Once customer.subscription.deleted fires, status becomes 'cancelled' and grace ends.
    const PAST_DUE_GRACE_MS = 10 * 24 * 60 * 60 * 1000; // 10 days
    const isPastDueInGrace = user.subscription.status === 'past_due' &&
      !!user.subscription.endDate &&
      (Date.now() - new Date(user.subscription.endDate).getTime()) < PAST_DUE_GRACE_MS;

    // Subscription expired — check endDate first before status.
    // Skip for past_due users still within the retry grace window.
    if (!isPastDueInGrace && user.subscription.endDate && new Date() > new Date(user.subscription.endDate)) {
      if (user.subscription.status !== 'expired') {
        user.subscription.status = 'expired';
        await user.save();
      }
      return res.status(403).json({
        success: false,
        message: 'Subscription expired',
        requiresSubscription: true
      });
    }

    // Access logic:
    // - 'active'            → always allowed
    // - 'cancelled'         → allowed while still within paid period (cancel_at_period_end)
    // - 'past_due' in grace → allowed for 10 days after endDate (Stripe retry window)
    // - anything else       → denied
    const isWithinPeriod = !!user.subscription.endDate && new Date() <= new Date(user.subscription.endDate);
    const hasAccess =
      user.subscription.status === 'active' ||
      (user.subscription.status === 'cancelled' && isWithinPeriod) ||
      isPastDueInGrace;

    if (!hasPlan || !hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required',
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

    // Direct download links (?token=) are browser navigations — no custom headers possible
    if (!deviceId) {
      if (req.query.token) return next();
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
      console.warn(`⚠️  checkDeviceLimit: no SubscriptionPlan doc for planId="${user.subscription.planId}" — skipping device limit`);
      return next();
    }

    const maxDevices = plan.features.maxDevices;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'Unknown Device';
    const deviceInfo = parseDeviceInfo(userAgent);

    // Atomically prune inactive devices (90+ days) and register this one.
    // Atomic ops avoid the load-modify-save race that could drop a device that
    // a concurrent request had just added (see utils/deviceRegistry.js).
    await pruneInactiveDevices(user._id);
    const result = await registerDevice(user._id, deviceId, { ...deviceInfo, ipAddress }, { maxDevices });

    if (result === 'limit') {
      console.log(`   ❌ Device limit reached for user ${user.email}. Blocking unrecognized device.`);
      try {
        const lang = user.preferredLanguage || 'es';
        const { subject, html, text } = getDeviceBlockedEmailTemplate(user, maxDevices, deviceInfo, ipAddress, lang);
        await sendEmail({ to: user.email, subject, html, text });
      } catch (emailError) {
        console.error('Failed to send device block email:', emailError);
      }
      return res.status(403).json({
        success: false,
        deviceLimitReached: true,
        message: `Device limit reached (${maxDevices} device${maxDevices > 1 ? 's' : ''} allowed). The account owner has been notified. Please ask the account owner to remove a device from their settings.`
      });
    }

    if (result === 'added') {
      console.log(`   ✅ New device registered: ${deviceInfo.deviceName}`);
      // Send email notification for new device (non-blocking)
      try {
        const lang = user.preferredLanguage || 'es';
        const { subject, html, text } = getNewDeviceEmailTemplate(user, deviceInfo, ipAddress, lang);
        await sendEmail({ to: user.email, subject, html, text });
      } catch (emailError) {
        console.error('Failed to send new device email:', emailError);
        // Don't block the request if email fails
      }
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
