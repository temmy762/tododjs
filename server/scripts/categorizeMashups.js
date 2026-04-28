/**
 * Bulk mashup categorizer + title cleaner
 *
 * Usage:
 *   node server/scripts/categorizeMashups.js             # dry-run (preview only)
 *   node server/scripts/categorizeMashups.js --apply     # write changes to DB
 *   node server/scripts/categorizeMashups.js --apply --force   # re-process every mashup
 *
 * What it does:
 *  1. Scans all mashup titles and extracts the pool-brand category
 *     e.g. "Gasolina (Latin Box Remix)" → category: "Latin Box"
 *  2. Cleans up titles (removes underscores, filename artifacts, applies Title Case)
 *  3. Sets tonalityNeedsReview = true on mashups that have no tonality set
 *  4. Prints a per-mashup change report and a summary
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Mashup from '../models/Mashup.js';
import { detectCategoryAsync } from '../services/categoryDetection.js';

// ─── CLI flags ────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const APPLY    = args.includes('--apply');
const FORCE    = args.includes('--force');
const DRY_RUN  = !APPLY;

// ─── Title cleaner (mirrors mashupController) ─────────────────────────────────
const FORCE_UPPER = new Set(['DJ', 'BPM', 'EDM', 'EP', 'LP']);
const LOWER_WORDS = new Set(['a','an','the','of','in','on','at','to','by','de','del','la','el','y','e']);

function cleanMashupTitle(raw) {
  let t = (raw || '')
    .replace(/_/g, ' ')
    .replace(/\.(mp3|wav|flac|m4a)$/i, '')
    .replace(/\s*\(\s*\d+\s*\)\s*$/g, '')
    .replace(/\s*-?\s*copy$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const words = t.split(/\s+/);
  return words.map((word, idx) => {
    const core = word.replace(/[^a-zA-Z]/g, '');
    if (!core) return word;
    if (FORCE_UPPER.has(core.toUpperCase())) return word.toUpperCase();
    if (/^(ft\.?|feat\.?)$/i.test(word)) return idx === 0 ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase();
    if (idx !== 0 && idx !== words.length - 1 && LOWER_WORDS.has(core.toLowerCase())) return word.toLowerCase();
    return word[0].toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

// ─── Old genre-style categories that should be re-detected ───────────────────
const OLD_GENRE_CATS = new Set([
  'Reggaeton','Old School Reggaeton','Dembow','Trap',
  'House','EDM','Afro House','Remember','International'
]);

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log(`║  Mashup Auto-Categorizer  [${APPLY ? 'APPLY' : 'DRY-RUN'}${FORCE ? ' + FORCE' : ''}]${' '.repeat(APPLY ? 12 : 13 - (FORCE ? 8 : 0))}║`);
  console.log('╚══════════════════════════════════════════════╝\n');

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ MongoDB connected\n');

  const filter = FORCE
    ? {}
    : {
        $or: [
          { category: { $exists: false } },
          { category: null },
          { category: '' },
          { category: { $in: [...OLD_GENRE_CATS] } },
        ]
      };

  const mashups = await Mashup.find(filter).lean();
  console.log(`→ Found ${mashups.length} mashup(s) to process (${FORCE ? 'all' : 'uncategorized / old-genre'})\n`);

  const changed  = [];
  const skipped  = [];
  let   updated  = 0;

  for (const m of mashups) {
    const newTitle = cleanMashupTitle(m.title);
    const { category: newCat, raw: catRaw } = await detectCategoryAsync(newTitle, null);

    const titleChanged    = newTitle !== m.title;
    const categoryChanged = newCat   !== m.category;
    const needsReviewFix  = !m.tonality && !m.tonalityNeedsReview;

    if (!titleChanged && !categoryChanged && !needsReviewFix) {
      skipped.push(m.title);
      continue;
    }

    const entry = {
      id:            m._id,
      oldTitle:      m.title,
      newTitle,
      oldCategory:   m.category || 'none',
      newCategory:   newCat,
      raw:           catRaw,
      titleChanged,
      categoryChanged,
      needsReviewFix,
    };
    changed.push(entry);

    if (!DRY_RUN) {
      const update = {};
      if (titleChanged)    update.title       = newTitle;
      if (categoryChanged) { update.category  = newCat; update.categoryRaw = catRaw; }
      if (needsReviewFix)  update.tonalityNeedsReview = true;
      await Mashup.updateOne({ _id: m._id }, { $set: update });
      updated++;
    }
  }

  // ─── Report ───────────────────────────────────────────────────────────────
  if (changed.length === 0) {
    console.log('✅  All mashups are already categorized correctly — nothing to change.\n');
  } else {
    console.log(`${'Title'.padEnd(55)} ${'Old Cat'.padEnd(20)} → New Cat`);
    console.log('─'.repeat(100));
    for (const e of changed) {
      const titleCol   = e.titleChanged
        ? `${e.oldTitle.slice(0, 25).padEnd(26)} → ${e.newTitle.slice(0, 26)}`
        : e.newTitle.slice(0, 53).padEnd(53);
      const catChange  = e.categoryChanged
        ? `${(e.oldCategory).slice(0, 18).padEnd(20)} → ${e.newCategory}`
        : '(no cat change)';
      const flags = [
        e.titleChanged    ? '✎' : '',
        e.categoryChanged ? '⊕' : '',
        e.needsReviewFix  ? '⚠' : '',
      ].filter(Boolean).join('');
      console.log(`${titleCol.padEnd(55)} ${catChange}  ${flags}`);
    }
    console.log('─'.repeat(100));
  }

  // ─── Category breakdown ───────────────────────────────────────────────────
  const byCategory = {};
  for (const e of changed) {
    byCategory[e.newCategory] = (byCategory[e.newCategory] || 0) + 1;
  }
  console.log('\n📊  Category breakdown for changed mashups:');
  for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${cat.padEnd(25)} ${count}`);
  }

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────');
  console.log(`  Scanned   : ${mashups.length}`);
  console.log(`  Changed   : ${changed.length}`);
  console.log(`  Skipped   : ${skipped.length}`);
  if (APPLY)   console.log(`  Updated   : ${updated}  ← written to DB`);
  if (DRY_RUN) console.log('\n  ℹ  DRY-RUN — no changes written. Re-run with --apply to save.');
  console.log('─────────────────────────────────────────\n');

  await mongoose.disconnect();
  console.log('✓ Done\n');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
