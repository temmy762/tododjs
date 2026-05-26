import stripe from '../config/stripe.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';
import User from '../models/User.js';
import { notifyAdminNewPayment, notifyAdminCancelledSubscription, sendPaymentReceiptEmail, sendSubscriptionCancelledEmail, sendPaymentFailedEmail } from '../services/emailService.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// @desc    Verify payment and activate subscription
// @route   POST /api/stripe/verify-payment
// @access  Private
export const verifyPayment = async (req, res) => {
  try {
    const { sessionId } = req.body;

    // Retrieve the session from Stripe — webhook is the sole source of truth for activation
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Validate the session belongs to the requesting user
    const sessionUserId = session.metadata?.userId;
    if (sessionUserId && sessionUserId !== req.user.id.toString()) {
      console.warn(`[SECURITY] verifyPayment session mismatch: sessionUser=${sessionUserId}, reqUser=${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'Session does not belong to this user'
      });
    }

    // Accept 'paid' and 'no_payment_required' (free trials / 100% coupons)
    const validStatuses = ['paid', 'no_payment_required'];
    if (!validStatuses.includes(session.payment_status)) {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

    // Payment confirmed — no DB writes here; webhook handles full activation
    res.status(200).json({
      success: true,
      message: 'Payment confirmed. Subscription will be activated shortly.'
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
        console.warn('Payment failed:', failedPayment.id);
        await handlePaymentFailed(failedPayment);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      case 'charge.refunded':
        const refundedCharge = event.data.object;
        await handleChargeRefunded(refundedCharge);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        await handleSubscriptionDeleted(deletedSubscription);
        break;

      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        await handleSubscriptionUpdated(updatedSubscription);
        break;

      default:
        console.warn(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

// Helper function to handle completed checkout
async function handleCheckoutCompleted(session) {
  const planId = session.metadata.planId;
  const durationDays = parseInt(session.metadata.durationDays);
  const customerEmail = session.customer_details?.email || session.customer_email;
  
  const plan = await SubscriptionPlan.findOne({ planId });

  if (!plan) {
    console.error('Plan not found in webhook handler');
    return;
  }

  // Check if user exists (for existing users upgrading) or create new user (for new subscriptions)
  let user = session.metadata.userId ? await User.findById(session.metadata.userId) : null;
  
  if (!user && customerEmail) {
    // New user - create account via subscription payment
    user = await User.findOne({ email: customerEmail });
    
    if (!user) {
      // Create new user account
      const crypto = await import('crypto');
      const tempPassword = crypto.randomBytes(32).toString('hex');
      
      user = await User.create({
        name: session.customer_details?.name || customerEmail.split('@')[0],
        email: customerEmail,
        password: tempPassword, // Temporary password, user will reset via email
        phoneNumber: session.customer_details?.phone || undefined,
        preferredLanguage: 'en',
        isEmailVerified: true // Email confirmed via Stripe payment flow
      });
      
      console.log(`New user account created via subscription: ${customerEmail}`);
    }
  }

  if (!user) {
    console.error('Could not find or create user in webhook handler');
    return;
  }

  const startDate = new Date();
  let endDate = null;
  let stripeSubscriptionId = null;

  // For subscription mode, get endDate from Stripe subscription's current_period_end
  if (session.subscription) {
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription, {
        expand: ['default_payment_method', 'latest_invoice.payment_intent']
      });
      endDate = stripeSubscription.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000)
        : null;
      stripeSubscriptionId = stripeSubscription.id;

      // Auto-save the payment method used at checkout as the customer default
      // so it immediately appears in the PAGOS / payment methods section.
      // Primary: subscription's default_payment_method
      // Fallback: latest_invoice.payment_intent.payment_method
      const pmId =
        (typeof stripeSubscription.default_payment_method === 'object'
          ? stripeSubscription.default_payment_method?.id
          : stripeSubscription.default_payment_method) ||
        stripeSubscription.latest_invoice?.payment_intent?.payment_method ||
        null;
      if (pmId && session.customer) {
        stripe.customers.update(session.customer, {
          invoice_settings: { default_payment_method: pmId }
        }).catch(e => console.warn('Auto-save PM after checkout failed:', e.message));
      }
    } catch (e) {
      console.error('Failed to retrieve Stripe subscription:', e.message);
    }
  }

  // Fallback: calculate from durationDays metadata (legacy one-time mode)
  if (!endDate && !isNaN(durationDays)) {
    endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);
  }

  // Safety: null endDate would be treated as no-expiry — default to 30 days
  if (!endDate) {
    console.error('[webhook] Could not determine endDate — defaulting to 30 days to prevent indefinite access');
    endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
  }

  // Dedup: use session.id as the canonical key (payment_intent is null in subscription mode).
  // Check BEFORE any writes — Stripe retries webhooks on 5xx, so a re-delivery must be idempotent.
  const historyKey = session.id;
  const alreadyRecorded = user.subscriptionHistory?.some(
    h => h.stripePaymentIntentId === historyKey
  );
  if (alreadyRecorded) {
    console.log(`checkout.session.completed dedup: session ${historyKey} already processed for user ${user._id} — skipping`);
    return;
  }

  user.subscription.planId = planId;
  user.subscription.plan = planId; // Add legacy plan field for compatibility
  user.subscription.status = 'active';
  user.subscription.startDate = startDate;
  user.subscription.endDate = endDate;
  user.subscription.stripeCustomerId = session.customer || user.subscription.stripeCustomerId;
  user.subscription.stripeSubscriptionId = stripeSubscriptionId || user.subscription.stripeSubscriptionId;
  user.subscription.stripePaymentIntentId = session.payment_intent || user.subscription.stripePaymentIntentId;
  user.subscription.paymentMethod = 'card';
  user.subscription.autoRenew = !!stripeSubscriptionId;

  // Set maxDevices based on plan type
  user.maxDevices = plan.features.maxDevices || (plan.type === 'shared' ? 2 : 1);

  user.subscriptionHistory.push({
    planId: planId,
    startDate: startDate,
    endDate: endDate,
    amount: plan.price,
    currency: plan.currency,
    status: 'completed',
    stripePaymentIntentId: historyKey
  });

  const isNewUser = !session.metadata.userId;
  
  await user.save();
  console.log(`Subscription activated for user ${user._id}`);

  if (isNewUser) {
    // New user - send password reset email instead of payment receipt
    const { sendPasswordResetEmail } = await import('../services/emailService.js');
    const crypto = await import('crypto');
    
    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    await user.save();
    
    // Send welcome email with password reset link
    sendPasswordResetEmail(user, resetToken, true) // true = isNewUser
      .catch(err => console.error('Password reset email failed:', err));
  } else {
    // Existing user - send payment receipt
    sendPaymentReceiptEmail(user, plan.name, plan.price, plan.currency, endDate)
      .catch(err => console.error('User webhook payment receipt email failed:', err));
  }

  // Notify admin of new payment (non-blocking)
  notifyAdminNewPayment(user, plan.name, plan.price, plan.currency)
    .catch(err => console.error('Admin webhook payment notification failed:', err));
}

// Helper function to handle payment failures
async function handlePaymentFailed(paymentIntent) {
  console.warn('Payment failed for customer:', paymentIntent.customer);

  // If this payment intent is tied to an invoice (subscription payment),
  // invoice.payment_failed will fire too and handles email + status update.
  // Only send email here for standalone (non-subscription) payment failures.
  if (paymentIntent.invoice) {
    console.log(`payment_intent.payment_failed skipped: invoice-based failure handled by invoice.payment_failed (pi=${paymentIntent.id})`);
    return;
  }

  if (paymentIntent.customer) {
    try {
      const user = await User.findOne({ 'subscription.stripeCustomerId': paymentIntent.customer });
      if (user) {
        sendPaymentFailedEmail(user)
          .catch(err => console.error('User payment failed email failed:', err));
      }
    } catch (err) {
      console.error('Error finding user for payment failure notification:', err);
    }
  }
}

// Helper: handle invoice.paid — extends subscription on renewal
async function handleInvoicePaid(invoice) {
  // Skip the initial creation invoice — checkout.session.completed already handles it
  if (invoice.billing_reason === 'subscription_create') {
    console.log('invoice.paid skipped: initial invoice handled by checkout.session.completed');
    return;
  }

  const subscriptionId = invoice.subscription;
  const customerId = invoice.customer;

  const user = await User.findOne({
    $or: [
      { 'subscription.stripeSubscriptionId': subscriptionId },
      { 'subscription.stripeCustomerId': customerId }
    ]
  });

  if (!user) {
    console.warn(`invoice.paid: no user found for subscription ${subscriptionId} / customer ${customerId}`);
    return;
  }

  // Derive new endDate from invoice line item period, then fall back to subscription object
  let newEndDate = null;
  const lineItem = invoice.lines?.data?.[0];
  if (lineItem?.period?.end) {
    newEndDate = new Date(lineItem.period.end * 1000);
  }

  if (!newEndDate && subscriptionId) {
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (stripeSubscription.current_period_end) {
        newEndDate = new Date(stripeSubscription.current_period_end * 1000);
      }
    } catch (e) {
      console.error('Failed to retrieve subscription for invoice.paid:', e.message);
    }
  }

  // Dedup check before any writes — if this invoice was already processed, skip entirely
  const alreadyRecorded = user.subscriptionHistory?.some(h => h.stripePaymentIntentId === invoice.id);
  if (alreadyRecorded) {
    console.log(`invoice.paid dedup: invoice ${invoice.id} already recorded for user ${user._id}`);
    return;
  }

  user.subscription.status = 'active';
  user.subscription.autoRenew = true;
  if (newEndDate) {
    user.subscription.endDate = newEndDate;
  }

  // Recovery: sync stripeSubscriptionId if user was found by customerId and ID is missing
  if (!user.subscription.stripeSubscriptionId && subscriptionId) {
    user.subscription.stripeSubscriptionId = subscriptionId;
    console.log(`[handleInvoicePaid] Recovered stripeSubscriptionId ${subscriptionId} for user ${user._id}`);
  }

  // A successful cycle renewal means the user is NOT cancelling — reset the flag.
  // handleSubscriptionUpdated normally syncs this, but reset here as a safety net
  // in case that webhook is delayed or retried out of order.
  if (invoice.billing_reason === 'subscription_cycle') {
    user.subscription.cancelAtPeriodEnd = false;
  }

  // Record renewal in history
  const plan = await SubscriptionPlan.findOne({ planId: user.subscription.planId });
  if (plan) {
    user.subscriptionHistory.push({
      planId: user.subscription.planId,
      startDate: new Date(),
      endDate: newEndDate,
      amount: plan.price,
      currency: plan.currency,
      status: 'completed',
      stripePaymentIntentId: invoice.id
    });
  }

  await user.save();
  console.log(`Subscription renewed for user ${user._id}, new endDate: ${newEndDate}`);

  // Extend shared users' endDate so they don't lose access at the old period end
  if (newEndDate && user.subscription.sharedWith?.length > 0) {
    await User.updateMany(
      { _id: { $in: user.subscription.sharedWith } },
      { $set: { 'subscription.endDate': newEndDate, 'subscription.status': 'active' } }
    ).catch(e => console.error('Failed to extend shared users endDate on renewal:', e.message));
  }

  // Send renewal receipt email (covers both normal renewals and retry successes)
  if (plan) {
    sendPaymentReceiptEmail(user, plan.name, plan.price, plan.currency, newEndDate)
      .catch(err => console.error('Renewal receipt email failed:', err));
  }
}

// Helper: handle invoice.payment_failed — marks subscription as past_due
async function handleInvoicePaymentFailed(invoice) {
  const subscriptionId = invoice.subscription;
  const customerId = invoice.customer;

  const user = await User.findOne({
    $or: [
      { 'subscription.stripeSubscriptionId': subscriptionId },
      { 'subscription.stripeCustomerId': customerId }
    ]
  });

  if (!user) {
    console.warn(`invoice.payment_failed: no user found for subscription ${subscriptionId} / customer ${customerId}`);
    return;
  }

  // Mark past_due — do NOT cancel; Stripe will retry automatically
  user.subscription.status = 'past_due';
  await user.save();
  console.log(`Subscription marked past_due for user ${user._id} (attempt ${invoice.attempt_count})`);

  // Only email on the first failure — Stripe retries up to 4 times over 10 days.
  // Subsequent retries are silent to avoid flooding the user with failure emails.
  if (invoice.attempt_count === 1) {
    sendPaymentFailedEmail(user)
      .catch(err => console.error('Payment failed email error:', err));
  }
}

// Helper: handle Stripe charge refunded (one-time payment model cancellation)
async function handleChargeRefunded(charge) {
  const user = await User.findOne({
    $or: [
      { 'subscription.stripePaymentIntentId': charge.payment_intent },
      { 'subscription.stripeCustomerId': charge.customer }
    ]
  });

  if (user && user.subscription.status === 'active') {
    const planId = user.subscription.planId;
    user.subscription.status = 'cancelled';
    user.subscription.autoRenew = false;
    await user.save();
    console.log(`Subscription cancelled via refund for user ${user._id}`);

    sendSubscriptionCancelledEmail(user, planId, null)
      .catch(err => console.error('Cancellation email failed:', err));
    notifyAdminCancelledSubscription(user, planId)
      .catch(err => console.error('Admin cancellation notification failed:', err));
  }
}

// Helper: handle subscription deletion (Stripe subscription mode)
async function handleSubscriptionDeleted(subscription) {
  const user = await User.findOne({
    $or: [
      { 'subscription.stripeSubscriptionId': subscription.id },
      { 'subscription.stripeCustomerId': subscription.customer }
    ]
  });

  if (user) {
    const planId = user.subscription.planId;
    // Capture before clearing — true means user explicitly cancelled (already emailed)
    const wasUserInitiatedCancel = user.subscription.cancelAtPeriodEnd === true;
    const accessEndDate = user.subscription.endDate || null;

    user.subscription.status = 'cancelled';
    user.subscription.autoRenew = false;
    user.subscription.stripeSubscriptionId = null;
    user.subscription.stripePaymentIntentId = null;
    user.subscription.cancelAtPeriodEnd = false;
    await user.save();
    console.log(`Subscription deleted for user ${user._id} (userInitiated=${wasUserInitiatedCancel})`);

    // Only send final cancellation email for Stripe-forced cancellations (failed payment retries).
    // User-initiated cancels already received an email at the time they clicked cancel.
    if (!wasUserInitiatedCancel) {
      sendSubscriptionCancelledEmail(user, planId, accessEndDate)
        .catch(err => console.error('User cancellation email failed:', err));
      // Admin was already notified at cancel-click time for user-initiated cancels.
      // Only notify here for Stripe-forced cancellations (payment retries exhausted).
      notifyAdminCancelledSubscription(user, planId)
        .catch(err => console.error('Admin cancellation notification failed:', err));
    }
  }
}

// Helper: handle subscription updated (Stripe subscription mode)
async function handleSubscriptionUpdated(subscription) {
  const user = await User.findOne({
    $or: [
      { 'subscription.stripeSubscriptionId': subscription.id },
      { 'subscription.stripeCustomerId': subscription.customer }
    ]
  });

  if (!user) return;

  // Map Stripe statuses to internal statuses
  const statusMap = {
    active: 'active',
    canceled: 'cancelled',
    past_due: 'past_due',
    unpaid: 'past_due',
    paused: 'inactive',
    trialing: 'active',
  };

  let changed = false;

  let newStatus = statusMap[subscription.status];

  // Guard: if Stripe reports 'canceled' but current_period_end is still in the future,
  // do NOT set status to 'cancelled' yet — the paid period is still active.
  // customer.subscription.deleted will fire at actual period end to finalize cancellation.
  if (newStatus === 'cancelled' && subscription.current_period_end) {
    const periodEnd = new Date(subscription.current_period_end * 1000);
    if (periodEnd > new Date()) {
      newStatus = 'active';
    }
  }

  if (newStatus && user.subscription.status !== newStatus) {
    user.subscription.status = newStatus;
    changed = true;
  }

  if (subscription.current_period_end) {
    user.subscription.endDate = new Date(subscription.current_period_end * 1000);
    changed = true;
  }

  if (typeof subscription.cancel_at_period_end === 'boolean') {
    user.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
    changed = true;
  }

  // Recovery: if stripeSubscriptionId is missing (e.g. DB save failed in subscribeWithSavedCard),
  // sync it now so cancel / renewal lookups work correctly going forward.
  if (!user.subscription.stripeSubscriptionId && subscription.id) {
    user.subscription.stripeSubscriptionId = subscription.id;
    if (!user.subscription.planId && subscription.metadata?.planId) {
      user.subscription.planId = subscription.metadata.planId;
      user.subscription.plan = subscription.metadata.planId;
    }
    changed = true;
  }

  if (changed) {
    await user.save();
    console.log(`Subscription updated for user ${user._id}: status=${newStatus}, endDate=${user.subscription.endDate}`);
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
  verifyPayment,
  handleWebhook,
  getStripeConfig,
  createPaymentIntent
};
