import Stripe from 'stripe';
import User from '../models/User.js';
import { notifyAdminNewPayment, notifyAdminCancelledSubscription, sendPaymentReceiptEmail, sendSubscriptionCancelledEmail, sendPaymentFailedEmail } from '../services/emailService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Subscription plans configuration
const PLANS = {
  premium: {
    name: 'Premium',
    priceMonthly: 999, // $9.99 in cents
    priceYearly: 9999, // $99.99 in cents
    stripePriceIdMonthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID
  },
  pro: {
    name: 'Pro',
    priceMonthly: 1999, // $19.99 in cents
    priceYearly: 19999, // $199.99 in cents
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID
  }
};

// @desc    Create checkout session
// @route   POST /api/payment/create-checkout-session
// @access  Private
export const createCheckoutSession = async (req, res) => {
  try {
    const { plan, billingPeriod } = req.body; // plan: 'premium' or 'pro', billingPeriod: 'monthly' or 'yearly'

    if (!PLANS[plan]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription plan'
      });
    }

    // Get or create Stripe customer
    let stripeCustomerId = req.user.subscription.stripeCustomerId;

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

    // Get the correct price ID
    const priceId = billingPeriod === 'yearly' 
      ? PLANS[plan].stripePriceIdYearly 
      : PLANS[plan].stripePriceIdMonthly;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
      metadata: {
        userId: req.user._id.toString(),
        plan,
        billingPeriod
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

// @desc    Handle Stripe webhook
// @route   POST /api/payment/webhook
// @access  Public (Stripe)
export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Handle successful checkout
async function handleCheckoutSessionCompleted(session) {
  const userId = session.metadata.userId;
  const plan = session.metadata.plan;

  const subscription = await stripe.subscriptions.retrieve(session.subscription);

  const user = await User.findById(userId);
  if (user) {
    user.subscription.plan = plan;
    user.subscription.status = 'active';
    user.subscription.stripeSubscriptionId = subscription.id;
    user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    user.subscription.cancelAtPeriodEnd = false;
    await user.save();

    console.log(`Subscription activated for user ${userId}`);

    // Notify user of payment receipt (non-blocking)
    const amount = subscription.items?.data?.[0]?.price?.unit_amount
      ? (subscription.items.data[0].price.unit_amount / 100).toFixed(2)
      : 'N/A';
    const currency = subscription.currency?.toUpperCase() || 'EUR';
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;
    sendPaymentReceiptEmail(user, plan, amount, currency, periodEnd)
      .catch(err => console.error('User payment receipt email failed:', err));

    // Notify admin of new payment (non-blocking)
    notifyAdminNewPayment(user, plan, amount, currency)
      .catch(err => console.error('Admin payment notification failed:', err));
  }
}

// Handle subscription update
async function handleSubscriptionUpdated(subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userId = customer.metadata.userId;

  await User.findByIdAndUpdate(userId, {
    'subscription.status': subscription.status,
    'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
    'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end
  });

  console.log(`Subscription updated for user ${userId}`);
}

// Handle subscription cancellation
async function handleSubscriptionDeleted(subscription) {
  const customer = await stripe.customers.retrieve(subscription.customer);
  const userId = customer.metadata.userId;

  const user = await User.findById(userId);
  if (user) {
    const oldPlan = user.subscription.plan;
    user.subscription.plan = 'free';
    user.subscription.status = 'cancelled';
    user.subscription.stripeSubscriptionId = null;
    user.subscription.currentPeriodEnd = null;
    user.subscription.cancelAtPeriodEnd = false;
    await user.save();

    console.log(`Subscription cancelled for user ${userId}`);

    // Notify user of cancellation (non-blocking)
    sendSubscriptionCancelledEmail(user, oldPlan, null)
      .catch(err => console.error('User cancellation email failed:', err));

    // Notify admin of cancellation (non-blocking)
    notifyAdminCancelledSubscription(user, oldPlan)
      .catch(err => console.error('Admin cancellation notification failed:', err));
  }
}

// Handle payment failure
async function handlePaymentFailed(invoice) {
  const customer = await stripe.customers.retrieve(invoice.customer);
  const userId = customer.metadata.userId;

  const user = await User.findByIdAndUpdate(userId, {
    'subscription.status': 'past_due'
  }, { new: true });

  console.log(`Payment failed for user ${userId}`);

  // Notify user of payment failure (non-blocking)
  if (user) {
    sendPaymentFailedEmail(user)
      .catch(err => console.error('User payment failed email failed:', err));
  }
}

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

    // Update user
    req.user.subscription.cancelAtPeriodEnd = true;
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
          status: 'active'
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
