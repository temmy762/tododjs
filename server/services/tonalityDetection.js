import { parseBuffer } from 'music-metadata';
import { analyzeAudio } from './audioAnalysis.js';
import { detectTonalityWithAI, detectTonalityWithGemini } from './openai.js';
import { lookupSpotifyFeatures } from './spotifyBpm.js';
import { lookupAuddFeatures } from './auddBpm.js';
import { detectKeyWithKeyfinder } from './keyfinderAnalysis.js';

const CAMELOT_MAP = {
  'C major': '8B', 'A minor': '8A',
  'D♭ major': '3B', 'B♭ minor': '3A',
  'D major': '10B', 'B minor': '10A',
  'E♭ major': '5B', 'C minor': '5A',
  'E major': '12B', 'C♯ minor': '12A',
  'F major': '7B', 'D minor': '7A',
  'F♯ major': '2B', 'E♭ minor': '2A',
  'G major': '9B', 'E minor': '9A',
  'A♭ major': '4B', 'F minor': '4A',
  'A major': '11B', 'F♯ minor': '11A',
  'B♭ major': '6B', 'G minor': '6A',
  'B major': '1B', 'G♯ minor': '1A'
};

function convertToCamelot(key, scale) {
  if (!key || !scale) return null;
  
  const normalizedKey = key.replace('#', '♯').replace('b', '♭');
  const keyString = `${normalizedKey} ${scale}`;
  
  return CAMELOT_MAP[keyString] || null;
}

export function parseKeyFromID3(initialKey) {
  if (!initialKey) return null;
  const raw = initialKey.trim();

  // Try Camelot notation first (e.g. "8A", "11B")
  const camelotMatch = raw.match(/^([1-9]|1[0-2])[AB]$/i);
  if (camelotMatch) {
    return { camelot: raw.toUpperCase() };
  }

  // Shorthand: "Ebm" / "F#m" (minor) or "EbM" / "Ebmaj" (major)
  const shortMatch = raw.match(/^([A-G][#♯b♭]?)(m|M|maj|min|major|minor)?$/i);
  if (shortMatch) {
    const key = shortMatch[1];
    const suffix = (shortMatch[2] || '').toLowerCase();
    const scale = (!suffix || suffix === 'm' || suffix.startsWith('min')) ? 'minor'
                : 'major';
    // No suffix → could be either; assume major for single-letter/note
    const finalScale = suffix === '' ? 'major' : scale;
    return { key, scale: finalScale, camelot: convertToCamelot(key, finalScale) };
  }

  // Try verbose notation (e.g. "Bb minor", "F# major", "C♯ min")
  const keyMatch = raw.match(/([A-G][#♯]?|[A-G][b♭])\s*(major|minor|maj|min)\b/i);
  if (keyMatch) {
    const key = keyMatch[1];
    const scale = keyMatch[2].toLowerCase().startsWith('maj') ? 'major' : 'minor';
    return { key, scale, camelot: convertToCamelot(key, scale) };
  }

  return null;
}

/**
 * Detect tonality and BPM for a track.
 * Priority: 1) ID3 tags  2) Essentia.js audio analysis  3) OpenAI text fallback
 * @param {Buffer} audioBuffer - Raw MP3 file buffer
 * @param {object} metadata - Track metadata (title, artist, album)
 * @returns {Promise<{tonality: object, detectedBpm: number|null}>}
 */
export async function detectTonality(audioBuffer, metadata) {
  let tonality = null;
  let detectedBpm = null;

  // Step 0: External metadata lookup (Spotify or AudD) — same data source as Tunebat
  if (metadata.title) {
    try {
      // Try Spotify first (if configured), fall back to AudD
      const ext = process.env.SPOTIFY_CLIENT_ID
        ? await lookupSpotifyFeatures(metadata.title, metadata.artist)
        : await lookupAuddFeatures(metadata.title, metadata.artist);

      if (ext?.bpm) {
        detectedBpm = ext.bpm;
        const src = ext.spotifyTrack ? 'Spotify' : 'AudD';
        console.log(`   ✓ BPM from ${src}: ${detectedBpm} (${ext.spotifyTrack || ext.matchedTrack || 'matched'})`);
      }
      if (ext?.camelot) {
        tonality = {
          key: ext.key,
          scale: ext.scale,
          camelot: ext.camelot,
          source: ext.spotifyTrack ? 'spotify' : 'audd',
          confidence: 0.95,
          needsManualReview: false
        };
        console.log(`   ✓ Key from external lookup: ${tonality.camelot}`);
      }
    } catch (err) {
      console.log('   ⚠ External BPM lookup skipped:', err.message);
    }
  }

  // Step 1: Try ID3 tags (fastest, most reliable if present)
  try {
    const musicMetadata = await parseBuffer(audioBuffer, { mimeType: 'audio/mpeg' });
    
    // Also check raw native TKEY if common.initialKey isn't surfaced
    let rawKey = musicMetadata.common.initialKey;
    if (!rawKey) {
      for (const container of Object.values(musicMetadata.native || {})) {
        for (const tag of container) {
          if (['TKEY', 'KEY', 'initialkey', 'Initial key'].includes(tag.id) && tag.value) {
            rawKey = String(tag.value).trim();
            break;
          }
        }
        if (rawKey) break;
      }
    }

    if (rawKey) {
      const id3Tonality = parseKeyFromID3(rawKey);
      if (id3Tonality) {
        tonality = {
          key: id3Tonality.key || null,
          scale: id3Tonality.scale || null,
          camelot: id3Tonality.camelot || null,
          source: 'id3-tag',
          confidence: 0.8,
          needsManualReview: false
        };
        console.log(`   ✓ Key from ID3 tag: ${tonality.camelot || tonality.key}`);
      }
    }

    // Also grab BPM from ID3 if not already found via Spotify
    if (!detectedBpm && musicMetadata.common.bpm) {
      detectedBpm = Math.round(musicMetadata.common.bpm);
      console.log(`   ✓ BPM from ID3 tag: ${detectedBpm}`);
    }
  } catch (error) {
    console.log('   ⚠ ID3 extraction failed:', error.message);
  }

  // Step 2: KeyFinder (libkeyfinder) — DJ-optimized key detection, highest accuracy for remixes
  // Only runs if keyfinder-cli binary is installed; skips silently otherwise.
  // Also runs when ID3 gave a key but no valid Camelot mapping could be derived.
  if (!tonality?.camelot) {
    try {
      const kf = await detectKeyWithKeyfinder(audioBuffer);
      if (kf?.camelot) {
        tonality = {
          key: kf.key || null,
          scale: kf.scale || null,
          camelot: kf.camelot,
          source: 'keyfinder',
          confidence: kf.confidence || 0.9,
          needsManualReview: false
        };
        console.log(`   ✓ Key from KeyFinder: ${tonality.camelot}`);
      }
    } catch (err) {
      console.log('   ⚠ KeyFinder step failed:', err.message);
    }
  }

  // Step 3: Essentia.js real audio analysis (accurate, analyzes waveform)
  if ((!tonality || !detectedBpm) && !(tonality?.source === 'spotify' && detectedBpm)) {
    try {
      console.log(`   🎵 Running Essentia.js audio analysis...`);
      const analysis = await analyzeAudio(audioBuffer);

      if (!tonality && analysis.key) {
        const clampedConfidence = Math.max(0, Math.min(1, analysis.confidence || 0));
        // Accept any key from audio analysis; flag low-confidence for manual review
        tonality = {
          key: analysis.key,
          scale: analysis.scale,
          camelot: analysis.camelot,
          source: 'audio-analysis',
          confidence: clampedConfidence,
          needsManualReview: clampedConfidence < 0.6
        };
        console.log(`   ✓ Key from audio analysis: ${tonality.camelot || tonality.key} (confidence: ${clampedConfidence.toFixed(2)})`);
      }

      if (!detectedBpm && analysis.bpm) {
        detectedBpm = analysis.bpm;
        console.log(`   ✓ BPM from audio analysis: ${detectedBpm}`);
      }
    } catch (error) {
      console.log('   ⚠ Audio analysis failed:', error.message);
    }
  }

  // Step 4: OpenAI text fallback
  if (!tonality && process.env.TONALITY_AI_FALLBACK === 'true' && metadata.title && metadata.artist) {
    try {
      console.log(`   🤖 Falling back to OpenAI for: ${metadata.title} - ${metadata.artist}`);
      const aiTonality = await detectTonalityWithAI(metadata.title, metadata.artist, metadata.album);
      
      if (aiTonality) {
        tonality = {
          ...aiTonality,
          needsManualReview: aiTonality.confidence < 0.7
        };
        console.log(`   ✓ Key from OpenAI: ${tonality.camelot || tonality.key} (confidence: ${tonality.confidence})`);
      }
    } catch (error) {
      console.log('   ⚠ OpenAI tonality detection failed:', error.message);
    }
  }

  // Step 4.5: Google Gemini fallback — runs whenever key is still missing, no flag required
  if (!tonality?.camelot && process.env.GOOGLE_AI_API_KEY && metadata.title && metadata.artist) {
    try {
      console.log(`   🔍 Trying Google Gemini for: ${metadata.title} - ${metadata.artist}`);
      const geminiTonality = await detectTonalityWithGemini(metadata.title, metadata.artist, metadata.album);

      if (geminiTonality?.camelot) {
        tonality = {
          ...geminiTonality,
          needsManualReview: geminiTonality.confidence < 0.65,
        };
        console.log(`   ✓ Key from Gemini: ${tonality.camelot} (confidence: ${geminiTonality.confidence})`);
      }
    } catch (error) {
      console.log('   ⚠ Gemini tonality detection failed:', error.message);
    }
  }

  // Step 5: Try to extract BPM from filename as last resort
  if (!detectedBpm && metadata.title) {
    // Match "128 BPM", "128BPM", or BPM in brackets like [128]
    const bpmMatch = metadata.title.match(/(\d{2,3})\s*BPM/i) || metadata.title.match(/\[(\d{2,3})\]/);
    if (bpmMatch) {
      const parsedBpm = parseInt(bpmMatch[1]);
      if (parsedBpm >= 60 && parsedBpm <= 200) {
        detectedBpm = parsedBpm;
        console.log(`   ✓ BPM from filename: ${detectedBpm}`);
      }
    }
  }
  
  if (!tonality) {
    tonality = {
      key: null,
      scale: null,
      camelot: null,
      source: 'unknown',
      confidence: 0,
      needsManualReview: true
    };
    console.log('   ⚠ Key detection failed - marked for manual review');
  }

  return { tonality, detectedBpm };
}

export async function enrichTrackWithTonality(track, audioBuffer) {
  const metadata = {
    title: track.title,
    artist: track.artist,
    album: track.album
  };
  
  return await detectTonality(audioBuffer, metadata);
}

export function updateTonalityManually(key, scale) {
  return {
    key,
    scale,
    camelot: convertToCamelot(key, scale),
    source: 'manual',
    confidence: 1.0,
    needsManualReview: false
  };
}
