/**
 * backfill-source-ids.mjs
 *
 * Backfills sourceId on Album and Track documents that were created from
 * Collections which have a sourceId, but the albums/tracks never inherited it.
 *
 * This was caused by a bug in processCollectionAsync where Album.create and
 * Track.create did not receive collection.sourceId.
 *
 * Usage (run from server/ directory):
 *   node scripts/backfill-source-ids.mjs [--dry-run]
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error('❌  MONGO_URI / MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected to MongoDB\n');

  const Collection = (await import('../models/Collection.js')).default;
  const Album      = (await import('../models/Album.js')).default;
  const Track      = (await import('../models/Track.js')).default;

  // Find all collections that have a sourceId
  const collections = await Collection.find({
    sourceId: { $exists: true, $ne: null }
  }).select('_id name sourceId').lean();

  console.log(`📦  Found ${collections.length} collection(s) with a sourceId\n`);

  let albumsFixed = 0;
  let tracksFixed = 0;

  for (const col of collections) {
    const colId    = col._id;
    const sourceId = col.sourceId;

    // Albums from this collection with no sourceId
    const albumFilter = { collectionId: colId, sourceId: { $exists: false } };
    const albumCount  = await Album.countDocuments(albumFilter);

    // Tracks from this collection with no sourceId
    const trackFilter = { collectionId: colId, sourceId: { $exists: false } };
    const trackCount  = await Track.countDocuments(trackFilter);

    if (albumCount === 0 && trackCount === 0) {
      console.log(`  ✓  "${col.name}" — already correct`);
      continue;
    }

    console.log(`  ✏️  "${col.name}" — fixing ${albumCount} album(s), ${trackCount} track(s)`);

    if (!DRY_RUN) {
      if (albumCount > 0) {
        await Album.updateMany(albumFilter, { $set: { sourceId } });
        albumsFixed += albumCount;
      }
      if (trackCount > 0) {
        await Track.updateMany(trackFilter, { $set: { sourceId } });
        tracksFixed += trackCount;
      }
    } else {
      albumsFixed += albumCount;
      tracksFixed += trackCount;
    }
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Collections checked : ${collections.length}`);
  console.log(`  Albums fixed        : ${albumsFixed}${DRY_RUN ? ' (dry-run)' : ''}`);
  console.log(`  Tracks fixed        : ${tracksFixed}${DRY_RUN ? ' (dry-run)' : ''}`);
  console.log('═══════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('🔌  Disconnected');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
