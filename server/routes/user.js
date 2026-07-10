import express from 'express';
import multer from 'multer';
import { getAllUsers, exportUsers, updateUser, deleteUser, uploadAvatar, getDeviceOverview, revokeDevice, getSharingSuspects, syncUserStripeSubscription, bulkSyncStripeSubscriptions, blockUser, unblockUser, liftDownloadSuspension } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

router.get('/', protect, authorize('admin'), getAllUsers);
router.get('/export', protect, authorize('admin'), exportUsers);
router.get('/devices', protect, authorize('admin'), getDeviceOverview);
router.get('/sharing-suspects', protect, authorize('admin'), getSharingSuspects);
router.put('/avatar', protect, avatarUpload.single('avatar'), uploadAvatar);
router.post('/bulk-sync-stripe', protect, authorize('admin'), bulkSyncStripeSubscriptions);
router.route('/:id')
  .put(protect, authorize('admin'), updateUser)
  .delete(protect, authorize('admin'), deleteUser);
router.delete('/:id/devices/:deviceId', protect, authorize('admin'), revokeDevice);
router.post('/:id/sync-stripe', protect, authorize('admin'), syncUserStripeSubscription);
router.put('/:id/block', protect, authorize('admin'), blockUser);
router.put('/:id/unblock', protect, authorize('admin'), unblockUser);
router.put('/:id/lift-download-suspension', protect, authorize('admin'), liftDownloadSuspension);

export default router;
