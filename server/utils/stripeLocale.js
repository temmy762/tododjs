/**
 * Stripe customer locale.
 *
 * Stripe localises the emails IT sends on our behalf — failed-payment /
 * dunning notices, receipts, refund notices — from the Customer object's
 * `preferred_locales`. We never set it, so every one of those emails went out
 * in the Stripe account's default language regardless of who received it: a
 * Spanish customer got "€19.99 payment to TODO DJS was unsuccessful again" in
 * English, then landed on a recovery page in Spanish (that page is localised
 * from the browser's Accept-Language instead, which is why the two disagreed).
 *
 * The language is deliberately the SAME expression the email service uses
 * (`user.preferredLanguage || 'es'`, see services/emailService.js) so that a
 * Stripe-sent email and a TodoDJS-sent email to the same customer are never in
 * different languages.
 *
 * NOTE: `preferredLanguage` defaults to 'en' in the User schema while the app
 * itself is Spanish-first (i18n config.js uses lng/fallbackLng 'es'). Accounts
 * that never had it explicitly set are therefore 'en' and will get English
 * Stripe emails. That default is a product decision, not something this helper
 * should override — see the note in the fix summary.
 */

// Stripe expects an IETF tag; it accepts bare 'en' / 'es'.
const SUPPORTED = new Set(['en', 'es']);

export function stripeLocaleFor(user) {
  const lang = user?.preferredLanguage || 'es';
  return SUPPORTED.has(lang) ? lang : 'es';
}

/**
 * Fields to merge into a stripe.customers.create() call.
 */
export function customerLocaleFields(user) {
  return { preferred_locales: [stripeLocaleFor(user)] };
}

/**
 * Bring an EXISTING Stripe customer's locale in line with the user record.
 *
 * Fire-and-forget by design: this is a cosmetic correction on customers
 * created before locale was set, and it must never break a payment flow. Pass
 * the customer object when you already have it to skip a redundant read.
 */
export async function syncCustomerLocale(stripe, customerId, user, knownCustomer = null) {
  if (!stripe || !customerId || !user) return;
  const want = stripeLocaleFor(user);
  try {
    const customer = knownCustomer || (await stripe.customers.retrieve(customerId));
    if (customer?.deleted) return;
    const current = customer?.preferred_locales?.[0] || null;
    if (current === want) return;
    await stripe.customers.update(customerId, { preferred_locales: [want] });
    console.log(`[stripe-locale] customer ${customerId}: ${current || '(unset)'} -> ${want}`);
  } catch (e) {
    console.warn(`[stripe-locale] could not sync ${customerId}: ${e.message}`);
  }
}
