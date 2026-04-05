/**
 * recategorize-tracks.mjs
 *
 * Re-runs category detection on every track in the database and assigns
 * the best matching category from the active Category list.
 *
 * Tracks with categoryVerified=true are skipped (manually confirmed).
 *
 * Usage:
 *   node scripts/recategorize-tracks.mjs            # update all unverified tracks
 *   node scripts/recategorize-tracks.mjs --dry-run  # preview only, no DB writes
 *   node scripts/recategorize-tracks.mjs --all      # include verified tracks too
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Track from '../models/Track.js';
import Album from '../models/Album.js';
import Category from '../models/Category.js';
import { detectCategory } from '../services/categoryDetection.js';

const DRY_RUN  = process.argv.includes('--dry-run');
const ALL      = process.argv.includes('--all');
const BATCH    = 500; // tracks per bulkWrite batch

// ─── helpers ─────────────────────────────────────────────────────────────────

const pad = (n, w = 6) => String(n).padStart(w, ' ');

function bar(done, total, width = 30) {
  const pct   = total ? Math.round((done / total) * width) : 0;
  return `[${'█'.repeat(pct)}${'░'.repeat(width - pct)}] ${done}/${total}`;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error('❌  MONGO_URI env variable is not set.');
    process.exit(1);
  }

  console.log('🔌  Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected.\n');

  // Load active categories
  const categories = await Category.find({ isActive: true }).select('name').lean();
  const knownNames = categories.map(c => c.name);
  console.log(`📂  Loaded ${knownNames.length} active categories: ${knownNames.join(', ')}\n`);

  if (DRY_RUN)  console.log('🔍  DRY RUN — no changes will be written.\n');
  if (ALL)      console.log('⚠️   --all flag: verified tracks will also be re-evaluated.\n');

  // Build a map of albumId → album name for quick lookup
  console.log('📀  Loading album names…');
  const albums = await Album.find({}).select('name').lean();
  const albumMap = new Map(albums.map(a => [a._id.toString(), a.name]));
  console.log(`    ${albumMap.size} albums indexed.\n`);

  // Query scope
  const query = ALL ? {} : { categoryVerified: { $ne: true } };
  const total = await Track.countDocuments(query);
  console.log(`🎵  ${total} tracks to process${ALL ? '' : ' (unverified only)'}.\n`);

  if (total === 0) {
    console.log('Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  // Counters
  let assigned   = 0;  // matched to a known category
  let others     = 0;  // fell through to Others
  let skipped    = 0;  // no change needed
  let processed  = 0;

  const catCounts = {};   // category → count
  const rawLabels = {};   // raw detected label (unmatched) → count

  let ops = [];

  const flush = async () => {
    if (ops.length === 0) return;
    if (!DRY_RUN) {
      await Track.bulkWrite(ops, { ordered: false });
    }
    ops = [];
  };

  // Stream tracks in pages
  let skip = 0;
  while (skip < total) {
    const tracks = await Track.find(query)
      .select('title artist albumId category categoryRaw categoryVerified')
      .skip(skip)
      .limit(BATCH)
      .lean();

    for (const track of tracks) {
      const albumName = albumMap.get(track.albumId?.toString()) || '';
      const result    = detectCategory(track.title, albumName, knownNames);

      const sameCategory = track.category === result.category;
      const sameRaw      = track.categoryRaw === result.raw;

      if (sameCategory && sameRaw) {
        skipped++;
      } else {
        ops.push({
          updateOne: {
            filter: { _id: track._id },
            update: {
              $set: {
                category:    result.category,
                categoryRaw: result.raw,
              }
            }
          }
        });

        if (result.category !== 'Others') {
          assigned++;
          catCounts[result.category] = (catCounts[result.category] || 0) + 1;
        } else {
          others++;
          if (result.raw) {
            rawLabels[result.raw] = (rawLabels[result.raw] || 0) + 1;
          }
        }
      }

      processed++;
    }

    await flush();
    process.stdout.write(`\r  ${bar(processed, total)}  `);
    skip += BATCH;
  }

  await flush();
  console.log('\n');

  // ─── Report ───────────────────────────────────────────────────────────────
  console.log('═'.repeat(55));
  console.log('  RESULTS');
  console.log('═'.repeat(55));
  console.log(`  Total processed : ${pad(processed)}`);
  console.log(`  Assigned        : ${pad(assigned)}  (matched a known category)`);
  console.log(`  Others          : ${pad(others)}   (no category match)`);
  console.log(`  Unchanged       : ${pad(skipped)}  (already correct)`);
  console.log('─'.repeat(55));

  if (Object.keys(catCounts).length) {
    console.log('\n  Assignments by category:');
    Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, n]) => console.log(`    ${pad(n)}  ${name}`));
  }

  if (Object.keys(rawLabels).length) {
    console.log('\n  Unmatched raw labels (consider adding as categories):');
    Object.entries(rawLabels)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .forEach(([label, n]) => console.log(`    ${pad(n)}  ${label}`));
  }

  console.log('═'.repeat(55));
  if (DRY_RUN) console.log('\n  ⚠️  DRY RUN — no changes were written to the database.');
  else         console.log(`\n  ✅  Done. ${assigned + others} tracks updated.`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌  Fatal error:', err.message);
  process.exit(1);
});
