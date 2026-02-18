import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Track from './server/models/Track.js';

dotenv.config({ path: './server/.env' });

async function checkAlbumTracks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const albumId = '69907d8cdf9a42023a76ebbb';
    
    console.log(`🔍 Searching for tracks with albumId: ${albumId}\n`);
    
    const tracks = await Track.find({ albumId: albumId });
    
    console.log(`📊 Found ${tracks.length} tracks\n`);
    
    if (tracks.length > 0) {
      console.log('First 3 tracks:');
      tracks.slice(0, 3).forEach((track, i) => {
        console.log(`\n${i + 1}. ${track.title} - ${track.artist}`);
        console.log(`   ID: ${track._id}`);
        console.log(`   AlbumId: ${track.albumId}`);
        console.log(`   BPM: ${track.bpm}`);
        console.log(`   Tonality: ${track.tonality?.camelot || 'N/A'}`);
      });
    } else {
      console.log('❌ NO TRACKS FOUND FOR THIS ALBUM');
      console.log('\nChecking if tracks exist without albumId...');
      const orphanTracks = await Track.find({ albumId: { $exists: false } }).limit(5);
      console.log(`Found ${orphanTracks.length} tracks without albumId`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAlbumTracks();
