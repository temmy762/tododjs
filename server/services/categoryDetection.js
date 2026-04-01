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
 * Detect the best category for a track, trying title first then album.
 * Returns the raw extracted string (not validated against the DB).
 * The caller should match this against existing Category documents.
 * @param {string} title
 * @param {string} albumName
 * @returns {string|null}
 */
export function detectCategory(title, albumName) {
  return extractCategoryFromTitle(title) || extractCategoryFromAlbumName(albumName) || null;
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
