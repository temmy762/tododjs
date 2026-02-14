import express from 'express';
import multer from 'multer';
import {
  uploadAlbum,
  uploadTrackToAlbum,
  getAlbums,
  getAlbum,
  getAlbumTracks,
  deleteAlbum
} from '../controllers/albumController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Multer for album ZIP + optional cover art
const albumUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB
});

// Multer for single MP3 track upload
const trackUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB per track
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg' || file.originalname.toLowerCase().endsWith('.mp3')) {
      cb(null, true);
    } else {
      cb(new Error('Only MP3 files are allowed'), false);
    }
  }
});

router.post('/upload', protect, authorize('admin'), albumUpload.fields([
  { name: 'albumZip', maxCount: 1 },
  { name: 'coverArt', maxCount: 1 }
]), uploadAlbum);

router.route('/')
  .get(getAlbums);

router.route('/:id')
  .get(getAlbum)
  .delete(protect, authorize('admin'), deleteAlbum);

router.route('/:id/tracks')
  .get(getAlbumTracks)
  .post(protect, authorize('admin'), trackUpload.single('trackFile'), uploadTrackToAlbum);

export default router;
