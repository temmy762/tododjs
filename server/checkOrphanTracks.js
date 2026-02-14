import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const trackSchema = new mongoose.Schema({}, {strict: false});
const Track = mongoose.model('Track', trackSchema);

async function checkOrphanTracks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const totalTracks = await Track.countDocuments();
    const tracksWithSource = await Track.countDocuments({sourceId: {$ne: null}});
    const tracksWithAlbum = await Track.countDocuments({albumId: {$ne: null}});
    const orphanTracks = await Track.countDocuments({sourceId: null, albumId: null});

    console.log('=== TRACK STATISTICS ===');
    console.log('Total Tracks:', totalTracks);
    console.log('With sourceId:', tracksWithSource);
    console.log('With albumId:', tracksWithAlbum);
    console.log('Orphan Tracks (no source, no album):', orphanTracks);
    console.log('');

    const orphans = await Track.find({sourceId: null, albumId: null}).limit(10).select('title artist _id');
    console.log('=== ORPHAN TRACKS ===');
    for(const t of orphans) {
      console.log(`${t.title} - ${t.artist} (ID: ${t._id})`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkOrphanTracks();
