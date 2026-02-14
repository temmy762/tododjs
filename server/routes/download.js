import express from 'express';
import {
  downloadTrack,
  downloadTrackFile,
  downloadAlbum,
  downloadAlbumFile,
  getDownloadHistory,
  getTrendingDownloads,
  getRecentUploads,
  getDownloadStats
} from '../controllers/downloadController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/trending', getTrendingDownloads);
router.get('/recent', getRecentUploads);

// Protected routes
router.post('/track/:id', protect, downloadTrack);
router.get('/track/:id/file', protect, downloadTrackFile);
router.post('/album/:id', protect, downloadAlbum);
router.get('/album/:id/file', protect, downloadAlbumFile);
router.get('/history', protect, getDownloadHistory);

// Admin routes
router.get('/stats', protect, authorize('admin'), getDownloadStats);

export default router;
