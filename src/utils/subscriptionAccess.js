/**
 * Client-side mirror of the server's subscription access window.
 *
 * Keep in step with `hasActiveWindow` in server/models/User.js — that is the
 * authority; this exists only so the UI can label an account without waiting on
 * a round trip.
 *
 * GRACE IS ZERO by policy: access ends the moment the paid period ends, and an
 * unpaid renewal grants nothing. This was previously hardcoded as 10 days in
 * five separate components, left behind when the policy changed on the server.
 * The UI therefore showed "Active" and a crown for up to ten days after the
 * backend had started returning 403 on every download.
 *
 * If SUBSCRIPTION_GRACE_DAYS is ever set on the server, this constant must be
 * changed to match, or the two disagree again in exactly the same way. Better
 * still, have the status endpoint publish the window and read it from there.
 */
const PAST_DUE_GRACE_MS = 0;

/**
 * Does this subscription's status and dates grant access right now?
 * Does NOT consider the plan — see hasPaidPlan.
 *
 * @param {object} subscription - the user's `subscription` object
 */
export function hasActiveWindow(subscription) {
  if (!subscription) return false;
  const end = subscription.endDate ? new Date(subscription.endDate).getTime() : null;
  const now = Date.now();
  const isWithinPeriod = end !== null && now <= end;
  const msSinceExpiry = end !== null ? now - end : null;

  // Bounded at both ends: `now - end < GRACE` alone is also true for a FUTURE
  // endDate, which is how past_due accounts kept access indefinitely.
  const isPastDueInGrace =
    subscription.status === 'past_due' &&
    msSinceExpiry !== null &&
    msSinceExpiry >= 0 &&
    msSinceExpiry < PAST_DUE_GRACE_MS;

  // 'active' past its own endDate is stale data, not entitlement.
  if (subscription.status === 'active' && end !== null && !isWithinPeriod) return false;

  return (
    subscription.status === 'active' ||
    // past_due inside the period already paid for keeps access; the failed
    // renewal concerns the NEXT period.
    (subscription.status === 'past_due' && isWithinPeriod) ||
    (subscription.status === 'cancelled' && isWithinPeriod) ||
    isPastDueInGrace
  );
}

/**
 * Is there a paid plan at all? 'free' must be excluded on BOTH fields — the
 * string 'free' is truthy, which once let a free-plan account through — and
 * admin grants carry `plan` with no `planId`.
 */
export function hasPaidPlan(subscription) {
  if (!subscription) return false;
  const { planId, plan } = subscription;
  return Boolean((planId && planId !== 'free') || (plan && plan !== 'free'));
}

/** Full check: a paid plan AND a live access window. */
export function hasPaidAccess(subscription) {
  return hasPaidPlan(subscription) && hasActiveWindow(subscription);
}
