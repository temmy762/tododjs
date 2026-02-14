import { Essentia, EssentiaWASM } from 'essentia.js';
import decode from 'audio-decode';

let essentiaInstance = null;

async function getEssentia() {
  if (essentiaInstance) return essentiaInstance;
  // EssentiaWASM is already an instantiated WASM module object, not a factory function
  essentiaInstance = new Essentia(EssentiaWASM);
  console.log('✅ Essentia.js WASM initialized');
  return essentiaInstance;
}

const CAMELOT_MAP = {
  'C major': '8B', 'A minor': '8A',
  'Db major': '3B', 'Bb minor': '3A',
  'D major': '10B', 'B minor': '10A',
  'Eb major': '5B', 'C minor': '5A',
  'E major': '12B', 'C# minor': '12A',
  'F major': '7B', 'D minor': '7A',
  'F# major': '2B', 'Eb minor': '2A',
  'G major': '9B', 'E minor': '9A',
  'Ab major': '4B', 'F minor': '4A',
  'A major': '11B', 'F# minor': '11A',
  'Bb major': '6B', 'G minor': '6A',
  'B major': '1B', 'G# minor': '1A'
};

function toCamelot(key, scale) {
  if (!key || !scale) return null;
  const normalized = key.replace('♯', '#').replace('♭', 'b');
  const lookup = `${normalized} ${scale}`;
  return CAMELOT_MAP[lookup] || null;
}

/**
 * Analyze an MP3 buffer for key and BPM using Essentia.js (real audio analysis).
 * @param {Buffer} mp3Buffer - Raw MP3 file buffer
 * @returns {Promise<{key: string, scale: string, camelot: string, bpm: number, confidence: number}>}
 */
export async function analyzeAudio(mp3Buffer) {
  const essentia = await getEssentia();

  // Decode MP3 to PCM float32
  let audioBuffer;
  try {
    audioBuffer = await decode(mp3Buffer);
  } catch (err) {
    console.error('Audio decode error:', err.message);
    return { key: null, scale: null, camelot: null, bpm: null, confidence: 0 };
  }

  // Get mono channel (mix down if stereo)
  let monoData;
  if (audioBuffer.numberOfChannels >= 2) {
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.getChannelData(1);
    monoData = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
      monoData[i] = (left[i] + right[i]) / 2;
    }
  } else {
    monoData = audioBuffer.getChannelData(0);
  }

  // Convert to Essentia vector
  const signal = essentia.arrayToVector(monoData);

  let keyResult = { key: null, scale: null, camelot: null, confidence: 0 };
  let bpmResult = null;

  // Key detection
  try {
    const keyData = essentia.KeyExtractor(signal, true, 4096, 4096, 12, 3500, 60, 25, 0.2, 'bgate', audioBuffer.sampleRate, 1, 440, 'cosine', 'hann');
    if (keyData && keyData.key) {
      const key = keyData.key;
      const scale = keyData.scale;
      const strength = keyData.strength;
      const camelot = toCamelot(key, scale);
      keyResult = {
        key,
        scale,
        camelot,
        confidence: Math.min(strength, 1)
      };
    }
  } catch (err) {
    console.error('Key detection error:', err.message);
  }

  // BPM detection
  try {
    const bpmData = essentia.PercivalBpmEstimator(signal, 1024, 2048, 128, 128, 210, 50, audioBuffer.sampleRate);
    if (bpmData && bpmData.bpm > 0) {
      bpmResult = Math.round(bpmData.bpm);
    }
  } catch (err) {
    console.error('BPM detection error:', err.message);
  }

  // Clean up
  signal.delete();

  return {
    key: keyResult.key,
    scale: keyResult.scale,
    camelot: keyResult.camelot,
    bpm: bpmResult,
    confidence: keyResult.confidence
  };
}
