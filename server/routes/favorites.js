import express from 'express';
import { toggleFavorite, getFavorites, checkFavorites } from '../controllers/favoriteController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/toggle/:trackId', protect, toggleFavorite);
router.get('/', protect, getFavorites);
router.post('/check', protect, checkFavorites);

export default router;
