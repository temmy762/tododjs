/**
 * Post-outage sweep: find customers short-changed while webhooks were dead.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE RECONCILER
 * ---------------------------------------------
 * services/subscriptionReconciler.js walks stripe.subscriptions.list({status:
 * 'active'}). That finds anyone whose subscription is active RIGHT NOW, which
 * is the right backstop for a missed renewal. It cannot see:
 *
 *   - a subscription that has since lapsed, been cancelled, or gone unpaid —
 *     the customer paid for a period, never received it, and by the time
 *     anyone looks Stripe no longer lists them as active;
 *   - a paid invoice belonging to no TodoDJS account at all.
 *
 * Both webhook endpoints were disabled in Stripe, so NOTHING was delivered for
 * the whole outage. Every payment in that window is suspect, not just the ones
 * still active today. This walks PAID INVOICES instead — an invoice is the
 * durable record of payment and survives the subscription lapsing.
 *
 * SAFETY
 * ------
 * Read-only unless --apply. --apply only ever RESTORES access, and only for the
 * unambiguous case: the customer paid through a date still in the future and
 * our record falls short of it. It never revokes, never shortens an endDate,
 * and never touches a plan the customer already holds.
 *
 * Shortfalls whose paid-through date has already passed CANNOT be repaired by
 * writing to the database — that access window is gone. They are reported
 * under PAST SHORTFALL for a human decision (goodwill credit, refund, apology),
 * because that is a business call and not a data fix.
 *
 * USAGE
 *   node server/scripts/sweep-webhook-outage.mjs                     # dry run, last 90d
 *   node server/scripts/sweep-webhook-outage.mjs --since 2026-07-01  # explicit window
 *   node server/scripts/sweep-webhook-outage.mjs --apply             # restore what is restorable
 *   node server/scripts/sweep-webhook-outage.mjs --email a@b.com     # one account
 *   node server/scripts/sweep-webhook-outage.mjs --csv out.csv       # export the findings
 *
 * Set --since to when the endpoints were disabled (Stripe dashboard shows it).
 */
import 'dotenv/config';
import fs from 'fs';
import mongoose from 'mongoose';
import stripe from '../config/stripe.js';
import User from '../models/User.js';
import SubscriptionPlan from '../models/SubscriptionPlan.js';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : null;
};

const apply = flag('apply');
const onlyEmail = value('email');
const csvPath = value('csv');
const sinceArg = value('since');
const since = sinceArg
  ? Math.floor(new Date(sinceArg).getTime() / 1000)
  : Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000);

if (Number.isNaN(since)) {
  console.error(`--since "${sinceArg}" is not a valid date (use YYYY-MM-DD)`);
  process.exit(1);
}

const DAY = 24 * 60 * 60 * 1000;
const iso = (d) => (d ? new Date(d).toISOString().slice(0, 16) : '—');
const days = (ms) => Math.round(ms / DAY);

// Describe the gap between what was paid for and what the record grants.
//
// An account with NO endDate is the severe case, not a zero-length one: it
// grants no access at all, so the entire billed period went undelivered. It
// gets its own wording rather than being rendered as "record ends —", which
// read as a formatting blank rather than as the finding it is.
function describeGap(r, verb = 'short') {
  if (r.noEndDate) {
    const span = r.shortfallDays !== null ? `${r.shortfallDays}d billed period` : 'billed period';
    return `record has NO endDate — entire ${span} ${verb} (account grants no access)`;
  }
  return `record ends ${iso(r.dbEnd)}  (${r.shortfallDays}d ${verb})`;
}

// Same both-shapes readers as the webhook handlers: this script must work
// against payloads and objects from either API version. See the note in
// controllers/stripeController.js.
const subIdOf = (inv) => {
  const raw = inv?.subscription ?? inv?.parent?.subscription_details?.subscription ?? null;
  return (raw && typeof raw === 'object' ? raw.id : raw) || null;
};
const priceIdOf = (inv) => {
  const line = inv?.lines?.data?.[0];
  const raw = line?.price?.id ?? line?.pricing?.price_details?.price ?? null;
  return (raw && typeof raw === 'object' ? raw.id : raw) || null;
};

await mongoose.connect(process.env.MONGODB_URI);

const plans = await SubscriptionPlan.find({}).lean();
const priceToPlan = Object.fromEntries(plans.filter(p => p.stripePriceId).map(p => [p.stripePriceId, p]));

console.log(`Sweeping paid invoices created since ${iso(since * 1000)}${apply ? '' : '   [DRY RUN — no writes]'}`);
if (onlyEmail) console.log(`Filtered to ${onlyEmail}`);
console.log('');

const findings = { noAccount: [], restorable: [], pastShortfall: [], noHistory: [], ok: 0, scanned: 0 };

for await (const inv of stripe.invoices.list({ status: 'paid', created: { gte: since }, limit: 100 })) {
  findings.scanned++;

  const customerId = typeof inv.customer === 'object' ? inv.customer?.id : inv.customer;
  const email = inv.customer_email || null;
  if (onlyEmail && email?.toLowerCase() !== onlyEmail.toLowerCase()) continue;

  const paidThroughMs = inv.lines?.data?.[0]?.period?.end
    ? inv.lines.data[0].period.end * 1000
    : null;
  if (!paidThroughMs) continue; // no billable period on this invoice — nothing to compare
  // Start of the period this invoice paid for. Needed to size the shortfall
  // when our record has no endDate at all — see below.
  const periodStartMs = inv.lines?.data?.[0]?.period?.start
    ? inv.lines.data[0].period.start * 1000
    : null;

  // Locate the account: stripeCustomerId first, then email. Email is the
  // fallback the reconciler uses and catches records whose Stripe ids were
  // never persisted (a webhook that never ran is exactly how that happens).
  let user = customerId
    ? await User.findOne({ 'subscription.stripeCustomerId': customerId })
    : null;
  if (!user && email) {
    user = await User.findOne({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
  }

  if (!user) {
    findings.noAccount.push({ email, invoice: inv.id, amount: (inv.amount_paid ?? 0) / 100, currency: inv.currency, paidThrough: paidThroughMs });
    continue;
  }

  // Informational: did the webhook ever record this payment? handleInvoicePaid
  // keys history on the invoice id; handleCheckoutCompleted keys the FIRST
  // invoice on the checkout session id instead, so a missing row on a
  // subscription_create invoice is expected and not evidence of anything.
  const recorded = (user.subscriptionHistory || []).some(h => h.stripePaymentIntentId === inv.id);
  if (!recorded && inv.billing_reason !== 'subscription_create') {
    findings.noHistory.push({ email: user.email, invoice: inv.id, reason: inv.billing_reason });
  }

  const dbEndMs = user.subscription?.endDate ? new Date(user.subscription.endDate).getTime() : null;
  const short = dbEndMs === null || dbEndMs < paidThroughMs - 60 * 1000; // ignore sub-minute drift
  if (!short) { findings.ok++; continue; }

  const plan = priceToPlan[priceIdOf(inv)] || null;
  const row = {
    email: user.email,
    userId: String(user._id),
    invoice: inv.id,
    reason: inv.billing_reason,
    amount: (inv.amount_paid ?? 0) / 100,
    currency: inv.currency,
    paidThrough: paidThroughMs,
    dbEnd: dbEndMs,
    // Size of the shortfall, measured from whichever point access actually
    // stopped.
    //
    // With an endDate present that is simply paidThrough - endDate. With NO
    // endDate the record grants no access at all, so the whole billed period
    // went undelivered and the reference point is the period START. Using
    // `dbEnd ?? paidThrough` here (as this did) made that case evaluate to
    // paidThrough - paidThrough = 0, and the report then said "0d never
    // delivered" about the accounts that had received nothing whatsoever —
    // the worst rows in the output looked like the most harmless.
    noEndDate: dbEndMs === null,
    shortfallDays: dbEndMs !== null
      ? days(paidThroughMs - dbEndMs)
      : (periodStartMs !== null ? days(paidThroughMs - periodStartMs) : null),
    dbStatus: user.subscription?.status || null,
    dbPlanId: user.subscription?.planId || null,
    resolvedPlan: plan?.planId || null,
    subscriptionId: subIdOf(inv),
  };

  // Only a paid-through date still in the FUTURE can be repaired by writing to
  // the database. A window that has already closed cannot be given back.
  if (paidThroughMs > Date.now()) {
    findings.restorable.push(row);
    if (apply) {
      const set = {
        'subscription.status': 'active',
        'subscription.endDate': new Date(paidThroughMs),
      };
      // Restore the plan only if missing — never overwrite one the customer holds.
      if ((!user.subscription?.planId || user.subscription.planId === 'free') && plan) {
        set['subscription.planId'] = plan.planId;
        set['subscription.plan'] = plan.planId;
        if (plan.features?.maxDevices) set.maxDevices = plan.features.maxDevices;
      }
      // Persist Stripe ids the missed webhook never wrote.
      const sid = subIdOf(inv);
      if (sid && !user.subscription?.stripeSubscriptionId) set['subscription.stripeSubscriptionId'] = sid;
      if (customerId && !user.subscription?.stripeCustomerId) set['subscription.stripeCustomerId'] = customerId;

      await User.updateOne({ _id: user._id }, { $set: set });
      row.applied = true;
    }
  } else {
    findings.pastShortfall.push(row);
  }
}

// ── Report ──────────────────────────────────────────────────────────────────
const section = (t) => console.log(`\n${'='.repeat(72)}\n${t}\n${'='.repeat(72)}`);

section(`RESTORABLE — paid through a future date, access falls short  (${findings.restorable.length})`);
if (!findings.restorable.length) console.log('  none');
for (const r of findings.restorable) {
  console.log(`  ${r.applied ? '✓ fixed ' : '· would fix'} ${r.email}`);
  console.log(`      paid through ${iso(r.paidThrough)}  ${describeGap(r)}`);
  console.log(`      status=${r.dbStatus}  planId=${r.dbPlanId ?? 'null'}${!r.dbPlanId && r.resolvedPlan ? ` -> restore ${r.resolvedPlan}` : ''}  ${r.amount} ${r.currency}`);
}

section(`PAST SHORTFALL — paid for a window that has already closed  (${findings.pastShortfall.length})`);
console.log('  Cannot be fixed by a database write: the access period is gone.');
console.log('  These customers paid and did not receive what they paid for.\n');
if (!findings.pastShortfall.length) console.log('  none');
for (const r of findings.pastShortfall) {
  console.log(`  ! ${r.email}  ${r.amount} ${r.currency}  invoice ${r.invoice}`);
  console.log(`      paid through ${iso(r.paidThrough)}  ${describeGap(r, 'never delivered')}`);
}

section(`PAID BUT NO TODODJS ACCOUNT  (${findings.noAccount.length})`);
if (!findings.noAccount.length) console.log('  none');
for (const r of findings.noAccount) {
  console.log(`  ! ${r.email || '(no email on invoice)'}  ${r.amount} ${r.currency}  invoice ${r.invoice}  paid through ${iso(r.paidThrough)}`);
}

section(`NO HISTORY ROW — evidence of the missed webhook  (${findings.noHistory.length})`);
console.log('  Informational. Access may still be correct; this only shows the');
console.log('  payment was never recorded locally.\n');
if (!findings.noHistory.length) console.log('  none');
for (const r of findings.noHistory.slice(0, 40)) console.log(`  · ${r.email}  ${r.invoice}  (${r.reason})`);
if (findings.noHistory.length > 40) console.log(`  … and ${findings.noHistory.length - 40} more`);

section('SUMMARY');
console.log(`  invoices scanned    ${findings.scanned}`);
console.log(`  access correct      ${findings.ok}`);
console.log(`  ${apply ? 'restored' : 'restorable'}          ${findings.restorable.length}`);
console.log(`  past shortfall      ${findings.pastShortfall.length}   <- needs a human decision`);
console.log(`  paid, no account    ${findings.noAccount.length}`);
console.log(`  unrecorded payments ${findings.noHistory.length}`);
if (!apply && findings.restorable.length) console.log(`\n  Re-run with --apply to restore the ${findings.restorable.length} repairable account(s).`);

if (csvPath) {
  const rows = [
    ['category', 'email', 'invoice', 'amount', 'currency', 'paidThrough', 'dbEnd', 'shortfallDays', 'noEndDate', 'dbStatus', 'dbPlanId'],
    ...findings.restorable.map(r => ['restorable', r.email, r.invoice, r.amount, r.currency, iso(r.paidThrough), r.noEndDate ? 'NONE' : iso(r.dbEnd), r.shortfallDays, r.noEndDate, r.dbStatus, r.dbPlanId]),
    ...findings.pastShortfall.map(r => ['past_shortfall', r.email, r.invoice, r.amount, r.currency, iso(r.paidThrough), r.noEndDate ? 'NONE' : iso(r.dbEnd), r.shortfallDays, r.noEndDate, r.dbStatus, r.dbPlanId]),
    ...findings.noAccount.map(r => ['no_account', r.email || '', r.invoice, r.amount, r.currency, iso(r.paidThrough), '', '', '', '', '']),
  ];
  fs.writeFileSync(csvPath, rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'));
  console.log(`\n  CSV written to ${csvPath}`);
}

await mongoose.disconnect();
