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

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌  MONGODB_URI is not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅  Connected to MongoDB');

  const Track = (await import('../models/Track.js')).default;

  const draftTracks = await Track.find({ status: 'draft' }).lean();
  console.log(`🎵  Found ${draftTracks.length} draft tracks`);

  let eligible = 0;
  let published = 0;
  let skipped   = 0;

  for (const doc of draftTracks) {
    const hasAll =
      doc.artist &&
      doc.genre &&
      doc.bpm &&
      doc.tonality?.camelot &&
      doc.audioFile?.url;

    if (!hasAll) {
      skipped++;
      continue;
    }

    eligible++;

    if (DRY_RUN) {
      console.log(`  [DRY] Would publish: "${doc.title}" (${doc._id})`);
      continue;
    }

    try {
      const track = await Track.findById(doc._id);
      track.status = undefined;   // let the pre-save hook decide
      // Force the hook to re-evaluate by momentarily resetting status
      track.set('status', 'draft');
      // The pre-save hook will promote it if metadata is complete
      await track.save();

      const reloaded = await Track.findById(doc._id).select('status');
      if (reloaded.status === 'published') {
        published++;
        console.log(`  ✅  Published: "${doc.title}"`);
      } else {
        console.log(`  ⚠️   Still draft: "${doc.title}" — check hook logic`);
      }
    } catch (err) {
      console.error(`  ❌  Error saving "${doc.title}":`, err.message);
    }
  }

  console.log('\n─── Summary ───────────────────────────────────');
  console.log(`  Total draft tracks  : ${draftTracks.length}`);
  console.log(`  Eligible to publish : ${eligible}`);
  console.log(`  Missing metadata    : ${skipped}`);
  if (!DRY_RUN) {
    console.log(`  Published           : ${published}`);
  } else {
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
