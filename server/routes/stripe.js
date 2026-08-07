import express from 'express';
import {
  verifyPayment,
  handleWebhook,
  getStripeConfig,
  createPaymentIntent
} from '../controllers/stripeController.js';
import { protect, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/config', getStripeConfig);

// Webhook route (must be before body parser middleware)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.post('/create-payment-intent', protect, createPaymentIntent);

// verify-payment uses optionalAuth, NOT protect: after Stripe's hosted
// checkout the customer frequently returns without a usable JWT (logged out,
// different device, or an account the checkout itself just created). The
// Stripe session ID in the body is the credential. When a token IS present
// the controller still enforces that the session belongs to that user.
router.post('/verify-payment', optionalAuth, verifyPayment);

export default router;
