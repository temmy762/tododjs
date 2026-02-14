import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const downloadSchema = new mongoose.Schema({}, {strict: false});
const albumSchema = new mongoose.Schema({}, {strict: false});
const sourceSchema = new mongoose.Schema({}, {strict: false});
const trackSchema = new mongoose.Schema({}, {strict: false});

const Download = mongoose.model('Download', downloadSchema);
const Album = mongoose.model('Album', albumSchema);
const Source = mongoose.model('Source', sourceSchema);
const Track = mongoose.model('Track', trackSchema);

async function checkDownloads() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const totalDownloads = await Download.countDocuments();
    const downloadsWithSourceId = await Download.countDocuments({sourceId: {$ne: null}});
    const downloadsWithAlbumId = await Download.countDocuments({albumId: {$ne: null}});
    const downloadsWithTrackId = await Download.countDocuments({trackId: {$ne: null}});

    console.log('=== DOWNLOAD RECORDS ===');
    console.log('Total Downloads:', totalDownloads);
    console.log('With sourceId:', downloadsWithSourceId);
    console.log('With albumId:', downloadsWithAlbumId);
    console.log('With trackId:', downloadsWithTrackId);
    console.log('');

    const albums = await Album.find().limit(5).select('name totalDownloads _id sourceId');
    console.log('=== ALBUMS (stored vs live count) ===');
    for(const a of albums) {
      const liveCount = await Download.countDocuments({albumId: a._id});
      console.log(`${a.name} | Stored: ${a.totalDownloads || 0} | Live: ${liveCount}`);
    }
    console.log('');

    const sources = await Source.find().limit(3).select('name totalDownloads _id');
    console.log('=== SOURCES (stored vs live count) ===');
    for(const s of sources) {
      const liveCountDirect = await Download.countDocuments({sourceId: s._id});
      const albumIds = await Album.find({sourceId: s._id}).distinct('_id');
      const trackIds = await Track.find({sourceId: s._id}).distinct('_id');
      const liveCountWithRelated = await Download.countDocuments({
        $or: [
          {sourceId: s._id},
          {albumId: {$in: albumIds}},
          {trackId: {$in: trackIds}}
        ]
      });
      console.log(`${s.name} | Stored: ${s.totalDownloads || 0} | Direct: ${liveCountDirect} | With Related: ${liveCountWithRelated}`);
    }
    
    console.log('\n=== SAMPLE DOWNLOAD RECORDS ===');
    const sampleDownloads = await Download.find().limit(5).select('userId trackId albumId sourceId type createdAt');
    for(const d of sampleDownloads) {
      console.log(`Type: ${d.type} | Track: ${d.trackId || 'null'} | Album: ${d.albumId || 'null'} | Source: ${d.sourceId || 'null'} | Date: ${d.createdAt}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDownloads();
