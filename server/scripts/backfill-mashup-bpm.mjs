/**
 * backfill-mashup-bpm.mjs
 * Finds all mashups with bpm = 0 or missing, downloads their audio from Wasabi,
 * runs the full BPM detection pipeline (ID3 → Essentia.js → filename), and saves.
 *
 * Run on VPS:
 *   node server/scripts/backfill-mashup-bpm.mjs
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { parseBuffer } from 'music-metadata';
import OpenAI from 'openai';

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

// ── OpenAI client ─────────────────────────────────────────────────────────
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 20000 })
  : null;

// ── Extract BPM from Essentia.js audio analysis ───────────────────────────
async function bpmFromAudio(buffer) {
  if (process.env.ESSENTIA_ENABLED === 'false') {
    console.log('   ⚠ Essentia disabled (ESSENTIA_ENABLED=false) — skipping audio analysis');
    return null;
  }
  try {
    const { analyzeAudio } = await import('../services/audioAnalysis.js');
    const result = await analyzeAudio(buffer);
    if (result?.bpm && result.bpm >= 60 && result.bpm <= 220) return Math.round(result.bpm);
  } catch (err) {
    console.log('   ⚠ Essentia analysis failed:', err.message);
  }
  return null;
}

// ── Estimate BPM via OpenAI from title + artist ───────────────────────────
async function bpmFromAI(title, artist) {
  if (!openai) {
    console.log('   ⚠ No OPENAI_API_KEY — skipping AI BPM estimation');
    return null;
  }
  try {
    console.log('   🤖 Asking OpenAI for BPM estimate...');
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a music expert specializing in DJ music. Given a track title and artist, estimate the BPM (beats per minute). Respond ONLY with valid JSON: {"bpm": <integer between 60 and 220>, "confidence": "high"|"medium"|"low"}. If you truly cannot estimate, use {"bpm": null, "confidence": "unknown"}.',
        },
        {
          role: 'user',
          content: `Track: "${title}" by ${artist}`,
        },
      ],
      temperature: 0,
      max_tokens: 60,
    });
    const raw = response.choices[0].message.content.trim();
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
    if (parsed.bpm && parsed.bpm >= 60 && parsed.bpm <= 220) {
      console.log(`   ✓ BPM from AI: ${parsed.bpm} (confidence: ${parsed.confidence})`);
      return Math.round(parsed.bpm);
    }
  } catch (err) {
    console.log('   ⚠ OpenAI BPM estimation failed:', err.message);
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

      // Priority 4: OpenAI AI estimation
      if (!bpm) {
        bpm = await bpmFromAI(mashup.title, mashup.artist);
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
