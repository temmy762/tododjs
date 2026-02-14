import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Download from './models/Download.js';
import Track from './models/Track.js';
import Album from './models/Album.js';

dotenv.config();

async function forceUpdateDownloads() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find all downloads without sourceId
    const downloadsWithoutSource = await Download.find({
      $or: [
        { sourceId: null },
        { sourceId: { $exists: false } }
      ]
    });

    console.log(`Found ${downloadsWithoutSource.length} downloads without sourceId`);

    let updated = 0;
    for (const dl of downloadsWithoutSource) {
      let sourceId = null;

      // Try to get sourceId from track
      if (dl.trackId) {
        const track = await Track.findById(dl.trackId).select('sourceId albumId');
        if (track) {
          sourceId = track.sourceId;
          // Also update albumId if missing
          if (!dl.albumId && track.albumId) {
            dl.albumId = track.albumId;
          }
        }
      }

      // Try to get sourceId from album if still null
      if (!sourceId && dl.albumId) {
        const album = await Album.findById(dl.albumId).select('sourceId');
        if (album) {
          sourceId = album.sourceId;
        }
      }

      // Update if we found a sourceId
      if (sourceId) {
        await Download.updateOne(
          { _id: dl._id },
          { $set: { sourceId: sourceId, ...(dl.albumId && { albumId: dl.albumId }) } }
        );
        updated++;
        console.log(`✓ Updated download ${dl._id} with sourceId: ${sourceId}`);
      }
    }

    console.log(`\n✓ Updated ${updated} out of ${downloadsWithoutSource.length} downloads`);

    // Verify the fix
    const remaining = await Download.countDocuments({
      $or: [
        { sourceId: null },
        { sourceId: { $exists: false } }
      ]
    });

    console.log(`Remaining downloads without sourceId: ${remaining}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

forceUpdateDownloads();
