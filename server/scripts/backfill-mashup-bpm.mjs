/**
 * backfill-mashup-bpm.mjs
 * Finds all mashups with bpm = 0 or missing, downloads their audio from Wasabi,
 * runs the full BPM detection pipeline (ID3 → Essentia.js → filename), and saves.
 *
 * Run on VPS:
 *   node server/scripts/backfill-mashup-bpm.mjs
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { parseBuffer } from 'music-metadata';

// ── Inline Wasabi client (avoid circular import from wasabi.js) ────────────
const s3 = new S3Client({
  endpoint: `https://${process.env.WASABI_ENDPOINT}`,
  region: process.env.WASABI_REGION,
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const BUCKET = process.env.WASABI_BUCKET_NAME;

// ── Download audio buffer from Wasabi ─────────────────────────────────────
async function downloadBuffer(key) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const { Body } = await s3.send(cmd);
  const chunks = [];
  for await (const chunk of Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// ── Extract BPM from ID3 tags ─────────────────────────────────────────────
async function bpmFromID3(buffer) {
  try {
    const meta = await parseBuffer(buffer, { mimeType: 'audio/mpeg' });
    if (meta.common.bpm) return Math.round(meta.common.bpm);
  } catch {}
  return null;
}

// ── Extract BPM from Essentia.js audio analysis ───────────────────────────
async function bpmFromAudio(buffer) {
  try {
    const { analyzeAudio } = await import('../services/audioAnalysis.js');
    const result = await analyzeAudio(buffer);
    if (result?.bpm && result.bpm >= 60 && result.bpm <= 220) return Math.round(result.bpm);
  } catch (err) {
    console.log('   ⚠ Essentia analysis failed:', err.message);
  }
  return null;
}

// ── Extract BPM from title string (e.g. "Track 128BPM") ──────────────────
function bpmFromTitle(title) {
  if (!title) return null;
  const m = title.match(/(\d{2,3})\s*BPM/i) || title.match(/\[(\d{2,3})\]/);
  if (m) {
    const val = parseInt(m[1]);
    if (val >= 60 && val <= 220) return val;
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Import Mashup model after DB connection
  const { default: Mashup } = await import('../models/Mashup.js');

  const mashups = await Mashup.find({
    $or: [{ bpm: { $exists: false } }, { bpm: 0 }, { bpm: null }],
    'audioFile.key': { $exists: true, $ne: '' },
  }).lean();

  console.log(`\n🎵 Found ${mashups.length} mashup(s) with missing/zero BPM\n`);

  if (mashups.length === 0) {
    console.log('Nothing to backfill.');
    process.exit(0);
  }

  let updated = 0;
  let failed = 0;

  for (const mashup of mashups) {
    const label = `"${mashup.title}" by ${mashup.artist}`;
    console.log(`\n▶ Processing ${label}`);

    let bpm = null;

    try {
      console.log(`   ⬇ Downloading audio from Wasabi...`);
      const buffer = await downloadBuffer(mashup.audioFile.key);

      // Priority 1: ID3 tag
      bpm = await bpmFromID3(buffer);
      if (bpm) { console.log(`   ✓ BPM from ID3: ${bpm}`); }

      // Priority 2: Essentia.js audio analysis
      if (!bpm) {
        bpm = await bpmFromAudio(buffer);
        if (bpm) { console.log(`   ✓ BPM from audio analysis: ${bpm}`); }
      }

      // Priority 3: Title string
      if (!bpm) {
        bpm = bpmFromTitle(mashup.title);
        if (bpm) { console.log(`   ✓ BPM from title: ${bpm}`); }
      }

      if (bpm) {
        await Mashup.findByIdAndUpdate(mashup._id, { bpm });
        console.log(`   ✅ Saved BPM ${bpm} for ${label}`);
        updated++;
      } else {
        console.log(`   ⚠ Could not detect BPM for ${label} — skipping`);
        failed++;
      }
    } catch (err) {
      console.error(`   ❌ Error processing ${label}:`, err.message);
      failed++;
    }
  }

  console.log(`\n─────────────────────────────────────`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`⚠  Skipped: ${failed}`);
  console.log(`─────────────────────────────────────`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
