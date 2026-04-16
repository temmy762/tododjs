/**
 * categorizeMashups.js
 *
 * Auto-detects the category and cleans the title of every Mashup record.
 *
 * Usage:
 *   node server/categorizeMashups.js              # live run (categorize + rename)
 *   node server/categorizeMashups.js --dry-run    # preview only, no DB writes
 *   node server/categorizeMashups.js --force      # re-process already-categorized
 *   node server/categorizeMashups.js --ai         # enable OpenAI fallback
 *   node server/categorizeMashups.js --dry-run --ai --force  # combine flags
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

// ─── Flags ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run') || args.includes('-d');
const FORCE   = args.includes('--force')   || args.includes('-f');
const USE_AI  = args.includes('--ai')      || args.includes('-a');

// ─── Mashup categories (must match MashupSettings.categories default) ─────────
const MASHUP_CATEGORIES = [
  'Reggaeton',
  'Old School Reggaeton',
  'Dembow',
  'Trap',
  'House',
  'EDM',
  'Afro House',
  'Remember',
  'International',
];

// ─── Keyword rules (most-specific first, first match wins) ────────────────────
const CATEGORY_RULES = [
  {
    category: 'Old School Reggaeton',
    keywords: [
      'old school reggaeton', 'old-school reggaeton', 'oldschool reggaeton',
      'reggaeton old school', 'reggaeton clasico', 'reggaeton clásico',
      'reggaeton viejo', 'golden era reggaeton', 'old school perreo',
      'reggaeton 2000', 'reggaeton 2001', 'reggaeton 2002', 'reggaeton 2003',
      'reggaeton 2004', 'reggaeton 2005',
    ],
  },
  {
    category: 'Dembow',
    keywords: ['dembow', 'dem bow'],
  },
  {
    category: 'Reggaeton',
    keywords: [
      'reggaeton', 'reggaetón', 'regueton', 'reguetón',
      'perreo', 'urbano latino', 'reggae urbano',
      'bad bunny', 'j balvin', 'maluma', 'karol g', 'anuel',
      'myke towers', 'jhay cortez', 'ozuna', 'rauw alejandro',
      'nicky jam', 'daddy yankee', 'don omar',
    ],
  },
  {
    category: 'Trap',
    keywords: [
      'trap', 'latin trap', 'trap latino', 'trap music', 'drill',
    ],
  },
  {
    category: 'Afro House',
    keywords: [
      'afro house', 'afrohouse', 'afro-house', 'afro tech',
      'afrobeat', 'afro beat', 'amapiano', 'tribal house', 'afro tribal',
    ],
  },
  {
    category: 'House',
    keywords: [
      'house music', 'tech house', 'deep house', 'progressive house',
      'funky house', 'disco house', 'vocal house', 'chicago house',
    ],
  },
  {
    category: 'EDM',
    keywords: [
      'edm', 'electro house', 'big room', 'dubstep', 'trance',
      'drum and bass', 'drum & bass', 'dnb', 'future bass',
      'hardstyle', 'techno', 'electronic dance',
    ],
  },
  {
    category: 'Remember',
    keywords: [
      'remember', 'throwback', 'retro', 'oldies', 'vintage',
      'nostalgia', '80s', '90s', "80's", "90's", 'clasicos', 'clásicos',
      'hits antiguos', 'old skool',
    ],
  },
  {
    category: 'International',
    keywords: [
      'hip hop', 'hip-hop', 'hiphop', 'r&b', 'rnb', 'rhythm and blues',
      'soul', 'funk', 'jazz', 'rock', 'indie', 'alternative', 'country',
      'folk', 'dance pop', 'latin pop', 'kpop', 'k-pop', 'reggae',
      'dancehall', 'bachata', 'salsa', 'merengue', 'cumbia',
    ],
  },
];

// ─── Words that should always be UPPERCASE in titles ─────────────────────────
const FORCE_UPPER = new Set(['DJ', 'BPM', 'EDM', 'ID', 'UK', 'USA', 'NYC', 'LA', 'EP', 'LP']);

// ─── Small words kept lowercase (unless first/last word) ─────────────────────
const LOWER_WORDS = new Set([
  'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'by', 'up',
  'de', 'del', 'la', 'el', 'en', 'y', 'e',
]);

/**
 * Keyword-based category detection from a combined text string.
 * Returns a MASHUP_CATEGORIES entry or null.
 */
function detectCategoryByKeyword(text) {
  const lower = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule.category;
    }
  }
  return null;
}

/**
 * Map a raw genre string (already stored on the mashup) to a mashup category.
 * Returns null if it maps to 'Others' or is not in the category list.
 */
function categoryFromGenre(genre) {
  if (!genre) return null;
  const g = genre.trim();
  if (MASHUP_CATEGORIES.includes(g)) return g;
  return null;
}

/**
 * Title Case a mashup title with music-aware rules.
 * - Replaces underscores with spaces
 * - Strips common filename artifacts
 * - Collapses whitespace
 * - Capitalises words correctly
 */
function cleanTitle(raw) {
  let t = raw
    .replace(/_/g, ' ')
    .replace(/\.(mp3|wav|flac|m4a|aiff|ogg)$/i, '')
    .replace(/\s*\(\s*\d+\s*\)\s*$/g, '')
    .replace(/\s*-?\s*copy$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const words = t.split(/\s+/);

  const cased = words.map((word, idx) => {
    const isFirst = idx === 0;
    const isLast  = idx === words.length - 1;

    // Strip just alphanumeric for lookup but keep punctuation on the word itself
    const core = word.replace(/[^a-zA-Z]/g, '');

    if (!core) return word; // punctuation-only token

    if (FORCE_UPPER.has(core.toUpperCase())) {
      return word.toUpperCase();
    }

    // "ft." / "feat." — keep lowercase except when first
    if (/^(ft\.?|feat\.?)$/i.test(word)) {
      return isFirst ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase();
    }

    if (!isFirst && !isLast && LOWER_WORDS.has(core.toLowerCase())) {
      return word.toLowerCase();
    }

    // Default: capitalise first letter, lowercase rest
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return cased.join(' ');
}

// ─── Minimal Mashup schema ────────────────────────────────────────────────────
const mashupSchema = new mongoose.Schema({}, { strict: false });
const Mashup = mongoose.model('Mashup', mashupSchema);

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n────────────────────────────────────────────');
  console.log('  Mashup Categorizer & Title Cleaner');
  console.log('────────────────────────────────────────────');
  if (DRY_RUN) console.log('  MODE: DRY RUN — no changes will be saved');
  if (FORCE)   console.log('  MODE: FORCE — re-processing all mashups');
  if (USE_AI)  console.log('  MODE: AI fallback enabled (OpenAI)');
  console.log('────────────────────────────────────────────\n');

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  // Fetch all mashups (or only uncategorized if not forced)
  const filter = FORCE
    ? {}
    : { $or: [{ category: { $exists: false } }, { category: null }, { category: '' }, { category: 'Reggaeton' }] };

  const mashups = await Mashup.find(filter).lean();

  if (mashups.length === 0) {
    console.log('No mashups to process. Use --force to re-process all.\n');
    await mongoose.disconnect();
    process.exit(0);
  }

  console.log(`Processing ${mashups.length} mashup(s)...\n`);

  // ── Stats ──
  const stats = {
    total:         mashups.length,
    categorized:   0,
    renamed:       0,
    usedKeyword:   0,
    usedGenre:     0,
    usedAI:        0,
    usedDefault:   0,
    skipped:       0,
    errors:        0,
  };

  const byCategory = {};
  MASHUP_CATEGORIES.forEach(c => (byCategory[c] = 0));

  for (let i = 0; i < mashups.length; i++) {
    const m = mashups[i];
    const label = `[${i + 1}/${mashups.length}]`;
    const combined = `${m.title || ''} ${m.artist || ''}`;

    let detectedCategory = null;
    let detectionSource  = '';

    // Tier 1a: keyword scan on title + artist
    const kwResult = detectCategoryByKeyword(combined);
    if (kwResult) {
      detectedCategory = kwResult;
      detectionSource  = 'keyword';
      stats.usedKeyword++;
    }

    // Tier 1b: use existing genre field
    if (!detectedCategory) {
      const genreResult = categoryFromGenre(m.genre);
      if (genreResult) {
        detectedCategory = genreResult;
        detectionSource  = 'genre-field';
        stats.usedGenre++;
      }
    }

    // Tier 2: OpenAI (opt-in — loaded dynamically to avoid crash when no API key)
    if (!detectedCategory && USE_AI) {
      try {
        const { detectGenreWithAI } = await import('./services/openai.js');
        const aiGenre = await detectGenreWithAI(m.title, m.artist);
        if (aiGenre) {
          const mapped = MASHUP_CATEGORIES.includes(aiGenre) ? aiGenre : null;
          if (mapped) {
            detectedCategory = mapped;
            detectionSource  = 'openai';
            stats.usedAI++;
          }
        }
        // Rate-limit: 150ms between AI calls
        await new Promise(r => setTimeout(r, 150));
      } catch (err) {
        console.error(`  ⚠ AI error for "${m.title}":`, err.message);
        stats.errors++;
      }
    }

    // Tier 3: fallback to 'Reggaeton' (main genre of this platform)
    if (!detectedCategory) {
      detectedCategory = 'Reggaeton';
      detectionSource  = 'default';
      stats.usedDefault++;
    }

    // Clean title
    const cleanedTitle = cleanTitle(m.title || '');
    const titleChanged    = cleanedTitle !== m.title;
    const categoryChanged = detectedCategory !== m.category;

    if (!titleChanged && !categoryChanged) {
      console.log(`${label} SKIP  "${m.title}" — no changes needed`);
      stats.skipped++;
      continue;
    }

    // Log what we're doing
    const changes = [];
    if (categoryChanged) changes.push(`category: "${m.category || 'none'}" → "${detectedCategory}" (${detectionSource})`);
    if (titleChanged)    changes.push(`title: "${m.title}" → "${cleanedTitle}"`);

    console.log(`${label} ${DRY_RUN ? 'PREVIEW' : 'UPDATE'} ${changes.join(' | ')}`);

    if (!DRY_RUN) {
      try {
        const update = {};
        if (categoryChanged) update.category = detectedCategory;
        if (titleChanged)    update.title    = cleanedTitle;

        await Mashup.updateOne({ _id: m._id }, { $set: update });

        if (categoryChanged) {
          stats.categorized++;
          byCategory[detectedCategory] = (byCategory[detectedCategory] || 0) + 1;
        }
        if (titleChanged) stats.renamed++;
      } catch (err) {
        console.error(`  ✗ Failed to update "${m.title}":`, err.message);
        stats.errors++;
      }
    } else {
      if (categoryChanged) {
        stats.categorized++;
        byCategory[detectedCategory] = (byCategory[detectedCategory] || 0) + 1;
      }
      if (titleChanged) stats.renamed++;
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('════════════════════════════════════════════');
  console.log(`  Total processed : ${stats.total}`);
  console.log(`  Categories set  : ${stats.categorized}`);
  console.log(`  Titles cleaned  : ${stats.renamed}`);
  console.log(`  Skipped         : ${stats.skipped}`);
  console.log(`  Errors          : ${stats.errors}`);
  console.log('\n  Detection breakdown:');
  console.log(`    keyword match  : ${stats.usedKeyword}`);
  console.log(`    genre field    : ${stats.usedGenre}`);
  console.log(`    openai         : ${stats.usedAI}`);
  console.log(`    default        : ${stats.usedDefault}`);
  console.log('\n  Category distribution:');
  for (const [cat, count] of Object.entries(byCategory)) {
    if (count > 0) console.log(`    ${cat.padEnd(22)}: ${count}`);
  }
  console.log('════════════════════════════════════════════');
  if (DRY_RUN) {
    console.log('\n  ⚡ Dry run complete — re-run without --dry-run to apply changes.');
  } else {
    console.log('\n  ✅ Done.');
  }
  console.log();

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('\n✗ Fatal error:', err.message);
  process.exit(1);
});
