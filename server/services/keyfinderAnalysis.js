import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

// Camelot wheel: key+scale → Camelot notation
const KEY_TO_CAMELOT = {
  'C major': '8B',  'A minor': '8A',
  'Db major': '3B', 'Bb minor': '3A',
  'D major': '10B', 'B minor': '10A',
  'Eb major': '5B', 'C minor': '5A',
  'E major': '12B', 'C# minor': '12A',
  'F major': '7B',  'D minor': '7A',
  'F# major': '2B', 'Eb minor': '2A',
  'G major': '9B',  'E minor': '9A',
  'Ab major': '4B', 'F minor': '4A',
  'A major': '11B', 'F# minor': '11A',
  'Bb major': '6B', 'G minor': '6A',
  'B major': '1B',  'G# minor': '1A',
};

// Camelot → key+scale (for parsing keyfinder-cli Camelot output)
const CAMELOT_TO_KEY = Object.fromEntries(
  Object.entries(KEY_TO_CAMELOT).map(([ks, c]) => [c, ks])
);

// Cache whether keyfinder-cli binary is available (checked once per process)
let keyfinderAvailable = null;

async function checkKeyfinderAvailable() {
  if (keyfinderAvailable !== null) return keyfinderAvailable;
  try {
    // Try both common binary names
    await execAsync('which keyfinder-cli || which keyfinder 2>/dev/null');
    keyfinderAvailable = true;
  } catch {
    keyfinderAvailable = false;
  }
  return keyfinderAvailable;
}

/**
 * Parse keyfinder-cli output — handles multiple output formats:
 *   "8A"                             (Camelot notation — Evan Purkhiser's keyfinder-cli)
 *   "A minor"  / "C major"           (key+scale verbose)
 *   "/path/to/file.mp3 - A minor"    (file prefix)
 */
function parseKeyfinderOutput(raw) {
  const output = raw.trim();

  // Format 1: Camelot notation directly (e.g. "8A", "11B")
  const camelotMatch = output.match(/^([1-9]|1[0-2])[AB]$/i);
  if (camelotMatch) {
    const camelot = output.toUpperCase();
    const keyScale = CAMELOT_TO_KEY[camelot];
    if (keyScale) {
      const [key, scale] = keyScale.split(' ');
      return { key, scale, camelot, confidence: 0.9 };
    }
    return { key: null, scale: null, camelot, confidence: 0.9 };
  }

  // Format 2: Strip file path prefix (e.g. "/tmp/track.mp3 - A minor")
  const withPrefix = output.replace(/^.*\s-\s/, '');

  // Format 3: "Key scale" (e.g. "A minor", "C major", "F# major")
  const keyScaleMatch = withPrefix.match(/^([A-G][b#]?)\s+(major|minor)$/i);
  if (keyScaleMatch) {
    const key = keyScaleMatch[1];
    const scale = keyScaleMatch[2].toLowerCase();
    const camelot = KEY_TO_CAMELOT[`${key} ${scale}`] || null;
    return { key, scale, camelot, confidence: 0.9 };
  }

  return null;
}

/**
 * Detect musical key using the libkeyfinder algorithm (via keyfinder-cli binary).
 * Falls back to null silently if binary is not installed — the caller should
 * then continue with the next step in the pipeline (Essentia.js).
 *
 * @param {Buffer} audioBuffer - Raw MP3/WAV/FLAC buffer
 * @returns {Promise<{key, scale, camelot, confidence}|null>}
 */
export async function detectKeyWithKeyfinder(audioBuffer) {
  const available = await checkKeyfinderAvailable();
  if (!available) return null;

  const tmpFile = join(tmpdir(), `keyfinder_${Date.now()}_${Math.random().toString(36).slice(2)}.mp3`);

  try {
    await writeFile(tmpFile, audioBuffer);

    // Try both binary names
    let stdout = '';
    try {
      const result = await execAsync(`keyfinder-cli "${tmpFile}"`, { timeout: 30000 });
      stdout = result.stdout;
    } catch {
      const result = await execAsync(`keyfinder "${tmpFile}"`, { timeout: 30000 });
      stdout = result.stdout;
    }

    const parsed = parseKeyfinderOutput(stdout);
    if (parsed) {
      console.log(`   🎸 KeyFinder: ${parsed.camelot || parsed.key} (${parsed.scale})`);
      return parsed;
    }

    console.log(`   ⚠ KeyFinder produced unrecognised output: ${stdout.trim()}`);
    return null;
  } catch (err) {
    console.log(`   ⚠ keyfinder-cli error: ${err.message}`);
    return null;
  } finally {
    unlink(tmpFile).catch(() => {});
  }
}
