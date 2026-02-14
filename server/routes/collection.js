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
  getCollectionStats
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
    fileSize: 100000000000 // 100GB limit
  }
});

router.route('/')
  .get(getCollections)
  .post(protect, authorize('admin'), upload.fields([
    { name: 'zipFile', maxCount: 1 },
    { name: 'thumbnailFile', maxCount: 1 }
  ]), uploadCollection);

router.route('/:id')
  .get(getCollection)
  .put(protect, authorize('admin'), updateCollection)
  .delete(protect, authorize('admin'), deleteCollection);

router.route('/:id/stats')
  .get(getCollectionStats);

router.route('/:collectionId/date-packs')
  .get(getDatePacksByCollection);

export default router;
