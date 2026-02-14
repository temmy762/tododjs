import User from '../models/User.js';
import Track from '../models/Track.js';

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

    res.status(200).json({
      success: true,
      count: user.favorites.length,
      data: user.favorites
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
