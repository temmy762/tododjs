import stripe from '../config/stripe.js';
import User from '../models/User.js';
import { notifyAdminNewPayment, notifyAdminCancelledSubscription, sendPaymentReceiptEmail, sendSubscriptionCancelledEmail, sendPaymentFailedEmail } from '../services/emailService.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';


// @desc    Create checkout session
// @route   POST /api/payment/create-checkout-session
// @access  Private
export const createCheckoutSession = async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }

    const planDoc = await SubscriptionPlan.findOne({ planId, isActive: true });

    if (!planDoc) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    if (!planDoc.stripePriceId) {
      return res.status(400).json({
        success: false,
        message: 'This plan is not configured for online payment. Please contact support.'
      });
    }

    // Get or create Stripe customer
    let stripeCustomerId = req.user.subscription.stripeCustomerId;

    if (stripeCustomerId) {
      // Verify the customer still exists in Stripe (guards against test/live mode switches)
      try {
        await stripe.customers.retrieve(stripeCustomerId);
      } catch (e) {
        if (e.code === 'resource_missing') {
          console.warn(`Stale stripeCustomerId ${stripeCustomerId} cleared for user ${req.user._id}`);
          stripeCustomerId = null;
          req.user.subscription.stripeCustomerId = null;
        } else {
          throw e;
        }
      }
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
        metadata: {
          userId: req.user._id.toString()
        }
      });
      stripeCustomerId = customer.id;

      // Update user with Stripe customer ID
      req.user.subscription.stripeCustomerId = stripeCustomerId;
      await req.user.save();
    }

    // Create recurring subscription checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: planDoc.stripePriceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: {
        userId: req.user._id.toString(),
        planId: planDoc.planId,
        durationDays: planDoc.durationDays.toString()
      }
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel subscription
// @route   POST /api/payment/cancel-subscription
// @access  Private
export const cancelSubscription = async (req, res) => {
  try {
    const { stripeSubscriptionId } = req.user.subscription;

    if (!stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Cancel at period end
    const subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true
    });

    // Update user — sync endDate from Stripe so isWithinPeriod works correctly after cancel
    req.user.subscription.cancelAtPeriodEnd = true;
    if (subscription.current_period_end) {
      req.user.subscription.endDate = new Date(subscription.current_period_end * 1000);
    }
    await req.user.save();

    // Notify user of pending cancellation (non-blocking)
    const accessUntil = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;
    sendSubscriptionCancelledEmail(req.user, req.user.subscription.plan || 'N/A', accessUntil)
      .catch(err => console.error('User cancellation email failed:', err));

    // Notify admin of pending cancellation (non-blocking)
    notifyAdminCancelledSubscription(req.user, req.user.subscription.plan || 'N/A')
      .catch(err => console.error('Admin cancellation notification failed:', err));

    res.status(200).json({
      success: true,
      message: 'Subscription will be cancelled at the end of the billing period',
      currentPeriodEnd: subscription.current_period_end
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reactivate subscription
// @route   POST /api/payment/reactivate-subscription
// @access  Private
export const reactivateSubscription = async (req, res) => {
  try {
    const { stripeSubscriptionId } = req.user.subscription;

    if (!stripeSubscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'No subscription found'
      });
    }

    // Reactivate subscription
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false
    });

    // Update user
    req.user.subscription.cancelAtPeriodEnd = false;
    await req.user.save();

    res.status(200).json({
      success: true,
      message: 'Subscription reactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get subscription details
// @route   GET /api/payment/subscription
// @access  Private
export const getSubscription = async (req, res) => {
  try {
    const { stripeSubscriptionId } = req.user.subscription;

    if (!stripeSubscriptionId) {
      return res.status(200).json({
        success: true,
        data: {
          plan: 'free',
          status: 'inactive'
        }
      });
    }

    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    res.status(200).json({
      success: true,
      data: {
        plan: req.user.subscription.plan,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
