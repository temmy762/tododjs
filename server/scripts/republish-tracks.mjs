/**
 * republish-tracks.mjs
 *
 * Re-saves all draft tracks that have the minimum required metadata so the
 * pre-save hook can promote them to 'published'.
 *
 * Required: artist, genre, bpm, tonality.camelot, audioFile.url
 *
 * Usage:
 *   node server/scripts/republish-tracks.mjs [--dry-run]
 *
 * Options:
 *   --dry-run   Report what would change without saving
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error('❌  MONGO_URI / MONGODB_URI is not set in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected to MongoDB');

  const Track = (await import('../models/Track.js')).default;

  const draftTracks = await Track.find({ status: 'draft' }).lean();
  console.log(`🎵  Found ${draftTracks.length} draft tracks`);

  // Count eligible tracks (have artist, genre, bpm, tonality.camelot, audioFile.url)
  const eligibleQuery = {
    status: 'draft',
    artist:             { $exists: true, $ne: '' },
    genre:              { $exists: true, $ne: '' },
    bpm:                { $exists: true, $ne: null },
    'tonality.camelot': { $exists: true, $ne: '' },
    'audioFile.url':    { $exists: true, $ne: '' }
  };

  const eligibleCount = await Track.countDocuments(eligibleQuery);
  const skippedCount  = draftTracks.length - eligibleCount;

  if (DRY_RUN) {
    console.log(`  [DRY] Would publish : ${eligibleCount} tracks`);
    console.log(`  [DRY] Missing data  : ${skippedCount} tracks (no publish)`);
  } else {
    const result = await Track.updateMany(eligibleQuery, { $set: { status: 'published' } });
    console.log(`  ✅  Published       : ${result.modifiedCount} tracks`);
  }

  console.log('\n─── Summary ───────────────────────────────────');
  console.log(`  Total draft tracks  : ${draftTracks.length}`);
  console.log(`  Eligible to publish : ${eligibleCount}`);
  console.log(`  Missing metadata    : ${skippedCount}`);
  if (DRY_RUN) {
    console.log('  (dry-run — nothing saved)');
  }
  console.log('───────────────────────────────────────────────');

  await mongoose.disconnect();
  console.log('🔌  Disconnected');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
