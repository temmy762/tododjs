import { parseBuffer } from 'music-metadata';
import { analyzeGenre } from './audioAnalysis.js';
import { detectGenreWithAI } from './openai.js';

// Common genre keywords found in track titles (for fast text-based detection)
const GENRE_KEYWORDS = {
  'Tech House': ['tech house', 'tech-house', 'techhouse'],
  'Deep House': ['deep house', 'deep-house', 'deephouse'],
  'Afro House': ['afro house', 'afro-house', 'afrohouse'],
  'Techno': ['techno', 'hard techno', 'melodic techno'],
  'Trance': ['trance', 'psytrance', 'progressive trance'],
  'Progressive House': ['progressive house', 'prog house'],
  'Drum & Bass': ['drum & bass', 'drum and bass', 'dnb', 'd&b'],
  'Hip-Hop': ['hip hop', 'hip-hop', 'hiphop', 'rap'],
  'R&B': ['r&b', 'rnb', 'rhythm and blues'],
  'Reggaeton': ['reggaeton', 'reggaetón'],
  'Latin': ['latin', 'latino', 'salsa', 'bachata', 'merengue'],
  'Afrobeat': ['afrobeat', 'afro beat'],
  'Amapiano': ['amapiano', 'piano'],
  'Dubstep': ['dubstep', 'dub step'],
  'EDM': ['edm', 'electro house', 'big room'],
  'Pop': ['pop', 'dance pop'],
  'Funk': ['funk', 'funky'],
  'Soul': ['soul'],
  'Disco': ['disco', 'nu disco', 'nudisco'],
  'Jazz': ['jazz'],
  'Rock': ['rock']
};

/**
 * Extract genre from track title using keyword matching.
 * Fast, no external calls needed.
 * @param {string} title - Track title
 * @returns {string|null} - Detected genre or null
 */
function extractGenreFromTitle(title) {
  if (!title) return null;
  
  const lowerTitle = title.toLowerCase();
  
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerTitle.includes(keyword)) {
        return genre;
      }
    }
  }
  
  return null;
}

/**
 * Detect genre for a track using 3-tier approach:
 * 1. ID3 tags (fastest, most reliable if present)
 * 2. Essentia.js audio analysis (analyzes waveform, good for unreleased tracks)
 * 3. OpenAI text analysis (fallback for ambiguous cases)
 * 
 * @param {Buffer} audioBuffer - Raw MP3 file buffer
 * @param {object} metadata - Track metadata (title, artist, album)
 * @returns {Promise<{genre: string, confidence: number, source: string, needsManualReview: boolean}>}
 */
export async function detectGenre(audioBuffer, metadata) {
  let genre = null;
  let confidence = 0;
  let source = 'unknown';

  // Tier 1: Try ID3 tags first (fastest)
  try {
    const musicMetadata = await parseBuffer(audioBuffer, { mimeType: 'audio/mpeg' });
    
    if (musicMetadata.common.genre && musicMetadata.common.genre.length > 0) {
      const id3Genre = musicMetadata.common.genre[0];
      // Clean up common ID3 genre formats
      const normalizedGenre = normalizeGenre(id3Genre);
      if (normalizedGenre) {
        genre = normalizedGenre;
        confidence = 0.85;
        source = 'id3-tag';
        console.log(`   ✓ Genre from ID3 tag: ${genre}`);
      }
    }
  } catch (error) {
    console.log('   ⚠ ID3 genre extraction failed:', error.message);
  }

  // Tier 1b: Try title keyword extraction (very fast, no buffer needed)
  if (!genre && metadata.title) {
    const titleGenre = extractGenreFromTitle(metadata.title);
    if (titleGenre) {
      genre = titleGenre;
      confidence = 0.75;
      source = 'title-keyword';
      console.log(`   ✓ Genre from title: ${genre}`);
    }
  }

  // Tier 2: Essentia.js audio analysis (analyzes actual audio)
  if (!genre || confidence < 0.6) {
    try {
      console.log(`   🎵 Running Essentia.js genre analysis...`);
      const analysis = await analyzeGenre(audioBuffer);

      if (analysis.genre && analysis.confidence > 0.5) {
        // If we already have a genre from ID3/title but with low confidence, 
        // only override if audio analysis has high confidence
        if (!genre || analysis.confidence > confidence + 0.2) {
          genre = analysis.genre;
          confidence = analysis.confidence;
          source = 'audio-analysis';
          console.log(`   ✓ Genre from audio analysis: ${genre} (confidence: ${confidence.toFixed(2)})`);
        }
      }
    } catch (error) {
      console.log('   ⚠ Audio genre analysis failed:', error.message);
    }
  }

  // Tier 3: OpenAI text fallback (analyzes title/artist context)
  if (!genre || confidence < 0.5) {
    try {
      console.log(`   🤖 Falling back to AI genre detection for: ${metadata.title} - ${metadata.artist}`);
      const aiGenre = await detectGenreWithAI(metadata.title, metadata.artist, metadata.album);
      
      if (aiGenre) {
        genre = aiGenre;
        confidence = 0.70; // AI gives us genre name but no confidence, assume moderate
        source = 'openai';
        console.log(`   ✓ Genre from AI: ${genre}`);
      }
    } catch (error) {
      console.log('   ⚠ AI genre detection failed:', error.message);
    }
  }

  // Final fallback
  if (!genre) {
    genre = 'Electronic';
    confidence = 0.30;
    source = 'default';
    console.log('   ⚠ Genre detection failed - using default "Electronic"');
  }

  return {
    genre,
    confidence,
    source,
    needsManualReview: confidence < 0.6
  };
}

/**
 * Normalize genre names from various formats to standard names.
 * @param {string} rawGenre - Raw genre string from ID3
 * @returns {string|null} - Normalized genre or null
 */
function normalizeGenre(rawGenre) {
  if (!rawGenre) return null;
  
  const normalized = rawGenre.toLowerCase().trim();
  
  // Map common ID3 genre variations to standard names
  const genreMap = {
    'house': 'House',
    'tech house': 'Tech House',
    'tech-house': 'Tech House',
    'deep house': 'Deep House',
    'deep-house': 'Deep House',
    'afro house': 'Afro House',
    'techno': 'Techno',
    'trance': 'Trance',
    'progressive house': 'Progressive House',
    'drum & bass': 'Drum & Bass',
    'drum and bass': 'Drum & Bass',
    'dnb': 'Drum & Bass',
    'dubstep': 'Dubstep',
    'hip hop': 'Hip-Hop',
    'hip-hop': 'Hip-Hop',
    'r&b': 'R&B',
    'rnb': 'R&B',
    'reggaeton': 'Reggaeton',
    'latin': 'Latin',
    'afrobeat': 'Afrobeat',
    'amapiano': 'Amapiano',
    'edm': 'EDM',
    'electronic': 'Electronic',
    'electro': 'Electronic',
    'dance': 'Dance',
    'pop': 'Pop',
    'funk': 'Funk',
    'soul': 'Soul',
    'disco': 'Disco',
    'jazz': 'Jazz',
    'rock': 'Rock'
  };
  
  // Direct match
  if (genreMap[normalized]) {
    return genreMap[normalized];
  }
  
  // Contains match
  for (const [key, value] of Object.entries(genreMap)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  // Return as-is if no mapping found (capitalize first letter)
  return rawGenre.charAt(0).toUpperCase() + rawGenre.slice(1).toLowerCase();
}

/**
 * Enrich track with genre detection.
 * Convenience wrapper for existing track objects.
 * @param {object} track - Track object with title, artist, album
 * @param {Buffer} audioBuffer - Raw MP3 file buffer
 * @returns {Promise<object>} - Genre detection result
 */
export async function enrichTrackWithGenre(track, audioBuffer) {
  const metadata = {
    title: track.title,
    artist: track.artist,
    album: track.album
  };
  
  return await detectGenre(audioBuffer, metadata);
}

/**
 * Batch detect genres for multiple tracks concurrently.
 * Non-blocking - processes all tracks in parallel for speed.
 * @param {Array<{track: object, buffer: Buffer}>} trackBuffers - Array of track+buffer pairs
 * @returns {Promise<Array<{trackId: string, genre: object}>>}
 */
export async function batchDetectGenres(trackBuffers) {
  const promises = trackBuffers.map(async ({ track, buffer }) => {
    try {
      const genre = await detectGenre(buffer, {
        title: track.title,
        artist: track.artist,
        album: track.album
      });
      
      return {
        trackId: track.id || track._id,
        genre
      };
    } catch (error) {
      console.error(`Error detecting genre for ${track.title}:`, error.message);
      return {
        trackId: track.id || track._id,
        genre: {
          genre: 'Electronic',
          confidence: 0,
          source: 'error',
          needsManualReview: true
        }
      };
    }
  });
  
  return await Promise.all(promises);
}

/**
 * Update genre manually (admin override).
 * @param {string} genre - New genre name
 * @returns {object} - Manual genre result
 */
export function updateGenreManually(genre) {
  return {
    genre,
    confidence: 1.0,
    source: 'manual',
    needsManualReview: false
  };
}
