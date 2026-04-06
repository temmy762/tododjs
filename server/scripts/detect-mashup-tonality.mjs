/**
 * detect-mashup-tonality.mjs
 *
 * Downloads audio for every Mashup that is missing a tonality value and runs
 * the same 3-step detection pipeline used during uploads:
 *   1. ID3 tags (INITIALKEY / TKEY)
 *   2. Essentia.js waveform analysis
 *   3. OpenAI text fallback (only if TONALITY_AI_FALLBACK=true in .env)
 *
 * Also backfills BPM when the mashup has bpm = null / 0.
 *
 * Usage (run from server/ directory):
 *   node scripts/detect-mashup-tonality.mjs [--dry-run] [--all] [--limit N]
 *
 * Options:
 *   --dry-run   Show what would be updated without saving
 *   --all       Process ALL mashups (including those that already have tonality)
 *   --limit N   Stop after N tracks (default: process all)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import https from 'https';
import http from 'http';

const DRY_RUN  = process.argv.includes('--dry-run');
const ALL      = process.argv.includes('--all');
const limitArg = process.argv.indexOf('--limit');
const LIMIT    = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) || Infinity : Infinity;

// ─── download helper ──────────────────────────────────────────────────────────
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const get = (targetUrl, redirects = 0) => {
      if (redirects > 5) return reject(new Error('Too many redirects'));
      const client = targetUrl.startsWith('https') ? https : http;
      client.get(targetUrl, res => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          res.resume();
          return get(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    };
    get(url);
  });
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error('❌  MONGO_URI / MONGODB_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected to MongoDB\n');

  const Mashup = (await import('../models/Mashup.js')).default;
  const { detectTonality } = await import('../services/tonalityDetection.js');
  const { ensureSignedUrl } = await import('../config/wasabi.js');
  const { parseBuffer } = await import('music-metadata');

  // Build query
  const query = ALL
    ? { 'audioFile.url': { $exists: true, $ne: '' } }
    : {
        'audioFile.url': { $exists: true, $ne: '' },
        $or: [
          { tonality: '' },
          { tonality: null },
          { tonality: { $exists: false } }
        ]
      };

  const mashups = await Mashup.find(query).lean();
  const total   = Math.min(mashups.length, LIMIT);

  console.log(`🎵  Found ${mashups.length} mashup(s) to process${LIMIT < Infinity ? ` (capped at ${LIMIT})` : ''}\n`);

  const stats = { ok: 0, needsReview: 0, failed: 0, skipped: 0 };

  for (let i = 0; i < total; i++) {
    const m = mashups[i];
    const label = `[${i + 1}/${total}] "${m.title}" — ${m.artist}`;

    if (!m.audioFile?.url && !m.audioFile?.key) {
      console.log(`  ⚠  ${label} — no audio URL, skipping`);
      stats.skipped++;
      continue;
    }

    console.log(`\n  🔍 ${label}`);

    // Get a signed download URL (handles private Wasabi S3 objects)
    let downloadUrl;
    try {
      downloadUrl = await ensureSignedUrl(m.audioFile.key || m.audioFile.url, 3600);
    } catch (err) {
      console.log(`  ❌  Could not sign URL: ${err.message}`);
      stats.failed++;
      continue;
    }

    let audioBuffer;
    try {
      process.stdout.write('     Downloading…');
      audioBuffer = await downloadBuffer(downloadUrl);
      process.stdout.write(` ${(audioBuffer.length / 1024 / 1024).toFixed(1)} MB\n`);
    } catch (err) {
      console.log(`\n  ❌  Download failed: ${err.message}`);
      stats.failed++;
      continue;
    }

    // ── Extra: scan ALL native ID3 frames for any key field ──────────────
    let nativeKeyHint = null;
    try {
      const mm = await parseBuffer(audioBuffer, { mimeType: 'audio/mpeg' });
      // Check every native tag container for TKEY / KEY / initialkey
      for (const container of Object.values(mm.native || {})) {
        for (const tag of container) {
          if (['TKEY', 'KEY', 'initialkey', 'Initial key'].includes(tag.id)) {
            nativeKeyHint = String(tag.value).trim();
            if (nativeKeyHint) { console.log(`   ✓ Native ID3 key tag (${tag.id}): ${nativeKeyHint}`); break; }
          }
        }
        if (nativeKeyHint) break;
      }
    } catch { /* non-fatal */ }

    let result;
    try {
      result = await detectTonality(audioBuffer, { title: m.title, artist: m.artist });
      // If main detection missed it but native tag has a value, use that
      if (nativeKeyHint && !result.tonality?.camelot) {
        const { parseKeyFromID3 } = await import('../services/tonalityDetection.js').catch(() => ({ parseKeyFromID3: null }));
        // Simple inline parse: accept raw camelot values like "5A" or "10B"
        const camelotMatch = nativeKeyHint.match(/\b([1-9]|1[0-2])[AB]\b/i);
        if (camelotMatch) {
          result.tonality = { camelot: camelotMatch[0].toUpperCase(), source: 'native-id3', confidence: 0.8, needsManualReview: false };
          console.log(`   ✓ Camelot from native tag: ${result.tonality.camelot}`);
        }
      }
    } catch (err) {
      console.log(`  ❌  Detection failed: ${err.message}`);
      stats.failed++;
      continue;
    }

    const { tonality, detectedBpm } = result;
    const newTonality = tonality?.camelot || '';
    const newBpm      = (!m.bpm || m.bpm === 0) ? detectedBpm : m.bpm;

    const needsReview = !newTonality || tonality?.needsManualReview === true;
    const changes = [];
    if (newTonality && newTonality !== m.tonality) changes.push(`tonality: "${m.tonality || '(empty)'}" → "${newTonality}"`);
    if (newBpm      && newBpm !== m.bpm)            changes.push(`bpm: ${m.bpm || '(empty)'} → ${newBpm}`);
    if (needsReview !== (m.tonalityNeedsReview ?? false)) changes.push(`tonalityNeedsReview: ${m.tonalityNeedsReview} → ${needsReview}`);

    if (!changes.length) {
      console.log(`     ✓ No changes needed (tonality already: "${m.tonality}", bpm: ${m.bpm})`);
      stats.skipped++;
      continue;
    }

    console.log(`     ✓ Updates: ${changes.join(' | ')}`);
    if (needsReview) { console.log(`     ⚠  Flagged for manual review`); stats.needsReview++; }

    if (!DRY_RUN) {
      try {
        await Mashup.updateOne(
          { _id: m._id },
          {
            $set: {
              ...(newTonality ? { tonality: newTonality } : {}),
              ...(newBpm      ? { bpm: newBpm }           : {}),
              tonalityNeedsReview: needsReview
            }
          }
        );
        stats.ok++;
      } catch (err) {
        console.log(`  ❌  Save failed: ${err.message}`);
        stats.failed++;
      }
    } else {
      stats.ok++;
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Total processed : ${total}`);
  console.log(`  Updated         : ${stats.ok}${DRY_RUN ? ' (dry-run)' : ''}`);
  console.log(`  Needs review    : ${stats.needsReview} (flagged tonalityNeedsReview=true)`);
  console.log(`  Skipped         : ${stats.skipped}`);
  console.log(`  Failed          : ${stats.failed}`);
  console.log('═══════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('🔌  Disconnected');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
