import express from 'express';
import { getAnalytics, getGenreStats } from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('admin'), getAnalytics);
router.get('/genres', protect, authorize('admin'), getGenreStats);

export default router;
