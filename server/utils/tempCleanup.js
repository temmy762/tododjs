/**
 * Orphaned upload-temp sweeper.
 *
 * Uploaded ZIPs land in uploads/temp and are unlinked once processing
 * finishes. That cleanup is skipped whenever the process dies mid-job — a
 * crash, an OOM, or an ordinary pm2 restart — and the file is then orphaned
 * with nothing left to remove it. Production accumulated 23 GB this way.
 *
 * Sweeping on boot and periodically makes the leak self-correcting. Age is
 * the safety mechanism: a file still being uploaded or processed right now is
 * recent, so only clearly-abandoned files are removed.
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '..', 'uploads', 'temp');

const MAX_AGE_MS = (() => {
  const raw = parseInt(process.env.TEMP_MAX_AGE_HOURS, 10);
  const hours = Number.isFinite(raw) && raw > 0 ? raw : 24;
  return hours * 60 * 60 * 1000;
})();

export async function sweepTempUploads({ dryRun = false } = {}) {
  let removed = 0;
  let bytes = 0;
  let kept = 0;

  let entries;
  try {
    entries = await fs.readdir(TEMP_DIR);
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('[temp-sweep] cannot read temp dir:', e.message);
    return { removed, bytes, kept };
  }

  const cutoff = Date.now() - MAX_AGE_MS;
  for (const name of entries) {
    const file = path.join(TEMP_DIR, name);
    try {
      const st = await fs.stat(file);
      if (!st.isFile()) continue;
      // mtime, not birthtime: a file being appended to during a slow upload
      // keeps looking recent, so an in-progress transfer is never deleted.
      if (st.mtimeMs >= cutoff) { kept++; continue; }
      if (!dryRun) await fs.unlink(file);
      removed++;
      bytes += st.size;
    } catch (e) {
      if (e.code !== 'ENOENT') console.error(`[temp-sweep] ${name}: ${e.message}`);
    }
  }

  if (removed > 0) {
    console.log(
      `[temp-sweep] removed ${removed} orphaned upload(s), freed ` +
      `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB (${kept} recent file(s) kept)` +
      (dryRun ? ' [DRY RUN]' : '')
    );
  }
  return { removed, bytes, kept };
}

export function startTempSweeper({ intervalMs = 6 * 60 * 60 * 1000 } = {}) {
  const instance = process.env.NODE_APP_INSTANCE;
  if (instance !== undefined && instance !== '0') return; // one runner in cluster mode

  const run = () => sweepTempUploads().catch(e => console.error('[temp-sweep] failed:', e.message));
  run(); // clear anything left by the restart that just happened
  setInterval(run, intervalMs).unref?.();
}
