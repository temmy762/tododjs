import express from 'express';
import {
  cancelSubscription,
  reactivateSubscription,
  getSubscription
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Stripe webhook is handled exclusively at POST /api/stripe/webhook
router.post('/cancel-subscription', protect, cancelSubscription);
router.post('/reactivate-subscription', protect, reactivateSubscription);
router.get('/subscription', protect, getSubscription);

export default router;
