import express from 'express';
import {
  register,
  login,
  getMe,
  logout,
  refreshToken,
  updateDetails,
  updatePassword,
  deleteMe,
  forgotPassword,
  resetPassword,
  biometricLogin
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/biometric-login', biometricLogin);
router.get('/logout', protect, logout);
router.get('/me', protect, getMe);
router.post('/refresh', protect, refreshToken);
router.put('/updatedetails', protect, updateDetails);
router.put('/updatepassword', protect, updatePassword);
router.delete('/me', protect, deleteMe);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

export default router;
