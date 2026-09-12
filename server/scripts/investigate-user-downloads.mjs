/**
 * Read-only investigation of one account's download activity.
 *
 * WHAT "VIOLATION" ACTUALLY MEANS HERE
 * ------------------------------------
 * There is no daily download cap. The only limits the platform enforces are
 * rate-based rolling windows, in downloadController:
 *
 *   ZIPs : 10 per 30 min  -> warning  |  15 per 30 min  -> 24h pause
 *   MP3s : 100 per 60 min -> warning  | 150 per 60 min  -> 24h pause
 *
 * plus the per-plan device limit. So a large 24-hour total is NOT by itself a
 * breach of any rule the system enforces — the dashboard alert is a heuristic
 * worth looking at, not a verdict. This script reports the numbers that decide
 * it: the worst rolling window the account ever hit, and whether the pattern
 * looks like one person working or like an account being shared or scripted.
 *
 * STRICTLY READ-ONLY. No writes, no --apply, no side effects.
 *
 * USAGE
 *   cd /var/www/tododjs/server
 *   node scripts/investigate-user-downloads.mjs --email someone@example.com
 *   node scripts/investigate-user-downloads.mjs --email someone@example.com --days 30
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Download from '../models/Download.js';

const argv = process.argv.slice(2);
const value = (name) => {
  const i = argv.indexOf('--' + name);
  return i !== -1 ? argv[i + 1] : null;
};

const email = value('email');
const days = value('days') ? parseInt(value('days'), 10) : 30;

if (!email) {
  console.error('Usage: node scripts/investigate-user-downloads.mjs --email someone@example.com [--days 30]');
  process.exit(1);
}

// Thresholds mirrored from downloadController so the report compares against
// what is actually enforced rather than a guess.
const ZIP_WINDOW_MS = 30 * 60 * 1000;
const MP3_WINDOW_MS = 60 * 60 * 1000;
const ZIP_L1 = 10, ZIP_L2 = 15;
const MP3_L1 = 100, MP3_L2 = 150;

const RULE = '='.repeat(76);
const iso = (d) => (d ? new Date(d).toISOString().slice(0, 16).replace('T', ' ') : '—');
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

await mongoose.connect(process.env.MONGODB_URI);

const user = await User.findOne({ email })
  .collation({ locale: 'en', strength: 2 })
  .lean();

if (!user) {
  console.log('No account found for ' + email);
  await mongoose.disconnect();
  process.exit(0);
}

const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
const downloads = await Download.find({ userId: user._id, createdAt: { $gte: since } })
  .select('createdAt fileType type trackId albumId ipAddress userAgent deviceBrowser deviceOS deviceName fileName')
  .sort({ createdAt: 1 })
  .lean();

console.log('READ-ONLY INVESTIGATION — no changes are made by this script.');
console.log('');
console.log(RULE);
console.log('ACCOUNT');
console.log(RULE);
const sub = user.subscription || {};
console.log('  email               ' + user.email);
console.log('  role                ' + user.role);
console.log('  account enabled     ' + (user.isActive === false ? 'NO (isActive=false)' : 'yes'));
console.log('  blocked             ' + (user.isBlocked ? 'YES — ' + (user.blockReason || 'no reason recorded') : 'no'));
console.log('  plan                ' + (sub.planId || sub.plan || 'free'));
console.log('  subscription status ' + (sub.status || '—'));
console.log('  paid through        ' + iso(sub.endDate));
console.log('  granted by admin    ' + (sub.grantedByAdmin ? 'yes' : 'no'));
console.log('  registered since    ' + iso(user.createdAt));
console.log('  last login          ' + iso(user.lastLogin));
console.log('');
console.log('  download warning    level ' + (user.downloadWarningLevel || 0));
console.log('  downloads suspended ' + (user.downloadSuspended ? 'YES until ' + iso(user.downloadPausedUntil) : 'no'));
console.log('  restrictions lifted ' + iso(user.downloadLiftedAt));

// ── Registered devices ──────────────────────────────────────────────────────
const devices = sub.devices || [];
console.log('');
console.log(RULE);
console.log('REGISTERED DEVICES (' + devices.length + ')');
console.log(RULE);
if (!devices.length) {
  console.log('  none recorded');
} else {
  for (const d of devices) {
    console.log('  ' + (d.deviceName || 'unnamed') + '  [' + (d.browser || '?') + ' / ' + (d.os || '?') + ']');
    console.log('      ip ' + (d.ipAddress || '—') + '   added ' + iso(d.addedAt) + '   last active ' + iso(d.lastActive));
  }
}

// ── Volume ──────────────────────────────────────────────────────────────────
const now = Date.now();
const in24h = downloads.filter(d => now - new Date(d.createdAt).getTime() <= 24 * 3600 * 1000);
const in7d = downloads.filter(d => now - new Date(d.createdAt).getTime() <= 7 * 24 * 3600 * 1000);
const mp3s = downloads.filter(d => d.fileType === 'MP3');
const zips = downloads.filter(d => d.fileType === 'ZIP');

console.log('');
console.log(RULE);
console.log('VOLUME (last ' + days + ' days)');
console.log(RULE);
console.log('  total downloads     ' + downloads.length + '   (MP3 ' + mp3s.length + ', ZIP ' + zips.length + ')');
console.log('  last 24h            ' + in24h.length);
console.log('  last 7d             ' + in7d.length);
if (downloads.length) {
  console.log('  first in window     ' + iso(downloads[0].createdAt));
  console.log('  most recent         ' + iso(downloads[downloads.length - 1].createdAt));
}

// ── Rolling-window peak: the only thing that defines a rule breach ──────────
// Two-pointer over time-sorted records: for each start, how many fall inside
// the window. This is what downloadController measures at request time.
function peakWindow(records, windowMs) {
  const times = records.map(r => new Date(r.createdAt).getTime());
  let best = 0, bestAt = null, left = 0;
  for (let right = 0; right < times.length; right++) {
    while (times[right] - times[left] >= windowMs) left++;
    const size = right - left + 1;
    if (size > best) { best = size; bestAt = times[left]; }
  }
  return { peak: best, at: bestAt };
}

const mp3Peak = peakWindow(mp3s, MP3_WINDOW_MS);
const zipPeak = peakWindow(zips, ZIP_WINDOW_MS);

const verdict = (peak, l1, l2) =>
  peak >= l2 ? 'BREACH — would trigger a 24h pause'
  : peak >= l1 ? 'over the warning line'
  : 'within limits';

console.log('');
console.log(RULE);
console.log('RATE LIMITS — the rules the platform actually enforces');
console.log(RULE);
console.log('  busiest 60 min of MP3s   ' + mp3Peak.peak + '  (warn at ' + MP3_L1 + ', pause at ' + MP3_L2 + ')  -> ' + verdict(mp3Peak.peak, MP3_L1, MP3_L2));
if (mp3Peak.at) console.log('      window started       ' + iso(mp3Peak.at));
console.log('  busiest 30 min of ZIPs   ' + zipPeak.peak + '  (warn at ' + ZIP_L1 + ', pause at ' + ZIP_L2 + ')  -> ' + verdict(zipPeak.peak, ZIP_L1, ZIP_L2));
if (zipPeak.at) console.log('      window started       ' + iso(zipPeak.at));
console.log('');
console.log('  NOTE: there is no daily cap. A large 24h total breaks no rule on');
console.log('  its own — only the windows above do.');

// ── Sharing signals ─────────────────────────────────────────────────────────
const tally = (list, key) => {
  const m = new Map();
  for (const d of list) {
    const k = d[key] || '(none)';
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

const byIp = tally(downloads, 'ipAddress');
const byAgent = tally(downloads, 'userAgent');
const byDevice = tally(downloads, 'deviceName');

console.log('');
console.log(RULE);
console.log('SHARING SIGNALS');
console.log(RULE);
console.log('  distinct IP addresses    ' + byIp.length);
for (const [ip, n] of byIp.slice(0, 8)) {
  console.log('      ' + String(ip).padEnd(24) + n + ' downloads (' + pct(n, downloads.length) + '%)');
}
if (byIp.length > 8) console.log('      ... and ' + (byIp.length - 8) + ' more');
console.log('  distinct devices         ' + byDevice.length);
for (const [d, n] of byDevice.slice(0, 6)) console.log('      ' + String(d).padEnd(24) + n);
console.log('  distinct user agents     ' + byAgent.length);

// Two different IPs inside the same hour is the strongest simple signal that
// one account is being used from two places at once. Mobile networks do
// change IP, so this is evidence to weigh, not proof.
const hourBuckets = new Map();
for (const d of downloads) {
  const h = Math.floor(new Date(d.createdAt).getTime() / 3600000);
  if (!hourBuckets.has(h)) hourBuckets.set(h, new Set());
  hourBuckets.get(h).add(d.ipAddress || '(none)');
}
const overlaps = [...hourBuckets.entries()].filter(([, ips]) => ips.size > 1);
console.log('  hours with >1 IP         ' + overlaps.length + ' of ' + hourBuckets.size + ' active hours');
for (const [h, ips] of overlaps.slice(0, 5)) {
  console.log('      ' + iso(new Date(h * 3600000)) + '  ' + [...ips].join(', '));
}

// ── Automation signals ──────────────────────────────────────────────────────
const gaps = [];
for (let i = 1; i < downloads.length; i++) {
  gaps.push(new Date(downloads[i].createdAt).getTime() - new Date(downloads[i - 1].createdAt).getTime());
}
const sub2s = gaps.filter(g => g < 2000).length;
const sub500ms = gaps.filter(g => g < 500).length;
const median = gaps.length ? [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : 0;

console.log('');
console.log(RULE);
console.log('AUTOMATION SIGNALS');
console.log(RULE);
console.log('  median gap between downloads   ' + (median / 1000).toFixed(1) + 's');
console.log('  gaps under 2s                  ' + sub2s + ' of ' + gaps.length);
console.log('  gaps under 0.5s                ' + sub500ms + ' of ' + gaps.length + '  (a human clicking cannot sustain this)');

const uniqueTracks = new Set(downloads.filter(d => d.trackId).map(d => String(d.trackId))).size;
const trackDownloads = downloads.filter(d => d.trackId).length;
console.log('  unique tracks / downloads      ' + uniqueTracks + ' / ' + trackDownloads +
  (trackDownloads > 0 && uniqueTracks < trackDownloads * 0.5 ? '   <- heavy re-downloading of the same files' : ''));

const byHourOfDay = new Array(24).fill(0);
for (const d of downloads) byHourOfDay[new Date(d.createdAt).getUTCHours()]++;
console.log('  downloads by hour (UTC)        ' + byHourOfDay.map((n, h) => n > 0 ? h + ':' + n : null).filter(Boolean).join('  '));

console.log('');
console.log(RULE);
console.log('WHAT THIS CANNOT TELL YOU');
console.log(RULE);
console.log('  Downloading cannot modify or damage a track. The download path');
console.log('  only reads from storage and writes a Download record; nothing in');
console.log('  it can alter a Track. Mass downloading is a redistribution');
console.log('  concern, not a data-integrity one.');
console.log('');
console.log('  This report cannot prove redistribution. It shows volume, rate,');
console.log('  and whether the pattern looks like one person or several.');

await mongoose.disconnect();
