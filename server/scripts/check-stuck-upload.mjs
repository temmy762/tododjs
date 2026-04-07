/**
 * check-stuck-upload.mjs
 * Diagnose and optionally reset a stuck collection upload.
 * Usage:
 *   node server/scripts/check-stuck-upload.mjs            -- show stuck collections
 *   node server/scripts/check-stuck-upload.mjs --reset    -- mark stuck as failed so admin can re-upload
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import Collection from '../models/Collection.js';

const RESET = process.argv.includes('--reset');
// Consider a collection "stuck" if it has been processing for > 1 hour
const STUCK_THRESHOLD_MS = 60 * 60 * 1000;

await mongoose.connect(process.env.MONGODB_URI);
console.log('✅ Connected\n');

const now = new Date();
// Find ALL in-flight collections (no time filter — stuck check is just for display)
const stuckCols = await Collection.find({
  status: { $in: ['processing', 'uploading', 'pending', 'queued'] },
}).select('_id name status processingProgress createdAt updatedAt').lean();

if (stuckCols.length === 0) {
  console.log('✅ No stuck collections found.');
} else {
  console.log(`Found ${stuckCols.length} stuck collection(s):\n`);
  for (const col of stuckCols) {
    const stuckMins = Math.round((now - new Date(col.updatedAt)) / 60000);
    console.log(`  📦 "${col.name}"`);
    console.log(`     status:   ${col.status} | progress: ${col.processingProgress ?? 0}%`);
    console.log(`     created:  ${col.createdAt}`);
    console.log(`     updated:  ${col.updatedAt} (${stuckMins} min ago)`);
    console.log(`     _id:      ${col._id}\n`);

    if (RESET) {
      await Collection.findByIdAndUpdate(col._id, {
        status: 'failed',
        processingProgress: 0,
      });
      console.log(`     ♻️  Reset to "failed" — admin can re-upload.\n`);
    }
  }
}

await mongoose.disconnect();
console.log('✅ Done');
process.exit(0);
