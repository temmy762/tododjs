import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const downloadSchema = new mongoose.Schema({}, {strict: false});
const trackSchema = new mongoose.Schema({}, {strict: false});

const Download = mongoose.model('Download', downloadSchema);
const Track = mongoose.model('Track', trackSchema);

async function verifyFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Check the specific track
    const track = await Track.findById('698d45ce9a111155ffee244c').select('title artist sourceId');
    console.log('=== TRACK INFO ===');
    console.log('Title:', track.title);
    console.log('Artist:', track.artist);
    console.log('sourceId:', track.sourceId || 'NULL');
    console.log('');

    // Check download records for this track
    const downloads = await Download.find({trackId: '698d45ce9a111155ffee244c'}).select('sourceId type createdAt');
    console.log('=== DOWNLOAD RECORDS FOR THIS TRACK ===');
    console.log(`Found ${downloads.length} downloads`);
    downloads.forEach((dl, i) => {
      console.log(`${i+1}. Type: ${dl.type} | sourceId: ${dl.sourceId || 'NULL'} | Date: ${dl.createdAt}`);
    });
    console.log('');

    // Check all downloads
    const allDownloads = await Download.countDocuments();
    const withSource = await Download.countDocuments({sourceId: {$ne: null}});
    console.log('=== ALL DOWNLOADS ===');
    console.log('Total:', allDownloads);
    console.log('With sourceId:', withSource);
    console.log('Without sourceId:', allDownloads - withSource);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyFix();
