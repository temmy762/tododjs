import express from 'express';
import {
  searchTracks,
  searchGlobal,
  getFilterOptions,
  searchCollections,
  searchAlbums
} from '../controllers/searchController.js';

const router = express.Router();

router.get('/tracks', searchTracks);
router.get('/global', searchGlobal);
router.get('/filters', getFilterOptions);
router.get('/collections', searchCollections);
router.get('/albums', searchAlbums);

export default router;
