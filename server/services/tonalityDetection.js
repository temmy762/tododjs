import { parseBuffer } from 'music-metadata';
import { analyzeAudio } from './audioAnalysis.js';
import { detectTonalityWithAI } from './openai.js';

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

function parseKeyFromID3(initialKey) {
  if (!initialKey) return null;
  
  // Try Camelot notation first (e.g. "8A", "11B")
  const camelotMatch = initialKey.match(/\b([1-9]|1[0-2])[AB]\b/);
  if (camelotMatch) {
    return {
      camelot: camelotMatch[0]
    };
  }

  // Try standard key notation (e.g. "Bb minor", "F# major", "C♯ min")
  const keyMatch = initialKey.match(/([A-G][#♯]?|[A-G][b♭])\s*(major|minor|maj|min|m)\b/i);
  if (keyMatch) {
    const key = keyMatch[1];
    const scale = keyMatch[2].toLowerCase().startsWith('maj') ? 'major' : 'minor';
    return {
      key,
      scale,
      camelot: convertToCamelot(key, scale)
    };
  }

  // Try just a key letter with sharp/flat (no scale specified, assume major)
  const keyOnlyMatch = initialKey.match(/^([A-G][#♯b♭]?)$/);
  if (keyOnlyMatch) {
    return {
      key: keyOnlyMatch[1],
      scale: 'major',
      camelot: convertToCamelot(keyOnlyMatch[1], 'major')
    };
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
  
  // Step 1: Try ID3 tags (fastest, most reliable if present)
  try {
    const musicMetadata = await parseBuffer(audioBuffer, { mimeType: 'audio/mpeg' });
    
    if (musicMetadata.common.initialKey) {
      const id3Tonality = parseKeyFromID3(musicMetadata.common.initialKey);
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

    // Also grab BPM from ID3 if available
    if (musicMetadata.common.bpm) {
      detectedBpm = Math.round(musicMetadata.common.bpm);
      console.log(`   ✓ BPM from ID3 tag: ${detectedBpm}`);
    }
  } catch (error) {
    console.log('   ⚠ ID3 extraction failed:', error.message);
  }

  // Step 2: Essentia.js real audio analysis (accurate, analyzes waveform)
  if (!tonality || !detectedBpm) {
    try {
      console.log(`   🎵 Running Essentia.js audio analysis...`);
      const analysis = await analyzeAudio(audioBuffer);

      if (!tonality && analysis.key) {
        const clampedConfidence = Math.max(0, Math.min(1, analysis.confidence || 0));
        // Only trust audio analysis if confidence is positive
        if (clampedConfidence > 0) {
          tonality = {
            key: analysis.key,
            scale: analysis.scale,
            camelot: analysis.camelot,
            source: 'audio-analysis',
            confidence: clampedConfidence,
            needsManualReview: clampedConfidence < 0.5
          };
          console.log(`   ✓ Key from audio analysis: ${tonality.camelot || tonality.key} (confidence: ${clampedConfidence.toFixed(2)})`);
        } else {
          console.log(`   ⚠ Audio analysis returned low confidence (${analysis.confidence}), skipping`);
        }
      }

      if (!detectedBpm && analysis.bpm) {
        detectedBpm = analysis.bpm;
        console.log(`   ✓ BPM from audio analysis: ${detectedBpm}`);
      }
    } catch (error) {
      console.log('   ⚠ Audio analysis failed:', error.message);
    }
  }

  // Step 3: OpenAI text fallback (least reliable, only for key)
  if (!tonality && process.env.TONALITY_AI_FALLBACK === 'true' && metadata.title && metadata.artist) {
    try {
      console.log(`   🤖 Falling back to AI for: ${metadata.title} - ${metadata.artist}`);
      const aiTonality = await detectTonalityWithAI(metadata.title, metadata.artist, metadata.album);
      
      if (aiTonality) {
        tonality = {
          ...aiTonality,
          needsManualReview: aiTonality.confidence < 0.7
        };
        console.log(`   ✓ Key from AI: ${tonality.camelot || tonality.key} (confidence: ${tonality.confidence})`);
      }
    } catch (error) {
      console.log('   ⚠ AI tonality detection failed:', error.message);
    }
  }

  // Step 4: Try to extract BPM from filename as last resort
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
