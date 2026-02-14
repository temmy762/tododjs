import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const downloadSchema = new mongoose.Schema({}, {strict: false});
const trackSchema = new mongoose.Schema({}, {strict: false});
const albumSchema = new mongoose.Schema({}, {strict: false});

const Download = mongoose.model('Download', downloadSchema);
const Track = mongoose.model('Track', trackSchema);
const Album = mongoose.model('Album', albumSchema);

async function updateDownloadRecords() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Find downloads with trackId but no sourceId
    const downloadsToFix = await Download.find({
      trackId: { $ne: null },
      $or: [
        { sourceId: null },
        { sourceId: { $exists: false } }
      ]
    });

    console.log(`Found ${downloadsToFix.length} download records with trackId but no sourceId`);

    let updated = 0;
    for (const dl of downloadsToFix) {
      const track = await Track.findById(dl.trackId).select('sourceId albumId');
      if (track && track.sourceId) {
        dl.sourceId = track.sourceId;
        if (!dl.albumId && track.albumId) {
          dl.albumId = track.albumId;
        }
        await dl.save();
        updated++;
      }
    }

    console.log(`✓ Updated ${updated} download records with sourceId from their tracks`);

    // Find downloads with albumId but no sourceId
    const albumDownloadsToFix = await Download.find({
      albumId: { $ne: null },
      $or: [
        { sourceId: null },
        { sourceId: { $exists: false } }
      ]
    });

    console.log(`\nFound ${albumDownloadsToFix.length} download records with albumId but no sourceId`);

    let albumUpdated = 0;
    for (const dl of albumDownloadsToFix) {
      const album = await Album.findById(dl.albumId).select('sourceId');
      if (album && album.sourceId) {
        dl.sourceId = album.sourceId;
        await dl.save();
        albumUpdated++;
      }
    }

    console.log(`✓ Updated ${albumUpdated} download records with sourceId from their albums`);

    await mongoose.disconnect();
    console.log('\n✓ All download records updated');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateDownloadRecords();
