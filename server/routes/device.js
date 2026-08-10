import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getDevices,
  removeDevice,
  renameDevice,
  signOutAllDevices,
  cleanupDevices,
  getDevicesByToken,
  removeDeviceByToken
} from '../controllers/deviceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// ── Public, token-authenticated device management ───────────────────────────
// Registered BEFORE router.use(protect): the whole point is that the blocked
// device has no session yet. The emailed token is the credential.
// Rate-limited tightly because these are unauthenticated — a 64-char random
// token is not guessable, but this removes any value in trying.
const manageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' },
});

router.get('/manage', manageLimiter, getDevicesByToken);
router.post('/manage/remove', manageLimiter, removeDeviceByToken);

// ── Everything below requires a session ─────────────────────────────────────
router.use(protect);

// Get all devices
router.get('/', getDevices);

// Remove specific device
router.delete('/:deviceId', removeDevice);

// Rename device
router.put('/:deviceId', renameDevice);

// Sign out from all devices
router.post('/signout-all', signOutAllDevices);

// Clean up inactive devices
router.post('/cleanup', cleanupDevices);

export default router;
