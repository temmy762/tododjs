/**
 * Category Detection Service
 *
 * Extracts a "record pool category" tag from a track title or album name.
 * Example: "Gasolina (Latin Box Remix)" → "Latin Box"
 *
 * This is separate from genre — category is the curatorial brand/pool label
 * (e.g., Latin Box, DJ City, BPM Supreme, Heavy Hits) that the remix was
 * produced for. Admins manage the valid category list; this service does the
 * text extraction.
 */

// Version suffixes that appear AFTER the category name in parentheses
const VERSION_SUFFIX_RE = /remix|edit|version|mix|re[-\s]?edit|re[-\s]?mix|extended|intro|outro|clean|dirty|acapella|instrumental|mashup|bootleg|redrum|transition|quick[\s-]?hit/i;

// Full match pattern for parenthetical or bracket remix tags
// Captures the part BEFORE the version suffix
// e.g. "(Latin Box Remix)" → captures "Latin Box"
const PAREN_RE  = /\(([^)]+?)\s+(?:remix|edit|version|mix|re[-\s]?edit|re[-\s]?mix|extended|intro|outro|clean|dirty|acapella|instrumental|mashup|bootleg|redrum|transition|quick[\s-]?hit)[^)]*\)/gi;
const BRACKET_RE = /\[([^\]]+?)\s+(?:remix|edit|version|mix|re[-\s]?edit|re[-\s]?mix|extended|intro|outro|clean|dirty|acapella|instrumental|mashup|bootleg|redrum|transition|quick[\s-]?hit)[^\]]*\]/gi;

/**
 * Extract a raw category name from a track title.
 * Returns the first match or null.
 * @param {string} title
 * @returns {string|null}
 */
export function extractCategoryFromTitle(title) {
  if (!title) return null;

  const candidates = [];

  let m;
  const p = new RegExp(PAREN_RE.source, 'gi');
  while ((m = p.exec(title)) !== null) {
    candidates.push(m[1].trim());
  }

  const b = new RegExp(BRACKET_RE.source, 'gi');
  while ((m = b.exec(title)) !== null) {
    candidates.push(m[1].trim());
  }

  // Filter out very short or generic tags that are not category names
  const IGNORE = new Set(['dj', 'feat', 'ft', 'prod', 'intro', 'outro', 'clean', 'dirty', 'acapella', 'instrumental', 'extended', 'original', 'radio']);
  for (const c of candidates) {
    if (c.length < 2) continue;
    if (IGNORE.has(c.toLowerCase())) continue;
    return c;
  }

  return null;
}

/**
 * Derive a category from an album/folder name.
 * Album folders are often named exactly after the record pool, e.g.:
 *   "Latin Box", "Latin Box Pack", "Latin Box Vol.2", "Latin Box 2025"
 *
 * Strips trailing noise words to get the base category name.
 * @param {string} albumName
 * @returns {string|null}
 */
export function extractCategoryFromAlbumName(albumName) {
  if (!albumName) return null;
  // Strip trailing: Pack, Vol, Vol., Pt., Edition, 2024, 2025 etc.
  const cleaned = albumName
    .replace(/\s+(?:pack|vol\.?|volume|pt\.?|part|edition|series|\d{4}|\d+)[\s\d]*$/gi, '')
    .replace(/\s*\(.*\)\s*$/, '')
    .trim();
  if (cleaned.length < 2) return null;
  return cleaned;
}

/**
 * Match a raw detected string against the list of known category names.
 * Case-insensitive. Returns the canonical category name or null.
 * @param {string} raw
 * @param {string[]} knownNames  - array of Category.name values from DB
 * @returns {string|null}
 */
export function matchToKnownCategory(raw, knownNames) {
  if (!raw || !knownNames?.length) return null;
  const lower = raw.toLowerCase().trim();
  const match = knownNames.find(n => n.toLowerCase().trim() === lower);
  return match || null;
}

/**
 * Detect category from title + album, matching against a known list.
 * Returns a result object with the assigned category name, what was
 * extracted (raw), and where it came from (source).
 *
 * @param {string} title
 * @param {string} albumName
 * @param {string[]} knownNames  - category names from DB
 * @returns {{ category: string, raw: string|null, source: 'title'|'album'|'none' }}
 */
export function detectCategory(title, albumName, knownNames = []) {
  const fromTitle  = extractCategoryFromTitle(title);
  const fromAlbum  = extractCategoryFromAlbumName(albumName);
  const raw    = fromTitle || fromAlbum || null;
  const source = fromTitle ? 'title' : fromAlbum ? 'album' : 'none';

  if (!raw) return { category: 'Others', raw: null, source: 'none' };

  const matched = matchToKnownCategory(raw, knownNames);
  if (matched) return { category: matched, raw, source };

  // Raw string extracted but doesn't match any known category yet
  return { category: 'Others', raw, source };
}

// ─── Async variant with in-process category name cache ───────────────────────

let _categoryCache   = null;
let _categoryCacheTs = 0;
const CACHE_TTL_MS   = 60_000; // refresh every 60 s

async function getKnownCategoryNames() {
  if (_categoryCache && (Date.now() - _categoryCacheTs) < CACHE_TTL_MS) {
    return _categoryCache;
  }
  try {
    const { default: Category } = await import('../models/Category.js');
    const cats = await Category.find({ isActive: true }).select('name').lean();
    _categoryCache   = cats.map(c => c.name);
    _categoryCacheTs = Date.now();
    return _categoryCache;
  } catch {
    return _categoryCache || [];
  }
}

/**
 * Async version — queries the DB for known categories (cached 60 s).
 * Preferred in upload pipelines where category names need DB validation.
 * @param {string} title
 * @param {string} albumName
 * @returns {Promise<{ category: string, raw: string|null, source: string }>}
 */
export async function detectCategoryAsync(title, albumName) {
  const knownNames = await getKnownCategoryNames();
  return detectCategory(title, albumName, knownNames);
}

/** Force-clear the category cache (call after admin creates/renames a category) */
export function clearCategoryCache() {
  _categoryCache   = null;
  _categoryCacheTs = 0;
}
