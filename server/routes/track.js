import express from 'express';
import multer from 'multer';
import {
  getAllTracks,
  browseTracks,
  updateTrack,
  deleteTrack,
  getTrack,
  getTrackPlaybackUrl,
  reanalyzeAlbumTracks,
  uploadTrackThumbnail,
  uploadTracks
} from '../controllers/trackController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

const trackFileUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for ZIPs
  fileFilter: (req, file, cb) => {
    const isAudio = file.mimetype.startsWith('audio/') || file.originalname.match(/\.(mp3|wav|flac)$/i);
    const isZip = file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip');
    if (isAudio || isZip) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files (MP3/WAV/FLAC) and ZIP files are allowed'), false);
    }
  }
});

router.get('/', protect, authorize('admin'), getAllTracks);
router.get('/browse', browseTracks);
router.post('/upload', protect, authorize('admin'), trackFileUpload.single('file'), uploadTracks);
router.post('/reanalyze/:albumId', protect, authorize('admin'), reanalyzeAlbumTracks);

router.route('/:id')
  .get(getTrack)
  .put(protect, authorize('admin'), updateTrack)
  .delete(protect, authorize('admin'), deleteTrack);

router.route('/:id/playback')
  .get(getTrackPlaybackUrl);

router.put('/:id/thumbnail', protect, authorize('admin'), imageUpload.single('thumbnail'), uploadTrackThumbnail);

export default router;
