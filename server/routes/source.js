import express from 'express';
import multer from 'multer';
import {
  createSource,
  getSources,
  getSource,
  updateSource,
  deleteSource,
  getSourceStats
} from '../controllers/sourceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for thumbnails
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.route('/')
  .get(getSources)
  .post(protect, authorize('admin'), upload.single('thumbnailFile'), createSource);

router.route('/:id')
  .get(getSource)
  .put(protect, authorize('admin'), upload.single('thumbnailFile'), updateSource)
  .delete(protect, authorize('admin'), deleteSource);

router.get('/:id/stats', getSourceStats);

export default router;
