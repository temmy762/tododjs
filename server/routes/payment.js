import express from 'express';
import {
  createCheckoutSession,
  handleWebhook,
  cancelSubscription,
  reactivateSubscription,
  getSubscription
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/create-checkout-session', protect, createCheckoutSession);
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);
router.post('/cancel-subscription', protect, cancelSubscription);
router.post('/reactivate-subscription', protect, reactivateSubscription);
router.get('/subscription', protect, getSubscription);

export default router;
