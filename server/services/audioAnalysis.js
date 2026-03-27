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

function getEssentiaMaxBytes() {
  const raw = process.env.ESSENTIA_MAX_BYTES;
  const parsed = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return 5 * 1024 * 1024;
  return parsed;
}

function limitAnalysisBuffer(mp3Buffer) {
  const maxBytes = getEssentiaMaxBytes();
  if (!Buffer.isBuffer(mp3Buffer)) return mp3Buffer;
  if (mp3Buffer.length <= maxBytes) return mp3Buffer;
  return mp3Buffer.subarray(0, maxBytes);
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
  if (process.env.ESSENTIA_ENABLED === 'false') {
    return { key: null, scale: null, camelot: null, bpm: null, confidence: 0 };
  }

  const essentia = await getEssentia();

  if (typeof essentia.KeyExtractor !== 'function') {
    return { key: null, scale: null, camelot: null, bpm: null, confidence: 0 };
  }

  // Decode MP3 to PCM float32
  let audioBuffer;
  try {
    audioBuffer = await decode(limitAnalysisBuffer(mp3Buffer));
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

/**
 * Analyze audio features for genre classification using Essentia.js.
 * Uses spectral, rhythmic, and tonal descriptors to predict genre.
 * @param {Buffer} mp3Buffer - Raw MP3 file buffer
 * @returns {Promise<{genre: string, confidence: number, features: object}>}
 */
export async function analyzeGenre(mp3Buffer) {
  if (process.env.ESSENTIA_ENABLED === 'false') {
    return { genre: null, confidence: 0, features: null };
  }

  const essentia = await getEssentia();

  if (typeof essentia.SpectralRollOff !== 'function') {
    return { genre: null, confidence: 0, features: null };
  }

  // Decode MP3 to PCM float32
  let audioBuffer;
  try {
    audioBuffer = await decode(limitAnalysisBuffer(mp3Buffer));
  } catch (err) {
    console.error('Audio decode error:', err.message);
    return { genre: null, confidence: 0, features: null };
  }

  // Get mono channel
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

  const signal = essentia.arrayToVector(monoData);
  const sampleRate = audioBuffer.sampleRate;

  const features = {};

  try {
    // Spectral features for genre classification
    const windowSize = 2048;
    const hopSize = 1024;
    const spectrum = essentia.Spectrum(signal, windowSize);
    const spectralCentroid = essentia.SpectralCentroidTime(spectrum.spectrum);
    const spectralRolloff = essentia.SpectralRollOff(spectrum.spectrum, 0.85, sampleRate);
    const spectralFlux = essentia.SpectralFlux(spectrum.spectrum, hopSize, true);
    const zeroCrossingRate = essentia.ZeroCrossingRate(signal, hopSize, windowSize);

    features.spectralCentroid = spectralCentroid.centroid;
    features.spectralRolloff = spectralRolloff.rollOff;
    features.spectralFlux = spectralFlux.spectralFlux;
    features.zeroCrossingRate = zeroCrossingRate.zcr;

    // Rhythm features - BPM and beat strength
    const bpmData = essentia.PercivalBpmEstimator(signal, 1024, 2048, 128, 128, 210, 50, sampleRate);
    features.bpm = bpmData.bpm;
    features.rhythmConfidence = bpmData.confidence || 0.5;

    // Low-level energy features
    const rms = essentia.RMS(signal);
    features.rms = rms.rms;

    // Clean up
    spectrum.spectrum.delete();
    signal.delete();

    // Genre classification based on audio features
    // These thresholds are tuned for electronic/DJ music genres
    const genre = classifyGenreFromFeatures(features);

    return {
      genre: genre.name,
      confidence: genre.confidence,
      features
    };

  } catch (err) {
    console.error('Genre analysis error:', err.message);
    signal.delete();
    return { genre: null, confidence: 0, features: null };
  }
}

/**
 * Classify genre based on extracted audio features.
 * Tuned for DJ/electronic music genres.
 */
function classifyGenreFromFeatures(features) {
  const { bpm, spectralCentroid, zeroCrossingRate, spectralFlux, rms } = features;

  // House/Tech House: 120-130 BPM, moderate energy
  if (bpm >= 120 && bpm <= 130) {
    if (spectralCentroid > 2000 && spectralFlux > 0.015) {
      return { name: 'Tech House', confidence: 0.75 };
    }
    if (spectralCentroid < 2500) {
      return { name: 'Deep House', confidence: 0.70 };
    }
    return { name: 'House', confidence: 0.65 };
  }

  // Techno: 130-150 BPM, harder, more energy
  if (bpm >= 130 && bpm <= 150) {
    if (spectralCentroid > 3000 || spectralFlux > 0.02) {
      return { name: 'Techno', confidence: 0.75 };
    }
    return { name: 'Tech House', confidence: 0.60 };
  }

  // Trance/Progressive: 128-140 BPM, melodic
  if (bpm >= 128 && bpm <= 140) {
    if (spectralCentroid > 4000) {
      return { name: 'Trance', confidence: 0.65 };
    }
    return { name: 'Progressive House', confidence: 0.60 };
  }

  // Drum & Bass: 160-180 BPM, high energy
  if (bpm >= 160 && bpm <= 180) {
    return { name: 'Drum & Bass', confidence: 0.80 };
  }

  // Hip-Hop/R&B: 80-100 BPM, lower spectral centroid
  if (bpm >= 80 && bpm <= 105) {
    if (zeroCrossingRate < 0.05) {
      return { name: 'Hip-Hop', confidence: 0.70 };
    }
    return { name: 'R&B', confidence: 0.60 };
  }

  // Afrobeat/Amapiano: 100-115 BPM, percussive
  if (bpm >= 100 && bpm <= 115) {
    if (spectralFlux > 0.02) {
      return { name: 'Afrobeat', confidence: 0.65 };
    }
    return { name: 'Amapiano', confidence: 0.60 };
  }

  // Reggaeton/Latin: 85-100 BPM, specific rhythmic patterns
  if (bpm >= 85 && bpm <= 100) {
    if (spectralCentroid > 2000) {
      return { name: 'Reggaeton', confidence: 0.65 };
    }
    return { name: 'Latin', confidence: 0.55 };
  }

  // Default: Electronic (moderate confidence)
  return { name: 'Electronic', confidence: 0.50 };
}
