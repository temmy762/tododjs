/**
 * What Stripe was ACTUALLY PAID for — the one implementation.
 *
 * Extracted from audit-overgranted-access.mjs so the audit and the revocation
 * script cannot answer "is this account paid up?" differently. A revoker that
 * disagrees with the auditor by even a rounding rule would cut off paying
 * customers, and this codebase has already paid the price for letting one rule
 * exist in several places (see the nine copies of the access window, e5f9626).
 *
 * Nothing here writes. Callers decide what to do with the answer.
 */
import stripe from '../../config/stripe.js';

/**
 * Read an invoice's subscription id under BOTH shapes.
 *
 * Production's endpoints are on 2026-01-28.clover, where invoice.subscription
 * was removed; reading only the old name returns undefined on every live
 * object. See the note in controllers/stripeController.js.
 */
export const subIdOf = (inv) => {
  const raw = inv?.subscription ?? inv?.parent?.subscription_details?.subscription ?? null;
  return (raw && typeof raw === 'object' ? raw.id : raw) || null;
};

/**
 * The plan half of the entitlement question. hasActiveWindow deliberately does
 * NOT consider the plan, and 'free' must be excluded on BOTH fields — the string
 * is truthy, which is how a free-plan account once downloaded (f4f79ce).
 */
export const hasPaidPlan = (s = {}) =>
  Boolean((s.planId && s.planId !== 'free') || (s.plan && s.plan !== 'free'));

/**
 * The latest period the customer actually PAID for, according to Stripe.
 *
 * Walks paid invoices rather than the subscription object, because
 * handleSubscriptionDeleted nulls stripeSubscriptionId on cancellation — so a
 * cancelled account has no subscription id left to look up, only a customer id.
 * Invoices survive that.
 *
 * @returns {Promise<{paidThrough: number|null, invoice: string|null, source: string}>}
 */
export async function truePaidThrough(sub) {
  const customerId = sub.stripeCustomerId || null;
  const subscriptionId = sub.stripeSubscriptionId || null;

  let query;
  let source;
  if (customerId) {
    query = { customer: customerId, status: 'paid', limit: 100 };
    source = 'customer invoices';
  } else if (subscriptionId) {
    query = { subscription: subscriptionId, status: 'paid', limit: 100 };
    source = 'subscription invoices';
  } else {
    return { paidThrough: null, invoice: null, source: 'no Stripe ids on record' };
  }

  let best = null;
  let bestInvoice = null;
  for await (const inv of stripe.invoices.list(query)) {
    // Ignore invoices belonging to some OTHER subscription on the same customer.
    const invSub = subIdOf(inv);
    if (subscriptionId && invSub && invSub !== subscriptionId) continue;
    const end = inv.lines?.data?.[0]?.period?.end;
    if (!end) continue;
    if (best === null || end * 1000 > best) {
      best = end * 1000;
      bestInvoice = inv.id;
    }
  }
  return { paidThrough: best, invoice: bestInvoice, source };
}
