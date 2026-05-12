/**
 * Seed MashupCategory with 9 independent music-genre categories.
 * These are SEPARATE from Record Pool categories (pool brands).
 *
 * Usage (from project root):
 *   node server/scripts/seedMashupCategories.js [--dry-run] [--force]
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
const FORCE   = process.argv.includes('--force');

const DEFAULT_MASHUP_CATEGORIES = [
  { name: 'Reggaeton',            color: '#FF6B6B', sortOrder: 0 },
  { name: 'Old School Reggaeton', color: '#FF9B4A', sortOrder: 1 },
  { name: 'Dembow',               color: '#FFE066', sortOrder: 2 },
  { name: 'Trap',                 color: '#C86BFA', sortOrder: 3 },
  { name: 'House',                color: '#4DD8FF', sortOrder: 4 },
  { name: 'EDM',                  color: '#86F0B0', sortOrder: 5 },
  { name: 'Afro House',           color: '#F59E0B', sortOrder: 6 },
  { name: 'Remember',             color: '#6366F1', sortOrder: 7 },
  { name: 'International',        color: '#10B981', sortOrder: 8 },
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const { default: MashupCategory } = await import('../models/MashupCategory.js');

  const existing = await MashupCategory.countDocuments();
  if (existing > 0 && !FORCE) {
    console.log(`MashupCategory already has ${existing} documents. Use --force to re-seed.`);
    await mongoose.disconnect();
    return;
  }

  console.log(`Seeding ${DEFAULT_MASHUP_CATEGORIES.length} mashup genre categories (dry-run: ${DRY_RUN})`);

  if (!DRY_RUN) {
    // Remove any docs with null slug left from a failed prior run
    await MashupCategory.deleteMany({ slug: null });
  }

  let created = 0;
  for (const cat of DEFAULT_MASHUP_CATEGORIES) {
    console.log(`  "${cat.name}" (${cat.color})`);
    if (!DRY_RUN) {
      const exists = await MashupCategory.findOne({ name: cat.name });
      if (!exists) {
        // Use save() so the pre-validate hook generates the slug
        await new MashupCategory({ ...cat, isActive: true }).save();
        created++;
      } else {
        // Patch null slugs on existing docs
        if (!exists.slug) {
          exists.name = cat.name; // triggers isModified('name') in pre-validate
          await exists.save();
        }
      }
    }
  }

  console.log(`\nDone. Seeded: ${created} mashup genre categories.`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
