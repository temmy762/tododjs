import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads temp directory
const uploadsDir = path.join(__dirname, '..', 'uploads', 'temp');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
import {
  uploadCollection,
  getCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  getCollectionStats,
  getCollectionStatus,
  cancelCollectionProcessing,
  retryFailedTracks,
  reprocessCollection,
  cleanupDatePackNames
} from '../controllers/collectionController.js';
import { getDatePacksByCollection } from '../controllers/datePackController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 150 * 1024 * 1024 * 1024 // 150GB limit
  }
});

const thumbnailUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

router.route('/')
  .get(getCollections)
  .post(protect, authorize('admin'), upload.fields([
    { name: 'zipFile', maxCount: 1 },
    { name: 'thumbnailFile', maxCount: 1 }
  ]), uploadCollection);

router.route('/cleanup-names')
  .post(protect, authorize('admin'), cleanupDatePackNames);

router.route('/:id')
  .get(getCollection)
  .put(protect, authorize('admin'), thumbnailUpload.single('thumbnailFile'), updateCollection)
  .delete(protect, authorize('admin'), deleteCollection);

router.route('/:id/stats')
  .get(getCollectionStats);

router.route('/:id/status')
  .get(protect, authorize('admin'), getCollectionStatus);

router.route('/:id/cancel')
  .post(protect, authorize('admin'), cancelCollectionProcessing);

router.route('/:id/retry-failed')
  .post(protect, authorize('admin'), retryFailedTracks);

router.route('/:id/reprocess')
  .post(protect, authorize('admin'), reprocessCollection);

router.route('/:collectionId/date-packs')
  .get(getDatePacksByCollection);

export default router;
