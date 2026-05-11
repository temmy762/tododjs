/**
 * Migration: backfill category on existing albums + their tracks
 *
 * Usage (from project root):
 *   node server/scripts/migrateAlbumCategories.js [--dry-run]
 *
 * What it does:
 *  1. Finds all albums where category is null, '', or 'Premium Pack' (i.e. never properly detected)
 *  2. Runs detectCategoryAsync against the album name
 *  3. If a real category is found (not 'Others'), updates album + all its tracks
 *  4. Stats are printed at the end
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Try server/.env first, fall back to project root .env
dotenv.config({ path: path.join(__dirname, '../.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const { default: Album }   = await import('../models/Album.js');
  const { default: Track }   = await import('../models/Track.js');
  const { default: Category } = await import('../models/Category.js');
  const { detectCategoryAsync } = await import('../services/categoryDetection.js');

  // Resolve the actual fallback category name from the DB
  const fallbackCat = await Category.findOne({
    $or: [
      { slug: 'premium-pack' },
      { name: /^(premium\s*pack|pack\s*premium)$/i }
    ]
  }).lean();
  const FALLBACK_CATEGORY = fallbackCat?.name || 'Premium Pack';
  console.log(`Fallback category: "${FALLBACK_CATEGORY}"`);

  const albums = await Album.find({
    $or: [
      { category: { $in: [null, '', 'Premium Pack'] } },
      { category: { $exists: false } }
    ]
  }).select('_id name category').lean();

  console.log(`Found ${albums.length} albums to process (dry-run: ${DRY_RUN})`);

  let updated = 0;
  let skipped = 0;

  for (const album of albums) {
    const result = await detectCategoryAsync(null, album.name);
    const noMatch = !result.category || result.category === 'Others' || result.category === 'Premium Pack';
    const finalCategory = noMatch ? FALLBACK_CATEGORY : result.category;
    const finalRaw      = noMatch ? null : (result.raw || null);

    if (noMatch) {
      skipped++;
    } else {
      console.log(`  "${album.name}" → ${finalCategory} (raw: "${finalRaw}")`);
      updated++;
    }

    if (!DRY_RUN) {
      await Album.updateOne({ _id: album._id }, {
        $set: { category: finalCategory, categoryRaw: finalRaw }
      });
      await Track.updateMany({ albumId: album._id }, {
        $set: { category: finalCategory, categoryRaw: finalRaw }
      });
    }
  }

  console.log(`\nDone. Categorized: ${updated}, Set to Premium Pack (fallback): ${skipped}`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
