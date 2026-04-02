/**
 * Single-file processing queue for collection ZIP uploads.
 * Processes one collection at a time to avoid resource contention
 * (CPU, disk I/O, Wasabi bandwidth) that causes the "stuck at 5%" issue
 * when multiple ZIPs are uploaded simultaneously.
 */

import Collection from '../models/Collection.js';

const queue = [];
let activeJobs = 0;
const MAX_CONCURRENT = 1;

/**
 * Enqueue a collection for background processing.
 * If a slot is free, it starts immediately; otherwise it is held as 'queued'.
 */
export async function enqueueCollection(fn, collectionId) {
  if (activeJobs < MAX_CONCURRENT) {
    activeJobs++;
    _run(fn, collectionId);
  } else {
    // Mark collection as queued so the admin UI can show it
    Collection.findByIdAndUpdate(collectionId, {
      status: 'queued',
      processingProgress: 0
    }).catch(() => {});

    queue.push({ fn, collectionId });
    console.log(`📋 Collection ${collectionId} queued (${queue.length} waiting)`);
  }
}

async function _run(fn, collectionId) {
  console.log(`▶ Starting queued processing for collection ${collectionId}`);
  try {
    await fn();
  } catch (e) {
    console.error(`❌ Queue job error for ${collectionId}:`, e.message);
  } finally {
    activeJobs--;
    _drain();
  }
}

function _drain() {
  if (queue.length === 0 || activeJobs >= MAX_CONCURRENT) return;
  const next = queue.shift();
  activeJobs++;
  console.log(`▶ Dequeuing next collection ${next.collectionId} (${queue.length} still waiting)`);
  _run(next.fn, next.collectionId);
}

/** Returns current queue depth (not counting active job) */
export function queueDepth() {
  return queue.length;
}
