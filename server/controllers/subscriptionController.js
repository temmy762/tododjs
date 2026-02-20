import SubscriptionPlan from '../models/SubscriptionPlan.js';
import User from '../models/User.js';

// @desc    Get all subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
export const getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ order: 1 });
    
    res.status(200).json({
      success: true,
      count: plans.length,
      data: plans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single subscription plan
// @route   GET /api/subscriptions/plans/:planId
// @access  Public
export const getPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findOne({ planId: req.params.planId });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's subscription status
// @route   GET /api/subscriptions/status
// @access  Private
export const getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('subscription.sharedWith', 'name email')
      .populate('subscription.sharedBy', 'name email');
    
    if (!user.subscription.planId) {
      return res.status(200).json({
        success: true,
        data: {
          hasSubscription: false,
          status: 'inactive'
        }
      });
    }
    
    const plan = await SubscriptionPlan.findOne({ planId: user.subscription.planId });
    
    // Check if subscription expired
    if (user.subscription.endDate && new Date() > user.subscription.endDate) {
      user.subscription.status = 'expired';
      await user.save();
    }
    
    res.status(200).json({
      success: true,
      data: {
        hasSubscription: true,
        subscription: user.subscription,
        plan: plan,
        daysRemaining: user.subscription.endDate 
          ? Math.ceil((user.subscription.endDate - new Date()) / (1000 * 60 * 60 * 24))
          : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Activate subscription (after payment)
// @route   POST /api/subscriptions/activate
// @access  Private
export const activateSubscription = async (req, res) => {
  try {
    const { planId, paymentIntentId, paymentMethod } = req.body;
    
    const plan = await SubscriptionPlan.findOne({ planId });
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }
    
    const user = await User.findById(req.user.id);
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.durationDays);
    
    // Update subscription
    user.subscription.planId = planId;
    user.subscription.status = 'active';
    user.subscription.startDate = startDate;
    user.subscription.endDate = endDate;
    user.subscription.stripePaymentIntentId = paymentIntentId;
    user.subscription.paymentMethod = paymentMethod;
    user.subscription.autoRenew = plan.duration === 'monthly';
    
    // Add to history
    user.subscriptionHistory.push({
      planId: planId,
      startDate: startDate,
      endDate: endDate,
      amount: plan.price,
      currency: plan.currency,
      status: 'completed',
      stripePaymentIntentId: paymentIntentId
    });
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        subscription: user.subscription,
        plan: plan
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel subscription
// @route   PUT /api/subscriptions/cancel
// @access  Private
export const cancelSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.subscription.planId || user.subscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'No active subscription to cancel'
      });
    }
    
    user.subscription.status = 'cancelled';
    user.subscription.autoRenew = false;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Subscription cancelled. Access will continue until end date.',
      data: {
        subscription: user.subscription
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get user's devices
// @route   GET /api/subscriptions/devices
// @access  Private
export const getDevices = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user.subscription.devices || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Register/update device
// @route   POST /api/subscriptions/devices
// @access  Private
export const registerDevice = async (req, res) => {
  try {
    const { deviceId, deviceInfo } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    const user = await User.findById(req.user.id);
    const plan = await SubscriptionPlan.findOne({ planId: user.subscription.planId });
    
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription plan'
      });
    }
    
    // Check if device already exists
    const existingDeviceIndex = user.subscription.devices.findIndex(
      d => d.deviceId === deviceId
    );
    
    if (existingDeviceIndex !== -1) {
      // Update existing device
      user.subscription.devices[existingDeviceIndex].lastActive = new Date();
      user.subscription.devices[existingDeviceIndex].ipAddress = ipAddress;
    } else {
      // Check device limit
      if (user.subscription.devices.length >= plan.features.maxDevices) {
        return res.status(403).json({
          success: false,
          message: `Device limit reached (${plan.features.maxDevices} devices max). Remove a device to continue.`,
          devices: user.subscription.devices
        });
      }
      
      // Add new device
      user.subscription.devices.push({
        deviceId,
        deviceInfo: deviceInfo || 'Unknown Device',
        ipAddress,
        lastActive: new Date(),
        addedAt: new Date()
      });
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Device registered successfully',
      data: user.subscription.devices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove device
// @route   DELETE /api/subscriptions/devices/:deviceId
// @access  Private
export const removeDevice = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    user.subscription.devices = user.subscription.devices.filter(
      d => d.deviceId !== req.params.deviceId
    );
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Device removed successfully',
      data: user.subscription.devices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Share subscription with another user
// @route   POST /api/subscriptions/share
// @access  Private
export const shareSubscription = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findById(req.user.id);
    const plan = await SubscriptionPlan.findOne({ planId: user.subscription.planId });
    
    if (!plan || plan.type !== 'shared') {
      return res.status(400).json({
        success: false,
        message: 'Only shared plans can be shared with other users'
      });
    }
    
    if (user.subscription.sharedWith.length >= plan.features.maxUsers - 1) {
      return res.status(400).json({
        success: false,
        message: `Maximum users reached (${plan.features.maxUsers} users max)`
      });
    }
    
    const sharedUser = await User.findOne({ email: email.toLowerCase() });
    
    if (!sharedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found with that email'
      });
    }
    
    if (sharedUser._id.toString() === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot share subscription with yourself'
      });
    }
    
    if (user.subscription.sharedWith.includes(sharedUser._id)) {
      return res.status(400).json({
        success: false,
        message: 'Subscription already shared with this user'
      });
    }
    
    // Add to sharedWith array
    user.subscription.sharedWith.push(sharedUser._id);
    await user.save();
    
    // Update shared user's subscription
    sharedUser.subscription.planId = user.subscription.planId;
    sharedUser.subscription.status = 'active';
    sharedUser.subscription.startDate = user.subscription.startDate;
    sharedUser.subscription.endDate = user.subscription.endDate;
    sharedUser.subscription.sharedBy = user._id;
    await sharedUser.save();
    
    res.status(200).json({
      success: true,
      message: 'Subscription shared successfully',
      data: {
        sharedWith: user.subscription.sharedWith
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove shared user
// @route   DELETE /api/subscriptions/share/:userId
// @access  Private
export const removeSharedUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const sharedUserId = req.params.userId;
    
    user.subscription.sharedWith = user.subscription.sharedWith.filter(
      id => id.toString() !== sharedUserId
    );
    await user.save();
    
    // Remove subscription from shared user
    const sharedUser = await User.findById(sharedUserId);
    if (sharedUser) {
      sharedUser.subscription.planId = null;
      sharedUser.subscription.status = 'inactive';
      sharedUser.subscription.sharedBy = null;
      await sharedUser.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Shared user removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check WhatsApp support eligibility
// @route   GET /api/subscriptions/whatsapp-eligibility
// @access  Private
export const checkWhatsAppEligibility = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user.subscription.planId || user.subscription.status !== 'active') {
      return res.status(200).json({
        success: true,
        data: { eligible: false, reason: 'no_active_subscription' }
      });
    }

    // Check if subscription expired
    if (user.subscription.endDate && new Date() > user.subscription.endDate) {
      return res.status(200).json({
        success: true,
        data: { eligible: false, reason: 'subscription_expired' }
      });
    }

    const plan = await SubscriptionPlan.findOne({ planId: user.subscription.planId });

    if (!plan || !plan.features.whatsappSupport) {
      return res.status(200).json({
        success: true,
        data: { eligible: false, reason: 'plan_no_whatsapp' }
      });
    }

    const whatsappNumber = process.env.WHATSAPP_NUMBER || '';

    res.status(200).json({
      success: true,
      data: {
        eligible: true,
        whatsappNumber,
        planName: plan.name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get subscription history
// @route   GET /api/subscriptions/history
// @access  Private
export const getSubscriptionHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      data: user.subscriptionHistory || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
