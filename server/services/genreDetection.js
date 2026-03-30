import { parseBuffer } from 'music-metadata';
import { analyzeGenre } from './audioAnalysis.js';
import { detectGenreWithAI } from './openai.js';

// The 10 closed, fixed genres for the entire platform
export const FIXED_GENRES = [
  'Reggaeton',
  'Old School Reggaeton',
  'Dembow',
  'Trap',
  'House',
  'EDM',
  'Afro House',
  'Remember',
  'International',
  'Others'
];

// Keyword rules in PRIORITY ORDER — most specific first.
// First match wins. Each keyword is lowercased and checked via .includes().
const FIXED_GENRE_RULES = [
  {
    genre: 'Old School Reggaeton',
    keywords: [
      'old school reggaeton', 'old-school reggaeton', 'oldschool reggaeton',
      'reggaeton old school', 'reggaeton clasico', 'reggaeton clásico',
      'reggaeton viejo', 'golden era reggaeton', 'old school perreo'
    ]
  },
  {
    genre: 'Dembow',
    keywords: ['dembow', 'dem bow']
  },
  {
    genre: 'Reggaeton',
    keywords: [
      'reggaeton', 'reggaetón', 'regueton', 'reguetón',
      'perreo', 'urbano latino', 'reggae urbano'
    ]
  },
  {
    genre: 'Trap',
    keywords: [
      'trap', 'latin trap', 'trap latino', 'trap music',
      'drill', 'trapping'
    ]
  },
  {
    genre: 'Afro House',
    keywords: [
      'afro house', 'afrohouse', 'afro-house', 'afro tech',
      'afrobeat', 'afro beat', 'amapiano', 'tribal house', 'afro tribal'
    ]
  },
  {
    genre: 'House',
    keywords: [
      'house', 'tech house', 'deep house', 'progressive house',
      'funky house', 'disco house', 'vocal house', 'chicago house',
      'nu house', 'microhouse'
    ]
  },
  {
    genre: 'EDM',
    keywords: [
      'edm', 'electro house', 'big room', 'dubstep', 'trance',
      'drum and bass', 'drum & bass', 'dnb', 'd&b', 'future bass',
      'hardstyle', 'techno', 'electronic dance', 'electro', 'dance electronic',
      'bass music', 'progressive trance', 'psytrance'
    ]
  },
  {
    genre: 'Remember',
    keywords: [
      'remember', 'throwback', 'retro', 'oldies', 'vintage',
      'nostalgia', '80s', '90s', "80's", "90's", 'clasicos', 'clásicos',
      'hits antiguos', 'old skool'
    ]
  },
  {
    genre: 'International',
    keywords: [
      'pop', 'hip hop', 'hip-hop', 'hiphop', 'rap', 'r&b', 'rnb',
      'rhythm and blues', 'soul', 'funk', 'jazz', 'rock', 'indie',
      'alternative', 'country', 'folk', 'latin pop', 'dance pop',
      'kpop', 'k-pop', 'reggae', 'dancehall', 'blues', 'metal',
      'punk', 'gospel', 'bachata', 'salsa', 'merengue', 'cumbia', 'latin'
    ]
  }
];

/**
 * Maps ANY raw genre string to one of the 10 fixed genres.
 * Always returns a value — never null.
 * @param {string} rawInput
 * @returns {string} One of FIXED_GENRES
 */
export function mapToFixedGenre(rawInput) {
  if (!rawInput) return 'Others';

  const s = rawInput.toLowerCase().trim();

  // Direct match (case-insensitive)
  const direct = FIXED_GENRES.find(g => g.toLowerCase() === s);
  if (direct) return direct;

  // Keyword rules in priority order
  for (const rule of FIXED_GENRE_RULES) {
    for (const kw of rule.keywords) {
      if (s.includes(kw)) return rule.genre;
    }
  }

  return 'Others';
}

/**
 * Extract a fixed genre from any text string (title, artist, album, folder name).
 * Returns a fixed genre or null if no keyword matched.
 * @param {string} text
 * @returns {string|null}
 */
function extractGenreFromText(text) {
  if (!text) return null;
  const mapped = mapToFixedGenre(text);
  return mapped !== 'Others' ? mapped : null;
}

/**
 * Detect genre for a track using a 3-tier approach.
 * Every tier result is normalised through mapToFixedGenre so the output
 * is ALWAYS one of the 10 fixed genres.
 *
 * Tier 1 : ID3 tag → mapToFixedGenre
 * Tier 1b: keyword scan of title / artist / album → mapToFixedGenre
 * Tier 2 : Essentia.js audio analysis → mapToFixedGenre
 * Tier 3 : OpenAI fallback (constrained to fixed list)
 * Default: 'Others'
 *
 * @param {Buffer} audioBuffer
 * @param {object} metadata  { title, artist, album }
 * @returns {Promise<{genre: string, confidence: number, source: string, needsManualReview: boolean}>}
 */
export async function detectGenre(audioBuffer, metadata) {
  let genre = null;
  let confidence = 0;
  let source = 'unknown';

  // Tier 1: ID3 tag (fastest)
  try {
    const mm = await parseBuffer(audioBuffer, { mimeType: 'audio/mpeg' });
    if (mm.common.genre && mm.common.genre.length > 0) {
      const mapped = mapToFixedGenre(mm.common.genre[0]);
      if (mapped !== 'Others') {
        genre = mapped;
        confidence = 0.85;
        source = 'id3-tag';
        console.log(`   ✓ Genre from ID3 tag: ${genre}`);
      }
    }
  } catch (e) {
    console.log('   ⚠ ID3 genre extraction failed:', e.message);
  }

  // Tier 1b: keyword scan of metadata text fields
  if (!genre) {
    const texts = [metadata.title, metadata.artist, metadata.album].filter(Boolean);
    for (const text of texts) {
      const found = extractGenreFromText(text);
      if (found) {
        genre = found;
        confidence = 0.75;
        source = 'keyword';
        console.log(`   ✓ Genre from keyword (${text}): ${genre}`);
        break;
      }
    }
  }

  // Tier 2: Essentia.js audio analysis
  if (!genre || confidence < 0.6) {
    try {
      const analysis = await analyzeGenre(audioBuffer);
      if (analysis.genre && analysis.confidence > 0.5) {
        const mapped = mapToFixedGenre(analysis.genre);
        if (!genre || analysis.confidence > confidence + 0.2) {
          genre = mapped;
          confidence = analysis.confidence;
          source = 'audio-analysis';
          console.log(`   ✓ Genre from audio analysis: ${genre} (${confidence.toFixed(2)})`);
        }
      }
    } catch (e) {
      console.log('   ⚠ Audio genre analysis failed:', e.message);
    }
  }

  // Tier 3: OpenAI fallback — prompt already constrains to fixed list
  if (!genre || confidence < 0.5) {
    try {
      console.log(`   🤖 AI genre detection for: ${metadata.title} - ${metadata.artist}`);
      const aiRaw = await detectGenreWithAI(metadata.title, metadata.artist, metadata.album);
      if (aiRaw) {
        genre = mapToFixedGenre(aiRaw);
        confidence = 0.70;
        source = 'openai';
        console.log(`   ✓ Genre from AI: ${genre}`);
      }
    } catch (e) {
      console.log('   ⚠ AI genre detection failed:', e.message);
    }
  }

  // Default fallback — always a fixed genre
  if (!genre) {
    genre = 'Others';
    confidence = 0.30;
    source = 'default';
    console.log('   ⚠ Genre detection inconclusive — defaulting to "Others"');
  }

  return {
    genre,
    confidence,
    source,
    needsManualReview: confidence < 0.6
  };
}

/**
 * Convenience wrapper for an existing track object.
 */
export async function enrichTrackWithGenre(track, audioBuffer) {
  return detectGenre(audioBuffer, {
    title: track.title,
    artist: track.artist,
    album: track.album
  });
}

/**
 * Batch genre detection (concurrent).
 */
export async function batchDetectGenres(trackBuffers) {
  return Promise.all(
    trackBuffers.map(async ({ track, buffer }) => {
      try {
        const genre = await detectGenre(buffer, {
          title: track.title,
          artist: track.artist,
          album: track.album
        });
        return { trackId: track.id || track._id, genre };
      } catch (e) {
        console.error(`Error detecting genre for ${track.title}:`, e.message);
        return {
          trackId: track.id || track._id,
          genre: { genre: 'Others', confidence: 0, source: 'error', needsManualReview: true }
        };
      }
    })
  );
}

/**
 * Admin manual override — still mapped to ensure it's a valid fixed genre.
 */
export function updateGenreManually(rawGenre) {
  return {
    genre: mapToFixedGenre(rawGenre),
    confidence: 1.0,
    source: 'manual',
    needsManualReview: false
  };
}
