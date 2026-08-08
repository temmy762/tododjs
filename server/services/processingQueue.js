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
 * Fail over any job left mid-flight by a previous process.
 *
 * This queue lives only in memory, so a crash, deploy or pm2 restart destroys
 * it — but the Collection document is left saying 'queued' or 'processing'
 * with nothing alive to advance it. The upload modal polls that status every
 * few seconds, so it sits on "Server queue — waiting" forever and the admin
 * has no indication anything went wrong. Marking these failed at boot turns a
 * silent hang into a visible, retryable error.
 *
 * Safe because it runs before this process accepts uploads: anything still
 * 'queued'/'processing' at that moment provably belongs to a dead process.
 */
export async function recoverOrphanedJobs() {
  const instance = process.env.NODE_APP_INSTANCE;
  if (instance !== undefined && instance !== '0') return; // one runner in cluster mode

  try {
    const res = await Collection.updateMany(
      { status: { $in: ['queued', 'processing'] } },
      {
        $set: {
          status: 'failed',
          errorMessage: 'Processing was interrupted by a server restart. Please re-upload or retry this collection.',
        },
      }
    );
    if (res.modifiedCount > 0) {
      console.log(`[queue] recovered ${res.modifiedCount} collection(s) orphaned by a previous restart — marked failed`);
    }
  } catch (e) {
    console.error('[queue] orphan recovery failed:', e.message);
  }
}

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
