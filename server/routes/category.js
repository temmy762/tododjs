import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTracks,
  seedCategories
} from '../controllers/categoryController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getCategories);
router.post('/seed', protect, authorize('admin'), seedCategories);
router.post('/', protect, authorize('admin'), createCategory);
router.put('/:id', protect, authorize('admin'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);
router.get('/:slug/tracks', getCategoryTracks);

export default router;
