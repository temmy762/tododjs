import Stripe from 'stripe';
import { isStaging, testConfig } from './stripeTest.js';

// APP_ENV=staging switches the whole app to Stripe TEST mode. Production's
// STRIPE_SECRET_KEY is untouched — this only takes effect on the staging
// process. See config/stripeTest.js for the full staging .env contract.
const secretKey = isStaging ? testConfig.secretKey : process.env.STRIPE_SECRET_KEY;

if (isStaging && !testConfig.secretKey) {
  console.warn('⚠️  APP_ENV=staging but STRIPE_TEST_SECRET_KEY is not set — Stripe calls will fail.');
}

const stripe = new Stripe(secretKey, {
  apiVersion: '2023-10-16'
});

export default stripe;
