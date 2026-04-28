/**
 * Smoke-test for tonality AI fallbacks (OpenAI web-search + Google Gemini).
 * Run from server/ directory: node scripts/testGemini.mjs
 */
import 'dotenv/config';
import { detectTonalityWithWebSearch, detectTonalityWithGemini } from '../services/openai.js';

const TEST_TRACK = { title: 'Gasolina', artist: 'Daddy Yankee' };

console.log('\n══════════════════════════════════════════');
console.log('  Tonality AI Fallback — Smoke Test');
console.log('══════════════════════════════════════════\n');

// ── OpenAI Web Search ──────────────────────────
if (process.env.OPENAI_API_KEY) {
  process.stdout.write(`🌐  OpenAI web-search  →  `);
  try {
    const r = await detectTonalityWithWebSearch(TEST_TRACK.title, TEST_TRACK.artist);
    if (r?.camelot) {
      console.log(`✅  ${r.camelot} (${r.key} ${r.scale}) | BPM: ${r.bpm ?? '—'} | confidence: ${r.confidence} | source: ${r.source}`);
    } else {
      console.log(`⚠️   No key returned`);
    }
  } catch (err) {
    console.log(`❌  ${err.message}`);
  }
} else {
  console.log('🌐  OpenAI web-search  →  ⏭  OPENAI_API_KEY not set, skipped');
}

// ── Google Gemini ──────────────────────────────
if (process.env.GOOGLE_AI_API_KEY) {
  process.env.GOOGLE_AI_MODEL = 'gemini-2.0-flash-lite';
  process.stdout.write(`🤖  Google Gemini     →  `);
  try {
    const r = await detectTonalityWithGemini(TEST_TRACK.title, TEST_TRACK.artist);
    if (r?.camelot) {
      console.log(`✅  ${r.camelot} (${r.key} ${r.scale}) | confidence: ${r.confidence} | source: ${r.source}`);
    } else {
      console.log(`⚠️   No key returned`);
    }
  } catch (err) {
    console.log(`❌  ${err.message}`);
  }
} else {
  console.log('🤖  Google Gemini     →  ⏭  GOOGLE_AI_API_KEY not set, skipped');
}

console.log('\n✓ Done\n');
