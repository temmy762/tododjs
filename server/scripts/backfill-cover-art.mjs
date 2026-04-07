/**
 * backfill-cover-art.mjs
 *
 * Propagates cover art through the chain:
 *   Track.coverArtKey / Track.coverArt
 *     → Album.coverArtKey / Album.coverArt
 *       → Collection.thumbnail
 *
 * Skips documents that already have a coverArtKey set.
 *
 * Usage:
 *   node server/scripts/backfill-cover-art.mjs
 *   node server/scripts/backfill-cover-art.mjs --dry-run
 *   node server/scripts/backfill-cover-art.mjs --force   (overwrite existing covers)
 */

import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import Album      from '../models/Album.js';
import Track      from '../models/Track.js';
import Collection from '../models/Collection.js';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE   = process.argv.includes('--force');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');
  if (DRY_RUN) console.log('⚠️  DRY RUN — no writes\n');

  let albumsFixed = 0, albumsSkipped = 0, collectionsFixed = 0;

  // ── Step 1: Albums missing coverArtKey ────────────────────────────────────
  console.log('\n── Step 1: Albums ────────────────────────────────────────────');
  const albumFilter = FORCE
    ? {}
    : { $or: [{ coverArtKey: { $in: [null, ''] } }, { coverArtKey: { $exists: false } }] };

  const albums = await Album.find(albumFilter)
    .select('_id name coverArt coverArtKey')
    .lean();

  console.log(`Found ${albums.length} albums to process`);

  for (const album of albums) {
    // Find the best track cover for this album
    const track = await Track.findOne({
      albumId: album._id,
      $or: [{ coverArtKey: { $nin: [null, ''] } }, { coverArt: { $nin: [null, ''] } }]
    })
      .select('coverArt coverArtKey')
      .sort({ coverArtKey: -1 })
      .lean();

    if (!track) {
      console.log(`  ⚠ No track cover found: "${album.name}"`);
      albumsSkipped++;
      continue;
    }

    const newKey = track.coverArtKey || null;
    const newUrl = track.coverArt    || null;

    if (!newKey && !newUrl) { albumsSkipped++; continue; }

    console.log(`  ✅ Album "${album.name}" → key:${newKey ? 'YES' : 'no'} url:${newUrl ? 'YES' : 'no'}`);

    if (!DRY_RUN) {
      const update = {};
      if (newKey) update.coverArtKey = newKey;
      if (newUrl) update.coverArt    = newUrl;
      await Album.findByIdAndUpdate(album._id, update);
    }
    albumsFixed++;
  }

  // ── Step 2: Collections missing thumbnail ─────────────────────────────────
  console.log('\n── Step 2: Collections ───────────────────────────────────────');
  const colFilter = FORCE
    ? {}
    : { $or: [{ thumbnail: { $in: [null, ''] } }, { thumbnail: { $exists: false } }] };

  const collections = await Collection.find(colFilter)
    .select('_id name thumbnail')
    .lean();

  console.log(`Found ${collections.length} collections to process`);

  for (const col of collections) {
    // First try: find an album in this collection with a cover
    const album = await Album.findOne({
      collectionId: col._id,
      $or: [{ coverArtKey: { $nin: [null, ''] } }, { coverArt: { $nin: [null, ''] } }]
    })
      .select('coverArt coverArtKey name')
      .lean();

    let thumb = album?.coverArtKey || album?.coverArt || null;

    // Second try: find any track directly linked to this collection
    if (!thumb) {
      const track = await Track.findOne({
        collectionId: col._id,
        $or: [{ coverArtKey: { $nin: [null, ''] } }, { coverArt: { $nin: [null, ''] } }]
      })
        .select('coverArt coverArtKey')
        .sort({ coverArtKey: -1 })
        .lean();
      thumb = track?.coverArtKey || track?.coverArt || null;
    }

    if (!thumb) {
      console.log(`  ⚠ No cover found for collection "${col.name}" — flagging missingThumbnail`);
      if (!DRY_RUN) {
        await Collection.findByIdAndUpdate(col._id, { missingThumbnail: true });
      }
      continue;
    }

    console.log(`  ✅ Collection "${col.name}" → ${thumb.substring(0, 60)}…`);

    if (!DRY_RUN) {
      await Collection.findByIdAndUpdate(col._id, { thumbnail: thumb, missingThumbnail: false });
    }
    collectionsFixed++;
  }

  console.log(`\n${'─'.repeat(55)}`);
  if (DRY_RUN) {
    console.log(`DRY RUN — would fix ${albumsFixed} albums, ${collectionsFixed} collections`);
  } else {
    console.log(`Done! Albums fixed: ${albumsFixed} | skipped: ${albumsSkipped} | Collections fixed: ${collectionsFixed}`);
  }

  await mongoose.disconnect();
  console.log('✅ Disconnected');
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  mongoose.disconnect();
  process.exit(1);
});
