import express from 'express';
import Collection from '../models/Collection.js';
import Mashup from '../models/Mashup.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all processing collections and recent mashup uploads
// @route   GET /api/upload-status
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const processingCollections = await Collection.find({
      status: { $in: ['queued', 'processing', 'uploading'] }
    }).select('name status processingProgress totalDatePacks totalAlbums totalTracks createdAt updatedAt');

    const completedRecent = await Collection.find({
      status: 'completed',
      updatedAt: { $gte: new Date(Date.now() - 3600000) } // Last hour
    }).select('name status totalDatePacks totalAlbums totalTracks updatedAt');

    // Get recent mashup uploads (last hour)
    const recentMashups = await Mashup.find({
      createdAt: { $gte: new Date(Date.now() - 3600000) }
    })
      .select('title artist genre bpm tonality coverArt createdAt uploadedBy')
      .populate('uploadedBy', 'name email')
      .sort('-createdAt')
      .limit(20);

    res.json({
      success: true,
      data: {
        processing: processingCollections,
        recentlyCompleted: completedRecent,
        recentMashups: recentMashups,
        hasActiveUploads: processingCollections.length > 0,
        hasRecentMashups: recentMashups.length > 0
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

// @desc    Dismiss (force-fail) a stale stuck upload
// @route   DELETE /api/upload-status/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }
    if (!['queued', 'processing', 'uploading'].includes(collection.status)) {
      return res.status(400).json({ success: false, message: 'Collection is not in an active state' });
    }
    collection.status = 'failed';
    collection.processingProgress = 0;
    await collection.save();
    res.json({ success: true, message: 'Upload dismissed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
