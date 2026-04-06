/**
 * recount-source-albums.mjs
 *
 * Recalculates totalAlbums and totalTracks for every Source document
 * by counting actual Album and Track documents in the DB.
 * Fixes stale counters caused by direct DB writes or failed increments.
 *
 * Usage (run from server/ directory):
 *   node scripts/recount-source-albums.mjs [--dry-run]
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

  const Source = (await import('../models/Source.js')).default;
  const Album  = (await import('../models/Album.js')).default;
  const Track  = (await import('../models/Track.js')).default;

  // Aggregate album counts per sourceId
  const albumCounts = await Album.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$sourceId', albumCount: { $sum: 1 } } }
  ]);

  // Aggregate track counts per sourceId
  const trackCounts = await Track.aggregate([
    { $match: { status: 'published' } },
    { $group: { _id: '$sourceId', trackCount: { $sum: 1 } } }
  ]);

  const albumMap = Object.fromEntries(albumCounts.map(r => [String(r._id), r.albumCount]));
  const trackMap = Object.fromEntries(trackCounts.map(r => [String(r._id), r.trackCount]));

  const sources = await Source.find({ isActive: true }).lean();

  console.log(`🏷  Found ${sources.length} active source(s)\n`);

  let updated = 0;
  let unchanged = 0;

  for (const src of sources) {
    const id = String(src._id);
    const correctAlbums = albumMap[id] || 0;
    const correctTracks = trackMap[id] || 0;

    const albumDiff = correctAlbums - (src.totalAlbums || 0);
    const trackDiff = correctTracks - (src.totalTracks || 0);

    const marker = (albumDiff !== 0 || trackDiff !== 0) ? '✏️ ' : '✓ ';
    console.log(
      `  ${marker} "${src.name}" — albums: ${src.totalAlbums || 0} → ${correctAlbums}` +
      (albumDiff !== 0 ? ` (${albumDiff > 0 ? '+' : ''}${albumDiff})` : '') +
      `  |  tracks: ${src.totalTracks || 0} → ${correctTracks}` +
      (trackDiff !== 0 ? ` (${trackDiff > 0 ? '+' : ''}${trackDiff})` : '')
    );

    if (albumDiff === 0 && trackDiff === 0) {
      unchanged++;
      continue;
    }

    if (!DRY_RUN) {
      await Source.updateOne(
        { _id: src._id },
        { $set: { totalAlbums: correctAlbums, totalTracks: correctTracks } }
      );
    }
    updated++;
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Sources checked : ${sources.length}`);
  console.log(`  Updated         : ${updated}${DRY_RUN ? ' (dry-run)' : ''}`);
  console.log(`  Already correct : ${unchanged}`);
  console.log('═══════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('🔌  Disconnected');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
