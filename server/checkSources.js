import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Source from './models/Source.js';
import Track from './models/Track.js';
import Download from './models/Download.js';

dotenv.config();

async function checkSources() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const sources = await Source.find().select('name _id isActive');
    console.log('=== ALL SOURCES ===');
    sources.forEach(s => {
      console.log(`${s.name} (ID: ${s._id}) - Active: ${s.isActive !== false}`);
    });
    console.log('');

    // Check NEW HITS specifically
    const newHits = await Source.findById('698378997b3ea78eebd54c64');
    console.log('=== NEW HITS SOURCE ===');
    console.log('Name:', newHits?.name || 'NOT FOUND');
    console.log('Active:', newHits?.isActive);
    console.log('');

    // Check tracks assigned to NEW HITS
    const newHitsTracks = await Track.countDocuments({ sourceId: '698378997b3ea78eebd54c64' });
    console.log(`Tracks assigned to NEW HITS: ${newHitsTracks}`);

    // Check downloads for NEW HITS
    const newHitsDownloads = await Download.countDocuments({ sourceId: '698378997b3ea78eebd54c64' });
    console.log(`Downloads for NEW HITS: ${newHitsDownloads}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSources();
