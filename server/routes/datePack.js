import express from 'express';
import multer from 'multer';
import {
  createDatePack,
  getDatePack,
  getDatePacksBySource,
  getAlbumsByDatePack,
  updateDatePack,
  deleteDatePack
} from '../controllers/datePackController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.route('/')
  .post(protect, authorize('admin'), upload.single('thumbnailFile'), createDatePack);

router.route('/source/:sourceId')
  .get(getDatePacksBySource);

router.route('/:id')
  .get(getDatePack)
  .put(protect, authorize('admin'), upload.single('thumbnailFile'), updateDatePack)
  .delete(protect, authorize('admin'), deleteDatePack);

router.route('/:id/albums')
  .get(getAlbumsByDatePack);

export default router;
