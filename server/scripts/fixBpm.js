/**
 * fixBpm.js — AI-powered BPM detection for tracks missing BPM
 *
 * Uses Essentia.js (PercivalBpmEstimator) to analyze the actual audio waveform.
 * Falls back to filename pattern extraction, then defaults to 128.
 *
 * Usage:
 *   node scripts/fixBpm.js                    → fixes all tracks with bpm=0 or null
 *   node scripts/fixBpm.js --dry-run           → shows what would change, no DB writes
 *   node scripts/fixBpm.js --default 96        → use 96 as fallback instead of 128
 *   node scripts/fixBpm.js --limit 10          → only process first 10 missing tracks
 *   node scripts/fixBpm.js --reprocess-defaults → ALSO re-processes tracks already at 128 BPM
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import https from 'https';
import http from 'http';
import { analyzeAudio } from '../services/audioAnalysis.js';
import { lookupAuddFeatures } from '../services/auddBpm.js';
import { getSignedDownloadUrl } from '../config/wasabi.js';
import Track from '../models/Track.js';
import Mashup from '../models/Mashup.js';

// ── CLI flags ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DEFAULT_BPM = (() => {
  const idx = args.indexOf('--default');
  if (idx !== -1 && args[idx + 1]) return parseInt(args[idx + 1]) || 128;
  return 128;
})();
const LIMIT = (() => {
  const idx = args.indexOf('--limit');
  if (idx !== -1 && args[idx + 1]) return parseInt(args[idx + 1]) || 0;
  return 0;
})();
const REPROCESS_DEFAULTS = args.includes('--reprocess-defaults');

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractBpmFromTitle(title) {
  if (!title) return null;
  // Match: "128 BPM", "128BPM", "[128]", "128bpm", "128 bpm", "128pm" (DJ shorthand)
  const patterns = [
    /(\d{2,3})\s*BPM\b/i,
    /\b(\d{2,3})\s*pm\b/i,
    /\[(\d{2,3})\]/,
    /\b(\d{2,3})\s*b\.?p\.?m/i,
  ];
  for (const rx of patterns) {
    const m = title.match(rx);
    if (m) {
      const val = parseInt(m[1]);
      if (val >= 60 && val <= 220) return val;
    }
  }
  return null;
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function pad(n, width = 3) {
  return String(n).padStart(width, ' ');
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🎵 TodoDJS — AI BPM Detection Script');
  console.log('━'.repeat(50));
  if (DRY_RUN) console.log('⚠️  DRY RUN — no changes will be written to the database\n');

  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!MONGO_URI) { console.error('❌ MONGODB_URI not set in .env'); process.exit(1); }
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  const missingQuery = REPROCESS_DEFAULTS
    ? { $or: [{ bpm: { $lte: 0 } }, { bpm: null }, { bpm: { $exists: false } }, { bpm: 128 }] }
    : { $or: [{ bpm: { $lte: 0 } }, { bpm: null }, { bpm: { $exists: false } }] };

  if (REPROCESS_DEFAULTS) console.log('ℹ️  --reprocess-defaults: also targeting tracks with bpm=128\n');

  const missingTracks  = await Track.find(missingQuery).select('_id title artist audioFile.key bpm').lean();
  const missingMashups = await Mashup.find(missingQuery).select('_id title artist audioFile bpm').lean();

  // Tag each record with its model so we can update the right collection
  let tracks = [
    ...missingTracks.map(t => ({ ...t, _model: 'track' })),
    ...missingMashups.map(m => ({ ...m, _model: 'mashup' })),
  ];

  if (!tracks.length) {
    console.log('✅ No tracks or mashups with missing BPM found. All done!');
    await mongoose.disconnect();
    return;
  }

  if (LIMIT > 0) tracks = tracks.slice(0, LIMIT);

  console.log(`Found ${missingTracks.length} track(s) + ${missingMashups.length} mashup(s) with missing BPM${LIMIT ? ` (limited to ${LIMIT})` : ''}\n`);

  const results = { audd: 0, essentia: 0, filename: 0, fallback: 0, failed: 0 };
  const log = [];

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    const label = `[${pad(i + 1)}/${pad(tracks.length)}]`;
    console.log(`${label} Analyzing: ${track.title || 'Untitled'}`);

    let newBpm = null;
    let source = null;

    // ── Step 1: AudD lookup (text search + optional audio fingerprint) ──────────
    if (track.title && process.env.AUDD_API_TOKEN) {
      try {
        // Pass 2 fingerprint only if audio key exists (saves requests for text-matched tracks)
        const audioKey = track.audioFile?.key || track.audioFile;
        let signedUrl = null;
        if (typeof audioKey === 'string' && audioKey) {
          signedUrl = await getSignedDownloadUrl(audioKey, 600).catch(() => null);
        }
        const audd = await lookupAuddFeatures(track.title, track.artist, signedUrl);
        if (audd?.bpm) {
          newBpm = audd.bpm;
          source = 'audd';
          console.log(`       ✅ AudD detected: ${newBpm} BPM (${audd.matchedTrack || 'matched'} — ${audd.source})`);
        } else {
          console.log(`       ⚠ AudD: no match found`);
        }
      } catch (err) {
        console.log(`       ⚠ AudD lookup failed: ${err.message}`);
      }
    } else if (!process.env.AUDD_API_TOKEN) {
      console.log(`       ⚠ AUDD_API_TOKEN not set — skipping AudD lookup`);
    }

    // ── Step 2: Essentia.js audio analysis (skip if AudD already matched) ─────
    if (!newBpm && track.audioFile?.key) {
      try {
        const signedUrl = await getSignedDownloadUrl(track.audioFile.key, 600);
        console.log(`       ↓ Downloading audio...`);
        const audioBuffer = await downloadBuffer(signedUrl);

        console.log(`       🧠 Running Essentia.js BPM analysis...`);
        const analysis = await analyzeAudio(audioBuffer);

        if (analysis.bpm && analysis.bpm > 0) {
          newBpm = analysis.bpm;
          source = 'essentia';
          console.log(`       ✅ Essentia detected: ${newBpm} BPM`);
        } else {
          console.log(`       ⚠ Essentia returned no BPM`);
        }
      } catch (err) {
        console.log(`       ❌ Audio analysis failed: ${err.message}`);
      }
    } else if (!newBpm) {
      console.log(`       ⚠ No audio key stored — skipping audio analysis`);
    }

    // ── Step 3: Filename pattern fallback ───────────────────────────────────
    if (!newBpm) {
      const fromTitle = extractBpmFromTitle(track.title);
      if (fromTitle) {
        newBpm = fromTitle;
        source = 'filename';
        console.log(`       ✅ Extracted from title: ${newBpm} BPM`);
      }
    }

    // ── Step 3: Default fallback ─────────────────────────────────────────────
    if (!newBpm) {
      newBpm = DEFAULT_BPM;
      source = 'fallback';
      console.log(`       ⚠ Using default: ${newBpm} BPM`);
    }

    results[source]++;
    log.push({ title: track.title, bpm: newBpm, source });

    if (!DRY_RUN) {
      try {
        const Model = track._model === 'mashup' ? Mashup : Track;
        await Model.updateOne({ _id: track._id }, { $set: { bpm: newBpm } });
      } catch (err) {
        console.log(`       ❌ DB update failed: ${err.message}`);
        results[source]--;
        results.failed++;
      }
    }

    console.log('');
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('━'.repeat(50));
  console.log(`📊 Results (${DRY_RUN ? 'DRY RUN' : 'WRITTEN TO DB'})`);
  console.log(`   🎵 AudD detected:          ${results.audd} track(s)`);
  console.log(`   🧠 Essentia AI detected:   ${results.essentia} track(s)`);
  console.log(`   📄 Extracted from title:   ${results.filename} track(s)`);
  console.log(`   🔢 Default fallback used:  ${results.fallback} track(s)`);
  if (results.failed) console.log(`   ❌ DB write failures:      ${results.failed} track(s)`);
  console.log(`   Total processed: ${tracks.length}`);
  console.log('━'.repeat(50));

  if (DRY_RUN) {
    console.log('\n📋 Preview of changes:');
    log.forEach(r => console.log(`   ${r.bpm} BPM  [${r.source}]  ${r.title}`));
  }

  await mongoose.disconnect();
  console.log('\n✅ Done.\n');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
