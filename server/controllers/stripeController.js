import stripe from '../config/stripe.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import User from '../models/User.js';
import { notifyAdminNewPayment, notifyAdminCancelledSubscription, sendPaymentReceiptEmail, sendSubscriptionCancelledEmail, sendPaymentFailedEmail } from '../services/emailService.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// @desc    Create Stripe checkout session
// @route   POST /api/stripe/create-checkout-session
// @access  Private
export const createCheckoutSession = async (req, res) => {
  try {
    const { planId } = req.body;
    const user = await User.findById(req.user.id);

    const plan = await SubscriptionPlan.findOne({ planId });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Create or retrieve Stripe customer
    let customerId = user.subscription.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString()
        }
      });
      customerId = customer.id;
      user.subscription.stripeCustomerId = customerId;
      await user.save();
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: {
              name: plan.name,
              description: `${plan.features.unlimitedDownloads ? 'Unlimited Downloads • ' : ''}${plan.features.whatsappSupport ? 'WhatsApp Support • ' : ''}${plan.durationDays} days access`,
              metadata: {
                planId: plan.planId,
                type: plan.type,
                duration: plan.duration
              }
            },
            unit_amount: Math.round(plan.price * 100) // Convert to cents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: `${FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/subscription/cancel`,
      metadata: {
        userId: user._id.toString(),
        planId: plan.planId,
        planName: plan.name,
        durationDays: plan.durationDays.toString()
      }
    });

    res.status(200).json({
      success: true,
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify payment and activate subscription
// @route   POST /api/stripe/verify-payment
// @access  Private
export const verifyPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    const userId = session.metadata.userId;
    const planId = session.metadata.planId;
    const durationDays = parseInt(session.metadata.durationDays);

    const user = await User.findById(userId);
    const plan = await SubscriptionPlan.findOne({ planId });

    if (!user || !plan) {
      return res.status(404).json({
        success: false,
        message: 'User or plan not found'
      });
    }

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    // Update user subscription
    user.subscription.planId = planId;
    user.subscription.status = 'active';
    user.subscription.startDate = startDate;
    user.subscription.endDate = endDate;
    user.subscription.stripePaymentIntentId = session.payment_intent;
    user.subscription.paymentMethod = 'card';
    user.subscription.autoRenew = false; // One-time payments don't auto-renew

    // Add to subscription history
    user.subscriptionHistory.push({
      planId: planId,
      startDate: startDate,
      endDate: endDate,
      amount: plan.price,
      currency: plan.currency,
      status: 'completed',
      stripePaymentIntentId: session.payment_intent
    });

    await user.save();

    // Notify user of payment receipt (non-blocking)
    sendPaymentReceiptEmail(user, plan.name, plan.price, plan.currency, endDate)
      .catch(err => console.error('User payment receipt email failed:', err));

    // Notify admin of new payment (non-blocking)
    notifyAdminNewPayment(user, plan.name, plan.price, plan.currency)
      .catch(err => console.error('Admin payment notification failed:', err));

    res.status(200).json({
      success: true,
      message: 'Subscription activated successfully',
      data: {
        subscription: user.subscription,
        plan: plan
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Handle Stripe webhooks
// @route   POST /api/stripe/webhook
// @access  Public (but verified with Stripe signature)
export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;

      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('PaymentIntent succeeded:', paymentIntent.id);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('Payment failed:', failedPayment.id);
        await handlePaymentFailed(failedPayment);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await handleSubscriptionDeleted(deletedSubscription);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Helper function to handle completed checkout
async function handleCheckoutCompleted(session) {
  const userId = session.metadata.userId;
  const planId = session.metadata.planId;
  const durationDays = parseInt(session.metadata.durationDays);

  const user = await User.findById(userId);
  const plan = await SubscriptionPlan.findOne({ planId });

  if (!user || !plan) {
    console.error('User or plan not found in webhook handler');
    return;
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + durationDays);

  user.subscription.planId = planId;
  user.subscription.status = 'active';
  user.subscription.startDate = startDate;
  user.subscription.endDate = endDate;
  user.subscription.stripePaymentIntentId = session.payment_intent;
  user.subscription.paymentMethod = 'card';

  user.subscriptionHistory.push({
    planId: planId,
    startDate: startDate,
    endDate: endDate,
    amount: plan.price,
    currency: plan.currency,
    status: 'completed',
    stripePaymentIntentId: session.payment_intent
  });

  await user.save();
  console.log(`Subscription activated for user ${userId}`);

  // Notify user of payment receipt (non-blocking)
  sendPaymentReceiptEmail(user, plan.name, plan.price, plan.currency, endDate)
    .catch(err => console.error('User webhook payment receipt email failed:', err));

  // Notify admin of new payment (non-blocking)
  notifyAdminNewPayment(user, plan.name, plan.price, plan.currency)
    .catch(err => console.error('Admin webhook payment notification failed:', err));
}

// Helper function to handle payment failures
async function handlePaymentFailed(paymentIntent) {
  console.log('Payment failed for:', paymentIntent.customer);
  
  if (paymentIntent.customer) {
    try {
      const user = await User.findOne({ 'subscription.stripeCustomerId': paymentIntent.customer });
      if (user) {
        // Notify user of payment failure (non-blocking)
        sendPaymentFailedEmail(user)
          .catch(err => console.error('User payment failed email failed:', err));
      }
    } catch (err) {
      console.error('Error finding user for payment failure notification:', err);
    }
  }
}

// Helper function to handle subscription deletion
async function handleSubscriptionDeleted(subscription) {
  const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
  
  if (user) {
    const planId = user.subscription.planId;
    user.subscription.status = 'cancelled';
    user.subscription.autoRenew = false;
    await user.save();
    console.log(`Subscription cancelled for user ${user._id}`);

    // Notify user of cancellation (non-blocking)
    sendSubscriptionCancelledEmail(user, planId, null)
      .catch(err => console.error('User cancellation email failed:', err));

    // Notify admin of cancellation (non-blocking)
    notifyAdminCancelledSubscription(user, planId)
      .catch(err => console.error('Admin cancellation notification failed:', err));
  }
}

// @desc    Get Stripe publishable key
// @route   GET /api/stripe/config
// @access  Public
export const getStripeConfig = async (req, res) => {
  res.status(200).json({
    success: true,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
  });
};

// @desc    Create payment intent (alternative to checkout session)
// @route   POST /api/stripe/create-payment-intent
// @access  Private
export const createPaymentIntent = async (req, res) => {
  try {
    const { planId } = req.body;
    const user = await User.findById(req.user.id);

    const plan = await SubscriptionPlan.findOne({ planId });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Create or retrieve Stripe customer
    let customerId = user.subscription.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString()
        }
      });
      customerId = customer.id;
      user.subscription.stripeCustomerId = customerId;
      await user.save();
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(plan.price * 100),
      currency: plan.currency.toLowerCase(),
      customer: customerId,
      metadata: {
        userId: user._id.toString(),
        planId: plan.planId,
        planName: plan.name,
        durationDays: plan.durationDays.toString()
      },
      description: `${plan.name} - ${plan.durationDays} days`
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
  createCheckoutSession,
  verifyPayment,
  handleWebhook,
  getStripeConfig,
  createPaymentIntent
};
