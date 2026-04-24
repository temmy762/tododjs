/**
 * auddBpm.js — AudD.io music recognition for BPM & key detection
 *
 * AudD fingerprints the actual audio file and returns metadata including
 * Spotify audio features (tempo/BPM, key, mode) — same data as Tunebat.
 *
 * Free tier: 500 requests/month — https://dashboard.audd.io
 *
 * Required env var:
 *   AUDD_API_TOKEN
 *
 * Strategy (two-pass):
 *   1. Search by title + artist text (fast, no audio download, uses ~1 request)
 *   2. If no match, fingerprint the signed audio URL (more accurate, ~1 request)
 */

const AUDD_API = 'https://api.audd.io';

function isEnabled() {
  return !!process.env.AUDD_API_TOKEN;
}

/**
 * Map Spotify's integer key (0–11) + mode (0=minor, 1=major) to Camelot.
 */
const CAMELOT_MAJOR = ['8B','3B','10B','5B','12B','7B','2B','9B','4B','11B','6B','1B'];
const CAMELOT_MINOR = ['5A','12A','7A','2A','9A','4A','11A','6A','1A','8A','3A','10A'];
const PITCH_CLASS   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function parseFeaturesFromAudd(features) {
  if (!features || typeof features.tempo !== 'number') return null;
  const bpm     = Math.round(features.tempo);
  const key     = features.key ?? -1;
  const mode    = features.mode ?? -1;
  const camelot = key >= 0 && mode >= 0
    ? (mode === 1 ? CAMELOT_MAJOR[key] : CAMELOT_MINOR[key])
    : null;
  const keyName = key >= 0 ? PITCH_CLASS[key] : null;
  const scale   = mode === 1 ? 'major' : mode === 0 ? 'minor' : null;
  return { bpm, camelot, key: keyName, scale };
}

async function postForm(endpoint, params) {
  const body = new URLSearchParams({ api_token: process.env.AUDD_API_TOKEN, ...params });
  const res  = await fetch(`${AUDD_API}${endpoint}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    body.toString(),
  });
  if (!res.ok) throw new Error(`AudD HTTP ${res.status}`);
  return res.json();
}

/**
 * Pass 1: Search by title + artist (no audio download needed).
 * Uses AudD's /findLyrics endpoint then fetches audio-features via returned Spotify ID.
 */
async function searchByText(title, artist) {
  const clean = (s) => s?.replace(/\[.*?\]|\(.*?\)/g, '').trim() || '';
  const q = [clean(title), clean(artist)].filter(Boolean).join(' ');
  if (!q) return null;

  const data = await postForm('/findLyrics/', { q, return: 'spotify' });

  if (data.status !== 'success' || !data.result?.length) return null;

  const match = data.result[0];
  const features = match?.spotify?.audio_features || match?.apple_music?.audio_features;
  const parsed = parseFeaturesFromAudd(features);
  if (parsed) {
    return { ...parsed, matchedTrack: `${match.artist} — ${match.title}`, source: 'audd-search' };
  }
  return null;
}

/**
 * Pass 2: Fingerprint recognition using the actual audio URL.
 * More accurate for remixes / mashups that may not match by title.
 */
async function recognizeByUrl(audioUrl) {
  const data = await postForm('/', { url: audioUrl, return: 'spotify' });

  if (data.status !== 'success' || !data.result) return null;

  const result   = data.result;
  const features = result?.spotify?.audio_features;
  const parsed   = parseFeaturesFromAudd(features);
  if (parsed) {
    return { ...parsed, matchedTrack: `${result.artist} — ${result.title}`, source: 'audd-fingerprint' };
  }
  return null;
}

/**
 * Main entry point.
 * @param {string} title
 * @param {string} artist
 * @param {string|null} audioUrl  Signed URL to the audio file (used as Pass 2 fallback)
 * @returns {Promise<{bpm, camelot, key, scale, matchedTrack, source} | null>}
 */
export async function lookupAuddFeatures(title, artist, audioUrl = null) {
  if (!isEnabled()) return null;

  try {
    // Pass 1: text search (cheap, fast)
    const textResult = await searchByText(title, artist);
    if (textResult) return textResult;
  } catch (err) {
    console.log(`   ⚠ AudD text search failed: ${err.message}`);
  }

  if (!audioUrl) return null;

  try {
    // Pass 2: audio fingerprint (uses audio URL directly, no download needed)
    const fpResult = await recognizeByUrl(audioUrl);
    if (fpResult) return fpResult;
  } catch (err) {
    console.log(`   ⚠ AudD fingerprint failed: ${err.message}`);
  }

  return null;
}
