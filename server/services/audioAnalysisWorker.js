/**
 * Worker-thread entry point for Essentia audio analysis.
 *
 * Runs the CPU-bound WASM work (key/BPM/spectral extraction) off the main
 * thread. See audioAnalysis.js for why this matters — in short, these calls
 * are synchronous and were freezing the whole server, which timed out Stripe
 * webhooks and stalled uploads.
 *
 * Protocol: { id, type: 'audio'|'genre', buffer } in,
 *           { id, ok, result } or { id, ok: false, error } out.
 */
import { parentPort } from 'worker_threads';
import { analyzeAudio, analyzeGenre } from './audioAnalysisCore.js';

if (!parentPort) {
  throw new Error('audioAnalysisWorker must be run as a worker thread');
}

parentPort.on('message', async ({ id, type, buffer }) => {
  try {
    // Buffers arrive structured-cloned as Uint8Array; the analysis code and
    // audio-decode both expect a Node Buffer.
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const result = type === 'genre' ? await analyzeGenre(buf) : await analyzeAudio(buf);
    parentPort.postMessage({ id, ok: true, result });
  } catch (error) {
    parentPort.postMessage({ id, ok: false, error: error?.message || String(error) });
  }
});
