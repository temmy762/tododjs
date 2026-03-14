import express from 'express';
import multer from 'multer';
import { getAllUsers, updateUser, deleteUser, uploadAvatar, getDeviceOverview, revokeDevice, getSharingSuspects } from '../controllers/userController.js';
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
router.get('/devices', protect, authorize('admin'), getDeviceOverview);
router.get('/sharing-suspects', protect, authorize('admin'), getSharingSuspects);
router.put('/avatar', protect, avatarUpload.single('avatar'), uploadAvatar);
router.route('/:id')
  .put(protect, authorize('admin'), updateUser)
  .delete(protect, authorize('admin'), deleteUser);
router.delete('/:id/devices/:deviceId', protect, authorize('admin'), revokeDevice);

export default router;
