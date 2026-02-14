import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const trackSchema = new mongoose.Schema({}, {strict: false});
const Track = mongoose.model('Track', trackSchema);

async function assignOrphanTracks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const sourceId = process.argv[2];
    if (!sourceId) {
      console.error('Usage: node assignOrphanTracks.js <sourceId>');
      console.log('\nAvailable source IDs:');
      console.log('- 698378997b3ea78eebd54c64 (NEW HITS 2026)');
      console.log('- 698672add747fcfd56c094e0 (Playlist PRO 2026)');
      console.log('- 698d4a67cd4ff5c77990ed9c (PLAYLISTPRO ENRO 2026)');
      process.exit(1);
    }

    // Find orphan tracks
    const orphanTracks = await Track.find({
      $or: [
        { sourceId: null },
        { sourceId: { $exists: false } }
      ]
    });

    console.log(`Found ${orphanTracks.length} orphan tracks`);
    console.log(`Assigning all to source: ${sourceId}\n`);

    // Update all orphan tracks
    const result = await Track.updateMany(
      {
        $or: [
          { sourceId: null },
          { sourceId: { $exists: false } }
        ]
      },
      {
        $set: { sourceId: sourceId }
      }
    );

    console.log(`✓ Updated ${result.modifiedCount} tracks`);
    console.log('✓ All orphan tracks now have a sourceId');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

assignOrphanTracks();
