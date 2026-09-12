import express from 'express';
import {
  listCoupons,
  createCoupon,
  setCouponActive,
  deleteCoupon,
  validateCoupon,
} from '../controllers/couponController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Any signed-in customer can check a code before paying; only admins manage them.
router.post('/validate', protect, validateCoupon);

router.get('/', protect, authorize('admin'), listCoupons);
router.post('/', protect, authorize('admin'), createCoupon);
router.patch('/:id', protect, authorize('admin'), setCouponActive);
router.delete('/:id', protect, authorize('admin'), deleteCoupon);

export default router;
