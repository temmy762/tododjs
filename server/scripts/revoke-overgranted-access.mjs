/**
 * Correct accounts whose endDate grants access Stripe was never paid for.
 *
 * WHAT IT DOES
 * ------------
 * For every account that currently HAS access, asks Stripe what the customer
 * actually paid for (latest PAID invoice period end, via lib/stripeTruth.mjs —
 * the same function the audit uses, so the two can never disagree) and, where
 * the stored endDate reaches beyond that, rewinds endDate to the truth.
 *
 * It only ever moves endDate BACKWARD, and only to a date Stripe can evidence.
 * It never extends access, never changes a plan, and never touches status —
 * requireSubscription flips a lapsed record to 'expired' on the next request,
 * and that existing machinery is left to do its job.
 *
 * WHY endDate AND NOT status
 * --------------------------
 * endDate is the poisoned field. Stripe advances current_period_end when it
 * ATTEMPTS a renewal, not when one succeeds, and until 0b7591f the webhook —
 * and until 95e5a2b the admin "Sync All from Stripe" button — copied it
 * unconditionally. The access gate is correct; it is reading a lie. Fix the
 * lie, not the gate.
 *
 * RECOVERY IS AUTOMATIC
 * ---------------------
 * If the customer's payment later succeeds, handleInvoicePaid sets status
 * 'active' and derives endDate from the paid invoice period — so a rewound
 * account restores itself with no manual step. Rewinding is therefore safe
 * even while Stripe is still retrying.
 *
 * WHAT IT DELIBERATELY WILL NOT TOUCH
 * -----------------------------------
 *   - admins (they bypass every gate by design)
 *   - accounts with NO paid invoice found — provenance unknown, a human
 *     decides; revoking on absence of evidence would cut off anyone whose
 *     Stripe ids are wrong (e.g. the "No such customer" mode-mismatch cases)
 *   - admin grants with no Stripe subscription — not Stripe-governed at all;
 *     give those an expiry in the admin panel instead
 *
 * USAGE
 *   cd /var/www/tododjs/server
 *   node scripts/revoke-overgranted-access.mjs                    # DRY RUN
 *   node scripts/revoke-overgranted-access.mjs --email a@b.com    # one account
 *   node scripts/revoke-overgranted-access.mjs --apply            # write
 *
 * Dry run is the default. Nothing is written without --apply.
 * Needs MONGODB_URI and STRIPE_SECRET_KEY (run from server/, see the audit).
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User, { hasActiveWindow } from '../models/User.js';
import { hasPaidPlan, truePaidThrough } from './lib/stripeTruth.mjs';

const argv = process.argv.slice(2);
const value = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : null;
};
const APPLY = argv.includes('--apply');
const onlyEmail = value('email');

const iso = (d) => (d ? new Date(d).toISOString().slice(0, 16) : '—');
const DAY = 24 * 60 * 60 * 1000;

// Ignore sub-hour differences. Invoice period ends and current_period_end can
// differ by seconds on the same paid period; rewinding for that would churn
// records and log noise without changing anyone's access.
const TOLERANCE_MS = 60 * 60 * 1000;

await mongoose.connect(process.env.MONGODB_URI);

console.log(APPLY
  ? '*** APPLY MODE — endDate will be rewound for the accounts listed below. ***'
  : 'DRY RUN — no writes. Re-run with --apply to act on this list.');
if (onlyEmail) console.log(`Filtered to ${onlyEmail}`);
console.log('');

// Case-insensitive exact match without a regex (collation, below).
const userQuery = onlyEmail ? { email: onlyEmail } : {};

const users = await User.find(userQuery)
  .select('email role subscription')
  .collation({ locale: 'en', strength: 2 })   // case-insensitive --email
  .lean();

const toFix = [];
const skipped = { admins: 0, noAccess: 0, noEvidence: [], adminGranted: [], correct: 0 };

for (const user of users) {
  const sub = user.subscription || {};

  if (user.role === 'admin') { skipped.admins++; continue; }

  // Only accounts that currently HAVE access can be over-granted.
  if (!hasPaidPlan(sub) || !hasActiveWindow(sub)) { skipped.noAccess++; continue; }

  // Admin grants with no Stripe subscription are not Stripe-governed; asking
  // Stripe what they paid is meaningless. Give them an expiry in the panel.
  if (sub.grantedByAdmin && !sub.stripeSubscriptionId && !sub.stripeCustomerId) {
    skipped.adminGranted.push(user.email);
    continue;
  }

  let truth;
  try {
    truth = await truePaidThrough(sub);
  } catch (err) {
    // A Stripe lookup failure is NOT evidence of non-payment. Leave it alone.
    skipped.noEvidence.push(`${user.email} (Stripe lookup failed: ${err.message})`);
    continue;
  }

  if (truth.paidThrough === null) {
    skipped.noEvidence.push(`${user.email} (${truth.source})`);
    continue;
  }

  const current = sub.endDate ? new Date(sub.endDate).getTime() : null;
  if (current === null) {
    // Access with no endDate at all is the permanent-grant shape, not a
    // poisoned date. Out of scope here — see the admin panel expiry field.
    skipped.adminGranted.push(`${user.email} (no endDate)`);
    continue;
  }

  if (current - truth.paidThrough <= TOLERANCE_MS) { skipped.correct++; continue; }

  toFix.push({
    _id: user._id,
    email: user.email,
    status: sub.status,
    plan: sub.planId || sub.plan,
    current,
    paidThrough: truth.paidThrough,
    invoice: truth.invoice,
    overGrantDays: Math.round((current - truth.paidThrough) / DAY),
  });
}

// ── Report ──────────────────────────────────────────────────────────────────
const RULE = '='.repeat(76);
console.log(RULE);
console.log(`TO CORRECT — endDate reaches beyond the last paid period  (${toFix.length})`);
console.log(RULE);
if (!toFix.length) {
  console.log('  none — every account with access is within a period Stripe was paid for.');
} else {
  for (const f of toFix) {
    console.log(`  ! ${f.email}   status=${f.status}  plan=${f.plan}`);
    console.log(`      endDate ${iso(f.current)}  ->  ${iso(f.paidThrough)}   (removes +${f.overGrantDays}d unpaid)`);
    console.log(`      evidence: paid invoice ${f.invoice}`);
  }
}
console.log('');

if (skipped.adminGranted.length) {
  console.log(`NOT TOUCHED — admin grants, not governed by Stripe  (${skipped.adminGranted.length})`);
  for (const e of skipped.adminGranted) console.log(`  · ${e}`);
  console.log('  Give these an expiry date in the admin panel instead.');
  console.log('');
}
if (skipped.noEvidence.length) {
  console.log(`NOT TOUCHED — no paid invoice found, provenance unknown  (${skipped.noEvidence.length})`);
  for (const e of skipped.noEvidence) console.log(`  ? ${e}`);
  console.log('  Absence of evidence is not evidence of non-payment. Decide these by hand.');
  console.log('');
}

// ── Apply ───────────────────────────────────────────────────────────────────
let written = 0;
if (APPLY && toFix.length) {
  for (const f of toFix) {
    // Atomic field update — never load-modify-save a whole user document here.
    // Two handlers doing that concurrently is how a renewal could be recorded
    // as paid and then immediately stamped back to past_due (handleInvoicePaid).
    const r = await User.updateOne(
      { _id: f._id },
      { $set: { 'subscription.endDate': new Date(f.paidThrough) } }
    );
    if (r.modifiedCount === 1) {
      written++;
      console.log(`[revoke] ${f.email}: endDate ${iso(f.current)} -> ${iso(f.paidThrough)}`);
    } else {
      console.warn(`[revoke] ${f.email}: no document modified (changed under us?) — re-run the audit`);
    }
  }
  console.log('');
}

console.log(RULE);
console.log('SUMMARY');
console.log(RULE);
console.log(`  accounts examined                  ${users.length}`);
console.log(`  correct — inside a paid period     ${skipped.correct}`);
console.log(`  TO CORRECT                         ${toFix.length}`);
console.log(`  admin grants (not Stripe-governed) ${skipped.adminGranted.length}`);
console.log(`  no Stripe evidence                 ${skipped.noEvidence.length}`);
console.log(`  skipped: admins ${skipped.admins}, no access ${skipped.noAccess}`);
console.log('');
if (APPLY) {
  console.log(`  WROTE ${written} record(s).`);
  console.log('  Access ends immediately (grace is zero). If Stripe later collects,');
  console.log('  handleInvoicePaid restores access automatically — no manual step.');
} else {
  console.log('  No changes were made. Re-run with --apply to write.');
}

await mongoose.disconnect();
