import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const trackSchema = new mongoose.Schema({}, {strict: false});
const Track = mongoose.model('Track', trackSchema);

async function checkTracks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const track = await Track.findById('698d45ce9a111155ffee244c').select('title artist sourceId albumId');
    console.log('Track that was downloaded 4 times:');
    console.log('Title:', track?.title || 'Unknown');
    console.log('Artist:', track?.artist || 'Unknown');
    console.log('sourceId:', track?.sourceId || 'NULL');
    console.log('albumId:', track?.albumId || 'NULL');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkTracks();
