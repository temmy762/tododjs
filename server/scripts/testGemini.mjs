/**
 * Quick smoke-test for the Google Gemini tonality detection.
 * Run from server/ directory: node scripts/testGemini.mjs
 */
import 'dotenv/config';
import { detectTonalityWithGemini } from '../services/openai.js';

const TEST_TRACKS = [
  { title: 'Gasolina',        artist: 'Daddy Yankee' },
  { title: 'Blinding Lights', artist: 'The Weeknd' },
  { title: 'Despacito',       artist: 'Luis Fonsi ft. Daddy Yankee' },
  { title: 'Some Random Track That Probably Doesnt Exist XYZ123', artist: 'Nobody' },
];

if (!process.env.GOOGLE_AI_API_KEY) {
  console.error('\n❌  GOOGLE_AI_API_KEY is not set in .env — add it and retry.\n');
  process.exit(1);
}

// Override model for this test to ensure we use a supported current model
process.env.GOOGLE_AI_MODEL = 'gemini-2.0-flash-lite';

console.log(`\n🔑  API key found: ${process.env.GOOGLE_AI_API_KEY.slice(0, 8)}…`);
console.log(`🤖  Model: ${process.env.GOOGLE_AI_MODEL}\n`);

for (const track of TEST_TRACKS) {
  process.stdout.write(`  Testing: "${track.title}" by ${track.artist}  →  `);
  try {
    const result = await detectTonalityWithGemini(track.title, track.artist);
    if (result?.camelot) {
      console.log(`✅  ${result.camelot} (${result.key} ${result.scale}) | confidence: ${result.confidence} | source: ${result.source}`);
    } else {
      console.log(`⚠️   No key detected (expected for unknown track)`);
    }
  } catch (err) {
    console.log(`❌  Error: ${err.message}`);
  }
}

console.log('\n✓ Test complete\n');
