// Test-mode Stripe credentials, used ONLY when APP_ENV=staging.
//
// Staging and production run as separate PM2 processes on the same server
// and share the same MongoDB, but staging must talk to Stripe in test mode
// while production uses the live account. Keeping every test-mode value in
// one dedicated file — rather than overloading the same env var names used
// by config/stripe.js and stripeController.js — means the two can never be
// mixed up regardless of how the two processes' .env files are managed.
//
// Staging's .env needs:
//   APP_ENV=staging
//   STRIPE_TEST_SECRET_KEY=sk_test_...
//   STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
//   STRIPE_TEST_WEBHOOK_SECRET=whsec_...            (from staging's OWN webhook endpoint in the Stripe test dashboard — test-mode webhooks sign with a different secret than live mode)
//   STRIPE_TEST_PRICE_INDIVIDUAL_MONTHLY=price_...  (test-mode Price IDs — seed these in the Stripe test dashboard, never in the shared production DB)
//   STRIPE_TEST_PRICE_INDIVIDUAL_QUARTERLY=price_...
//   STRIPE_TEST_PRICE_SHARED_MONTHLY=price_...
//   STRIPE_TEST_PRICE_SHARED_QUARTERLY=price_...
//
// Production's .env is untouched — APP_ENV stays unset there, so isStaging
// is false and every call site below falls through to the normal live config.

export const isStaging = process.env.APP_ENV === 'staging';

export const testConfig = {
  secretKey: process.env.STRIPE_TEST_SECRET_KEY,
  publishableKey: process.env.STRIPE_TEST_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_TEST_WEBHOOK_SECRET,
  priceIds: {
    individual_monthly: process.env.STRIPE_TEST_PRICE_INDIVIDUAL_MONTHLY,
    individual_quarterly: process.env.STRIPE_TEST_PRICE_INDIVIDUAL_QUARTERLY,
    shared_monthly: process.env.STRIPE_TEST_PRICE_SHARED_MONTHLY,
    shared_quarterly: process.env.STRIPE_TEST_PRICE_SHARED_QUARTERLY,
  }
};

export default testConfig;
