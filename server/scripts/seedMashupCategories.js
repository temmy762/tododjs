/**
 * Seed MashupCategory from the Category collection.
 * Run this once to populate the MashupCategory collection so the
 * Live Mashups category filter bar works immediately.
 *
 * Usage (from project root):
 *   node server/scripts/seedMashupCategories.js [--dry-run]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const DRY_RUN = process.argv.includes('--dry-run');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const { default: Category }       = await import('../models/Category.js');
  const { default: MashupCategory } = await import('../models/MashupCategory.js');

  const existing = await MashupCategory.countDocuments();
  if (existing > 0 && !process.argv.includes('--force')) {
    console.log(`MashupCategory already has ${existing} documents. Use --force to re-seed.`);
    await mongoose.disconnect();
    return;
  }

  const categories = await Category.find({ isActive: true }).sort('sortOrder name').lean();
  console.log(`Found ${categories.length} categories to seed (dry-run: ${DRY_RUN})`);

  let created = 0;
  for (const [i, cat] of categories.entries()) {
    console.log(`  [${i + 1}] "${cat.name}" (color: ${cat.color || 'none'})`);
    if (!DRY_RUN) {
      await MashupCategory.updateOne(
        { name: cat.name },
        {
          $setOnInsert: {
            name:        cat.name,
            description: cat.description || '',
            color:       cat.color       || '#7C3AED',
            thumbnail:   cat.thumbnail   || null,
            sortOrder:   cat.sortOrder   ?? i,
            isActive:    true,
          }
        },
        { upsert: true }
      );
      created++;
    }
  }

  console.log(`\nDone. Seeded: ${created} mashup categories.`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
