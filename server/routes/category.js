import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTracks,
  seedCategories,
  getUncategorizedCount,
  getUncategorizedTracks,
  bulkAssignCategory
} from '../controllers/categoryController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getCategories);
router.post('/seed', protect, authorize('admin'), seedCategories);
router.get('/uncategorized/count', protect, authorize('admin'), getUncategorizedCount);
router.get('/uncategorized/tracks', protect, authorize('admin'), getUncategorizedTracks);
router.post('/bulk-assign', protect, authorize('admin'), bulkAssignCategory);
router.post('/', protect, authorize('admin'), createCategory);
router.put('/:id', protect, authorize('admin'), updateCategory);
router.delete('/:id', protect, authorize('admin'), deleteCategory);
router.get('/:slug/tracks', getCategoryTracks);

export default router;
