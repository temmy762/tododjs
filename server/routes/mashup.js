import express from 'express';
import multer from 'multer';
import {
  getMashups,
  getMashupSettings,
  updateMashupSettings,
  uploadMashupBanner,
  getAdminMashups,
  createMashup,
  updateMashup,
  deleteMashup,
  getMashupPlayback,
  getMashupGenres,
  autoCategorizeMashups,
  bulkAssignCategory,
  detectMashupTonalitySSE
} from '../controllers/mashupController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const mashupUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB for audio
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/x-wav', 'audio/mp3', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio (MP3/WAV/FLAC) and image files are allowed'), false);
    }
  }
});

const bannerUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public routes
router.get('/', getMashups);
router.get('/genres', getMashupGenres);
router.get('/settings', getMashupSettings);
router.get('/:id/playback', getMashupPlayback);

// Admin routes
router.get('/admin', protect, authorize('admin'), getAdminMashups);
router.put('/settings', protect, authorize('admin'), updateMashupSettings);
router.post('/settings/banner', protect, authorize('admin'), bannerUpload.fields([
  { name: 'banner', maxCount: 1 }
]), uploadMashupBanner);
router.post('/', protect, authorize('admin'), mashupUpload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'coverArt', maxCount: 1 }
]), createMashup);
router.put('/:id', protect, authorize('admin'), mashupUpload.fields([
  { name: 'coverArt', maxCount: 1 }
]), updateMashup);
router.delete('/:id', protect, authorize('admin'), deleteMashup);
router.post('/auto-categorize', protect, authorize('admin'), autoCategorizeMashups);
router.post('/bulk-assign-category', protect, authorize('admin'), bulkAssignCategory);
router.post('/detect-tonality', protect, authorize('admin'), detectMashupTonalitySSE);

export default router;
