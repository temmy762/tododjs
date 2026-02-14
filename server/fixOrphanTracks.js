import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const trackSchema = new mongoose.Schema({}, {strict: false});
const sourceSchema = new mongoose.Schema({}, {strict: false});
const albumSchema = new mongoose.Schema({}, {strict: false});

const Track = mongoose.model('Track', trackSchema);
const Source = mongoose.model('Source', sourceSchema);
const Album = mongoose.model('Album', albumSchema);

async function fixOrphanTracks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get all sources
    const sources = await Source.find().select('name _id year');
    console.log('=== AVAILABLE SOURCES ===');
    sources.forEach((s, i) => {
      console.log(`${i + 1}. ${s.name} (${s.year}) - ID: ${s._id}`);
    });
    console.log('');

    // Get orphan tracks
    const orphanTracks = await Track.find({
      $or: [
        { sourceId: null },
        { sourceId: { $exists: false } }
      ]
    }).select('title artist genre createdAt _id');

    console.log(`Found ${orphanTracks.length} orphan tracks\n`);

    // Check if there are albums these tracks might belong to
    const albumsWithTracks = await Album.find({ isActive: true })
      .select('name sourceId trackCount _id');

    console.log('=== ALBUMS WITH SOURCES ===');
    for(const album of albumsWithTracks) {
      const tracksInAlbum = await Track.countDocuments({ albumId: album._id });
      const source = album.sourceId ? await Source.findById(album.sourceId).select('name') : null;
      console.log(`${album.name} (${tracksInAlbum} tracks) -> Source: ${source?.name || 'NO SOURCE'} (${album.sourceId || 'null'})`);
    }
    console.log('');

    // Find the most recent source (likely the correct one for recent orphan tracks)
    const recentSource = sources.sort((a, b) => b.year - a.year)[0];
    console.log(`Most recent source: ${recentSource.name} (${recentSource.year})`);
    console.log(`Suggested: Assign all orphan tracks to this source? (ID: ${recentSource._id})`);
    console.log('');

    // Show sample orphan tracks
    console.log('=== SAMPLE ORPHAN TRACKS (first 10) ===');
    orphanTracks.slice(0, 10).forEach(t => {
      console.log(`- ${t.title} by ${t.artist} (Created: ${t.createdAt})`);
    });

    await mongoose.disconnect();
    console.log('\n✓ Analysis complete. Ready to assign tracks.');
    console.log('Run: node assignOrphanTracks.js <sourceId> to assign all orphan tracks to a source');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixOrphanTracks();
