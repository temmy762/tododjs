import express from 'express';
import { getSettings, getSecurityData } from '../controllers/settingsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('admin'), getSettings);
router.get('/security', protect, authorize('admin'), getSecurityData);

export default router;
