import User from '../models/User.js';
import Track from '../models/Track.js';
import { getSignedDownloadUrl } from '../config/wasabi.js';

// @desc    Toggle favorite (add/remove)
// @route   POST /api/favorites/toggle/:trackId
// @access  Private
export const toggleFavorite = async (req, res) => {
  try {
    const { trackId } = req.params;
    const user = await User.findById(req.user.id);

    const track = await Track.findById(trackId);
    if (!track) {
      return res.status(404).json({ success: false, message: 'Track not found' });
    }

    const index = user.favorites.indexOf(trackId);
    let isFavorited;

    if (index > -1) {
      // Remove from favorites
      user.favorites.splice(index, 1);
      track.likes = Math.max(0, (track.likes || 0) - 1);
      isFavorited = false;
    } else {
      // Add to favorites
      user.favorites.push(trackId);
      track.likes = (track.likes || 0) + 1;
      isFavorited = true;
    }

    await user.save();
    await track.save();

    res.status(200).json({
      success: true,
      data: { isFavorited, totalLikes: track.likes }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's favorite tracks
// @route   GET /api/favorites
// @access  Private
export const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: 'favorites',
      populate: { path: 'sourceId', select: 'name platform' }
    });

    // Generate signed URLs for cover art
    const tracksWithUrls = await Promise.all(
      user.favorites.map(async (track) => {
        const trackObj = track.toObject ? track.toObject() : { ...track };
        if (trackObj.coverArtKey) {
          try {
            trackObj.coverArt = await getSignedDownloadUrl(trackObj.coverArtKey, 7200);
          } catch (e) {
            console.error('Error signing coverArt for favorite track:', e.message);
          }
        }
        return trackObj;
      })
    );

    res.status(200).json({
      success: true,
      count: tracksWithUrls.length,
      data: tracksWithUrls
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check which tracks from a list are favorited
// @route   POST /api/favorites/check
// @access  Private
export const checkFavorites = async (req, res) => {
  try {
    const { trackIds } = req.body;
    const user = await User.findById(req.user.id);

    const favSet = new Set(user.favorites.map(id => id.toString()));
    const favorited = (trackIds || []).filter(id => favSet.has(id));

    res.status(200).json({
      success: true,
      data: favorited
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
