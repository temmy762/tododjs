import express from 'express';
import {
  downloadTrack,
  downloadTrackFile,
  downloadAlbum,
  downloadAlbumFile,
  getDownloadHistory,
  getTrendingDownloads,
  getRecentUploads,
  getDownloadStats,
  getAdminDownloadLogs,
  exportDownloadLogs,
  getDownloadAlerts
} from '../controllers/downloadController.js';
import { protect, authorize } from '../middleware/auth.js';
import { requireSubscription, checkDeviceLimit } from '../middleware/subscription.js';

const router = express.Router();

// Public routes
router.get('/trending', getTrendingDownloads);
router.get('/recent', getRecentUploads);

// Protected routes - Require active subscription and check device limits
router.post('/track/:id', protect, requireSubscription, checkDeviceLimit, downloadTrack);
router.get('/track/:id/file', protect, requireSubscription, checkDeviceLimit, downloadTrackFile);
router.post('/album/:id', protect, requireSubscription, checkDeviceLimit, downloadAlbum);
router.get('/album/:id/file', protect, requireSubscription, checkDeviceLimit, downloadAlbumFile);
router.get('/history', protect, getDownloadHistory);

// Admin routes
router.get('/admin/logs', protect, authorize('admin'), getAdminDownloadLogs);
router.get('/admin/export', protect, authorize('admin'), exportDownloadLogs);
router.get('/admin/alerts', protect, authorize('admin'), getDownloadAlerts);
router.get('/stats', protect, authorize('admin'), getDownloadStats);

export default router;
