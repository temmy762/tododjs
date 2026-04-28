/**
 * Smoke-test for OpenAI web-search tonality detection.
 * Run from server/ directory: node scripts/testGemini.mjs
 */
import 'dotenv/config';
import { detectTonalityWithWebSearch } from '../services/openai.js';

const TEST_TRACK = { title: 'Gasolina', artist: 'Daddy Yankee' };

console.log('\n══════════════════════════════════════════');
console.log('  Tonality Web-Search — Smoke Test');
console.log('══════════════════════════════════════════\n');

if (!process.env.OPENAI_API_KEY) {
  console.error('❌  OPENAI_API_KEY not set in .env\n');
  process.exit(1);
}

process.stdout.write(`🌐  OpenAI web-search  →  `);
try {
  const r = await detectTonalityWithWebSearch(TEST_TRACK.title, TEST_TRACK.artist);
  if (r?.camelot) {
    console.log(`✅  ${r.camelot} (${r.key} ${r.scale}) | BPM: ${r.bpm ?? '—'} | confidence: ${r.confidence}`);
  } else {
    console.log(`⚠️   No key returned`);
  }
} catch (err) {
  console.log(`❌  ${err.message}`);
}

console.log('\n✓ Done\n');
