import express from 'express';
import Collection from '../models/Collection.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all processing collections with detailed status
// @route   GET /api/upload-status
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const processingCollections = await Collection.find({
      status: { $in: ['processing', 'uploading'] }
    }).select('name status processingProgress totalDatePacks totalAlbums totalTracks createdAt updatedAt');

    const completedRecent = await Collection.find({
      status: 'completed',
      updatedAt: { $gte: new Date(Date.now() - 3600000) } // Last hour
    }).select('name status totalDatePacks totalAlbums totalTracks updatedAt');

    res.json({
      success: true,
      data: {
        processing: processingCollections,
        recentlyCompleted: completedRecent,
        hasActiveUploads: processingCollections.length > 0
      }
    });
  } catch (error) {
    console.error('Error fetching upload status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get detailed status for a specific collection
// @route   GET /api/upload-status/:id
// @access  Private/Admin
router.get('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('uploadedBy', 'name email');

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: collection._id,
        name: collection.name,
        status: collection.status,
        progress: collection.processingProgress,
        totalDatePacks: collection.totalDatePacks,
        totalAlbums: collection.totalAlbums,
        totalTracks: collection.totalTracks,
        uploadedBy: collection.uploadedBy,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching collection status:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
