import express from 'express';
import {
  getPlans,
  getPlan,
  getSubscriptionStatus,
  activateSubscription,
  cancelSubscription,
  getDevices,
  registerDevice,
  removeDevice,
  shareSubscription,
  removeSharedUser,
  getSubscriptionHistory,
  checkWhatsAppEligibility
} from '../controllers/subscriptionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/plans', getPlans);
router.get('/plans/:planId', getPlan);

// Protected routes
router.get('/status', protect, getSubscriptionStatus);
router.post('/activate', protect, activateSubscription);
router.put('/cancel', protect, cancelSubscription);
router.get('/devices', protect, getDevices);
router.post('/devices', protect, registerDevice);
router.delete('/devices/:deviceId', protect, removeDevice);
router.post('/share', protect, shareSubscription);
router.delete('/share/:userId', protect, removeSharedUser);
router.get('/history', protect, getSubscriptionHistory);
router.get('/whatsapp-eligibility', protect, checkWhatsAppEligibility);

export default router;
