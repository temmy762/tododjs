import User from '../models/User.js';
import Track from '../models/Track.js';
import { getSignedDownloadUrl } from '../config/wasabi.js';

// @desc    Toggle favorite (add/remove)
// @route   POST /api/favorites/toggle/:trackId
// @access  Private
export const toggleFavorite = async (req, res) => {
  try {
    const { trackId } = req.params;

    const track = await Track.findById(trackId).select('_id likes');
    if (!track) {
      return res.status(404).json({ success: false, message: 'Track not found' });
    }

    // Atomic toggle.
    //
    // This used to load the user and the track, mutate both in memory, and save
    // them one after the other. Two people favouriting the same track at the
    // same moment each read the same `likes`, both wrote read+1, and one
    // increment was lost — the count drifted permanently downward with nothing
    // able to reconcile it. The same read-modify-write on `favorites` could
    // drop a concurrent change from the same user in two tabs, and a failure
    // between the two saves left the favourite recorded with the count stale.
    //
    // Attempt the removal first: whether the document actually changed is what
    // tells us which way this toggle went, so the decision and the write are a
    // single operation with no window in between.
    const removed = await User.updateOne(
      { _id: req.user.id, favorites: trackId },
      { $pull: { favorites: trackId } }
    );

    let isFavorited;
    let delta;

    if (removed.modifiedCount > 0) {
      isFavorited = false;
      delta = -1;
    } else {
      // $addToSet cannot create a duplicate, and modifiedCount tells us whether
      // THIS request was the one that added it — so a double-click, or two tabs
      // racing, still counts exactly once.
      const added = await User.updateOne(
        { _id: req.user.id },
        { $addToSet: { favorites: trackId } }
      );
      if (added.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      isFavorited = true;
      delta = added.modifiedCount > 0 ? 1 : 0;
    }

    let totalLikes = track.likes || 0;

    if (delta === 1) {
      const updated = await Track.findByIdAndUpdate(
        trackId,
        { $inc: { likes: 1 } },
        { new: true, projection: 'likes' }
      );
      totalLikes = updated?.likes ?? totalLikes;
    } else if (delta === -1) {
      // The floor lives in the filter, not in a Math.max after a read — a
      // read-then-clamp would reintroduce exactly the race being fixed here.
      // A count already at zero simply does not match, and stays zero.
      const updated = await Track.findOneAndUpdate(
        { _id: trackId, likes: { $gt: 0 } },
        { $inc: { likes: -1 } },
        { new: true, projection: 'likes' }
      );
      totalLikes = updated ? updated.likes : 0;
    }

    res.status(200).json({
      success: true,
      data: { isFavorited, totalLikes }
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
