import express from 'express';
import {
  createCheckoutSession,
  verifyPayment,
  handleWebhook,
  getStripeConfig,
  createPaymentIntent
} from '../controllers/stripeController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/config', getStripeConfig);

// Webhook route (must be before body parser middleware)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.post('/create-checkout-session', protect, createCheckoutSession);
router.post('/create-payment-intent', protect, createPaymentIntent);
router.post('/verify-payment', protect, verifyPayment);

export default router;
