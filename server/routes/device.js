import express from 'express';
import {
  getDevices,
  removeDevice,
  renameDevice,
  signOutAllDevices,
  cleanupDevices
} from '../controllers/deviceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
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
