/**
 * Access drift monitor — the reverse of the reconciler.
 *
 * subscriptionReconciler asks "who has paid at Stripe but is not active here?"
 * and repairs them. It walks stripe.subscriptions.list({ status: 'active' }),
 * so it structurally CANNOT see the opposite case: an account this database
 * grants access to that Stripe was never paid for. A cancelled or lapsed
 * customer is simply not in the list it reads.
 *
 * That blind spot is how an account carried a month of unpaid access unnoticed
 * until someone ran an audit by hand. This job closes the loop by periodically
 * asking the reverse question.
 *
 * REPORTS, NEVER REVOKES.
 * The reconciler's own header states the principle: wrongly cutting off a
 * paying customer is far worse than briefly over-granting, so this direction
 * deserves a human look. Revocation stays a deliberate act — see
 * scripts/revoke-overgranted-access.mjs, which is dry-run by default.
 *
 * Uses the same truePaidThrough as the audit and the revoker (utils/stripeTruth.js)
 * so all three agree on what "paid up" means.
 */
import User, { hasActiveWindow } from '../models/User.js';
import { hasPaidPlan, truePaidThrough } from '../utils/stripeTruth.js';
import { sendNotificationEmail } from './emailService.js';

// Ignore sub-hour differences: invoice period ends and current_period_end can
// differ by seconds on the same paid period.
const TOLERANCE_MS = 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

/**
 * @param {{ limit?: number }} opts
 * @returns {Promise<{checked:number, drift:Array, adminGranted:Array, noEvidence:Array, ok:number}>}
 */
export async function detectAccessDrift({ limit } = {}) {
  const report = { checked: 0, drift: [], adminGranted: [], noEvidence: [], ok: 0 };

  // Only accounts that currently HAVE access can be over-granted. Selecting
  // narrowly keeps this cheap: one Stripe invoice listing per candidate, not
  // per user in the database.
  const users = await User.find({ role: { $ne: 'admin' } })
    .select('email role subscription')
    .lean();

  for (const user of users) {
    if (limit && report.checked >= limit) break;
    const sub = user.subscription || {};
    if (!hasPaidPlan(sub) || !hasActiveWindow(sub)) continue;

    report.checked++;

    // Admin grants are not Stripe-governed; asking Stripe what they paid is
    // meaningless. They are surfaced separately because a permanent grant is
    // still worth a periodic human glance.
    if (sub.grantedByAdmin && !sub.stripeSubscriptionId && !sub.stripeCustomerId) {
      report.adminGranted.push({ email: user.email, plan: sub.planId || sub.plan, endDate: sub.endDate || null });
      continue;
    }

    let truth;
    try {
      truth = await truePaidThrough(sub);
    } catch (err) {
      // A Stripe lookup failure is NOT evidence of non-payment.
      report.noEvidence.push({ email: user.email, reason: `Stripe lookup failed: ${err.message}` });
      continue;
    }

    if (truth.paidThrough === null) {
      report.noEvidence.push({ email: user.email, reason: truth.source });
      continue;
    }

    const current = sub.endDate ? new Date(sub.endDate).getTime() : null;
    if (current === null) {
      report.adminGranted.push({ email: user.email, plan: sub.planId || sub.plan, endDate: null });
      continue;
    }

    if (current - truth.paidThrough <= TOLERANCE_MS) { report.ok++; continue; }

    report.drift.push({
      email: user.email,
      status: sub.status,
      plan: sub.planId || sub.plan,
      grantedUntil: new Date(current).toISOString(),
      paidThrough: new Date(truth.paidThrough).toISOString(),
      overGrantDays: Math.round((current - truth.paidThrough) / DAY),
      invoice: truth.invoice,
    });
  }

  return report;
}

/** Human-readable summary, used for both the log line and the admin email. */
function formatReport(report) {
  const lines = [];
  lines.push(`Accounts with access checked: ${report.checked}`);
  lines.push(`Correct (inside a paid period): ${report.ok}`);
  lines.push(`OVER-GRANTED: ${report.drift.length}`);
  lines.push(`Admin grants (not Stripe-governed): ${report.adminGranted.length}`);
  lines.push(`No Stripe evidence: ${report.noEvidence.length}`);

  if (report.drift.length) {
    lines.push('');
    lines.push('OVER-GRANTED — access continues past the last period Stripe was paid for:');
    for (const d of report.drift) {
      lines.push(`  ${d.email}  status=${d.status} plan=${d.plan}`);
      lines.push(`    paid through ${d.paidThrough.slice(0, 16)} but granted until ${d.grantedUntil.slice(0, 16)} (+${d.overGrantDays}d)`);
    }
    lines.push('');
    lines.push('To correct, on the server:');
    lines.push('  cd /var/www/tododjs/server');
    lines.push('  node scripts/revoke-overgranted-access.mjs           # dry run');
    lines.push('  node scripts/revoke-overgranted-access.mjs --apply   # write');
  }
  if (report.noEvidence.length) {
    lines.push('');
    lines.push('NO STRIPE EVIDENCE — decide by hand, do not assume non-payment:');
    for (const n of report.noEvidence) lines.push(`  ${n.email} — ${n.reason}`);
  }
  return lines.join('\n');
}

/**
 * Run a pass, log it, and email the admin only when something needs a decision.
 * A clean run logs one line and sends nothing — an alert that fires every day
 * stops being read.
 */
export async function runAccessDriftPass() {
  const started = Date.now();
  const report = await detectAccessDrift();
  const seconds = Math.round((Date.now() - started) / 1000);

  const needsAttention = report.drift.length > 0 || report.noEvidence.length > 0;

  console.log(
    `[access-drift] checked ${report.checked} account(s) in ${seconds}s — ` +
    `ok ${report.ok}, over-granted ${report.drift.length}, ` +
    `admin-granted ${report.adminGranted.length}, no-evidence ${report.noEvidence.length}`
  );
  for (const d of report.drift) {
    console.warn(
      `[access-drift] OVER-GRANTED ${d.email}: paid through ${d.paidThrough.slice(0, 16)}, ` +
      `granted until ${d.grantedUntil.slice(0, 16)} (+${d.overGrantDays}d)`
    );
  }

  if (needsAttention && process.env.ADMIN_EMAIL) {
    try {
      await sendNotificationEmail(
        process.env.ADMIN_EMAIL,
        `TodoDJs: ${report.drift.length} account(s) with access Stripe did not pay for`,
        formatReport(report)
      );
    } catch (err) {
      console.error('[access-drift] failed to send admin report:', err.message);
    }
  }

  return report;
}

/**
 * Schedule the pass. Mirrors startSubscriptionReconciler: only the designated
 * PM2 cluster instance runs it, so two workers do not both hammer the Stripe
 * invoice API and send duplicate reports.
 */
export function startAccessDriftMonitor({ intervalMs = 24 * 60 * 60 * 1000, startupDelayMs = 5 * 60 * 1000 } = {}) {
  const instance = process.env.NODE_APP_INSTANCE;
  if (instance !== undefined && instance !== '0') {
    console.log(`[access-drift] instance ${instance} — not the designated runner, skipping`);
    return;
  }

  const run = () => runAccessDriftPass().catch(e => console.error('[access-drift] run failed:', e.message));
  // Well after boot and after the reconciler's first pass, so the two never
  // contend and drift is measured against a settled state.
  setTimeout(run, startupDelayMs).unref?.();
  setInterval(run, intervalMs).unref?.();
  console.log(`[access-drift] scheduled every ${Math.round(intervalMs / 3600000)}h (first run in ${Math.round(startupDelayMs / 60000)}m)`);
}
