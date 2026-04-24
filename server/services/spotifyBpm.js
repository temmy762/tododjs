/**
 * spotifyBpm.js — Spotify Audio Features lookup (same data source as Tunebat)
 *
 * Uses the Spotify Web API (Client Credentials flow) to:
 *  1. Search for a track by title + artist
 *  2. Fetch its audio features: tempo (BPM), key, mode
 *
 * Required env vars:
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 */

const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL   = 'https://api.spotify.com/v1';

let _cachedToken = null;
let _tokenExpiresAt = 0;

function isEnabled() {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Spotify API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function getAccessToken() {
  if (_cachedToken && Date.now() < _tokenExpiresAt - 30_000) {
    return _cachedToken;
  }

  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const data = await fetchJson(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  _cachedToken = data.access_token;
  _tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return _cachedToken;
}

/**
 * Map Spotify's integer key (0–11) + mode (0=minor,1=major) to Camelot notation.
 * Pitch class: 0=C, 1=C#/Db, 2=D, 3=D#/Eb, 4=E, 5=F, 6=F#, 7=G, 8=Ab, 9=A, 10=Bb, 11=B
 */
const PITCH_CLASS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const CAMELOT_MAJOR = ['8B','3B','10B','5B','12B','7B','2B','9B','4B','11B','6B','1B'];
const CAMELOT_MINOR = ['5A','12A','7A','2A','9A','4A','11A','6A','1A','8A','3A','10A'];

function spotifyKeyToCamelot(key, mode) {
  if (key === -1 || key === null || key === undefined) return null;
  return mode === 1 ? CAMELOT_MAJOR[key] : CAMELOT_MINOR[key];
}

function spotifyKeyToName(key, mode) {
  if (key === -1 || key === null || key === undefined) return null;
  const note  = PITCH_CLASS[key];
  const scale = mode === 1 ? 'major' : 'minor';
  return { key: note, scale };
}

/**
 * Look up BPM and key for a track on Spotify.
 * @param {string} title
 * @param {string} artist
 * @returns {Promise<{bpm: number|null, key: string|null, scale: string|null, camelot: string|null, spotifyId: string|null}>}
 */
export async function lookupSpotifyFeatures(title, artist) {
  if (!isEnabled()) {
    return { bpm: null, key: null, scale: null, camelot: null, spotifyId: null };
  }

  try {
    const token = await getAccessToken();

    // Build a clean search query, strip DJ-edit suffixes like [topm!x], (intro), etc.
    const cleanTitle  = title?.replace(/\[.*?\]|\(.*?\)/g, '').trim() || '';
    const cleanArtist = artist?.replace(/Unknown Artist/i, '').trim() || '';
    const q = [cleanTitle, cleanArtist].filter(Boolean).join(' ');

    if (!q) return { bpm: null, key: null, scale: null, camelot: null, spotifyId: null };

    const searchUrl = `${SPOTIFY_API_URL}/search?q=${encodeURIComponent(q)}&type=track&limit=1`;
    const searchData = await fetchJson(searchUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const track = searchData?.tracks?.items?.[0];
    if (!track) {
      console.log(`   ⚠ Spotify: no match for "${q}"`);
      return { bpm: null, key: null, scale: null, camelot: null, spotifyId: null };
    }

    const spotifyId = track.id;
    const featuresUrl = `${SPOTIFY_API_URL}/audio-features/${spotifyId}`;
    const features = await fetchJson(featuresUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const bpm     = features.tempo ? Math.round(features.tempo) : null;
    const camelot = spotifyKeyToCamelot(features.key, features.mode);
    const keyInfo = spotifyKeyToName(features.key, features.mode);

    return {
      bpm,
      key:     keyInfo?.key    || null,
      scale:   keyInfo?.scale  || null,
      camelot: camelot         || null,
      spotifyId,
      spotifyTrack: `${track.artists[0]?.name} — ${track.name}`,
    };
  } catch (err) {
    console.log(`   ⚠ Spotify lookup failed: ${err.message}`);
    return { bpm: null, key: null, scale: null, camelot: null, spotifyId: null };
  }
}
