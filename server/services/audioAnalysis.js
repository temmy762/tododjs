/**
 * Audio analysis dispatcher.
 *
 * The Essentia work itself lives unchanged in audioAnalysisCore.js; this
 * module's only job is to run it on a worker thread instead of the main one.
 *
 * Why: Essentia's KeyExtractor / RhythmExtractor2013 / Spectrum are
 * SYNCHRONOUS WASM calls, and audio-decode is CPU-bound too. Running them
 * inline froze the single Node event loop for the duration of every track.
 * Nothing else could be served while that happened — which is how Stripe
 * webhooks hit their ~20s timeout (184 failed deliveries over nine days,
 * ending with Stripe disabling the endpoint) and why uploads appeared to
 * stall. Moving the work to a worker keeps the event loop free to answer
 * requests while tracks are analysed.
 *
 * The worker is long-lived and reused: initialising the WASM module costs
 * real time, so spawning one per track would be slower than what it replaces.
 * Collection processing is already serialised (processingQueue, one at a
 * time), so a single worker matches the actual concurrency.
 *
 * Public API is unchanged, so callers (tonalityDetection, genreDetection)
 * need no modification.
 */
import { Worker } from 'worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = path.join(__dirname, 'audioAnalysisWorker.js');

// A track that cannot be analysed must not stall the whole upload pipeline.
const JOB_TIMEOUT_MS = (() => {
  const raw = parseInt(process.env.AUDIO_ANALYSIS_TIMEOUT_MS, 10);
  return Number.isFinite(raw) && raw > 0 ? raw : 120000;
})();

const EMPTY_AUDIO = { key: null, scale: null, camelot: null, bpm: null, confidence: 0 };
const EMPTY_GENRE = { genre: null, confidence: 0, features: null };

let worker = null;
let nextJobId = 1;
const pending = new Map();

function failAllPending(reason) {
  for (const [, job] of pending) {
    clearTimeout(job.timer);
    job.resolve(job.empty);
  }
  pending.clear();
  if (reason) console.error(`[audio-analysis] ${reason}`);
}

function getWorker() {
  if (worker) return worker;

  worker = new Worker(WORKER_PATH);

  worker.on('message', ({ id, ok, result, error }) => {
    const job = pending.get(id);
    if (!job) return;
    pending.delete(id);
    clearTimeout(job.timer);
    if (!ok) console.error(`[audio-analysis] worker error: ${error}`);
    job.resolve(ok ? result : job.empty);
  });

  // If the worker dies (OOM on a large track, native crash), drop the handle
  // so the next call starts a fresh one, and release anything still waiting
  // with the same empty result the inline version returned on failure.
  worker.on('error', (err) => {
    worker = null;
    failAllPending(`worker crashed: ${err?.message || err}`);
  });
  worker.on('exit', (code) => {
    worker = null;
    if (pending.size) failAllPending(`worker exited (code ${code}) with jobs in flight`);
  });

  worker.unref(); // never hold the process open

  return worker;
}

function run(type, mp3Buffer, empty) {
  if (!mp3Buffer || !mp3Buffer.length) return Promise.resolve(empty);

  return new Promise((resolve) => {
    let w;
    try {
      w = getWorker();
    } catch (e) {
      console.error(`[audio-analysis] could not start worker: ${e?.message || e}`);
      return resolve(empty);
    }

    const id = nextJobId++;
    const timer = setTimeout(() => {
      if (!pending.has(id)) return;
      pending.delete(id);
      console.error(`[audio-analysis] job ${id} (${type}) timed out after ${JOB_TIMEOUT_MS}ms — skipping track`);
      // Terminate so a wedged WASM call cannot block every later track; the
      // next request transparently spawns a fresh worker.
      try { w.terminate(); } catch { /* already gone */ }
      worker = null;
      resolve(empty);
    }, JOB_TIMEOUT_MS);

    pending.set(id, { resolve, timer, empty });
    w.postMessage({ id, type, buffer: mp3Buffer });
  });
}

/**
 * Analyze an MP3 buffer for key and BPM.
 * @param {Buffer} mp3Buffer - Raw MP3 file buffer
 * @returns {Promise<{key: string, scale: string, camelot: string, bpm: number, confidence: number}>}
 */
export function analyzeAudio(mp3Buffer) {
  if (process.env.ESSENTIA_ENABLED === 'false') return Promise.resolve(EMPTY_AUDIO);
  return run('audio', mp3Buffer, EMPTY_AUDIO);
}

/**
 * Analyze audio features for genre classification.
 * @param {Buffer} mp3Buffer - Raw MP3 file buffer
 * @returns {Promise<{genre: string, confidence: number, features: object}>}
 */
export function analyzeGenre(mp3Buffer) {
  if (process.env.ESSENTIA_ENABLED === 'false') return Promise.resolve(EMPTY_GENRE);
  return run('genre', mp3Buffer, EMPTY_GENRE);
}
