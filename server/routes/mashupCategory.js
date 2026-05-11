import express from 'express';
import {
  getMashupCategories,
  createMashupCategory,
  updateMashupCategory,
  deleteMashupCategory
} from '../controllers/mashupCategoryController.js';
import { protect, authorize, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', optionalAuth, getMashupCategories);
router.post('/', protect, authorize('admin'), createMashupCategory);
router.put('/:id', protect, authorize('admin'), updateMashupCategory);
router.delete('/:id', protect, authorize('admin'), deleteMashupCategory);

export default router;
