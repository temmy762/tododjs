/**
 * Backfill preferred_locales on existing Stripe customers.
 *
 * Stripe localises the emails it sends on our behalf (failed payment, receipts,
 * refunds) from the Customer's preferred_locales. We never set it, so every
 * such email went out in the Stripe account's default language — a Spanish
 * customer received an English dunning email and then landed on a Spanish
 * recovery page, because that page is localised from Accept-Language instead.
 *
 * New customers get the field at creation (utils/stripeLocale.js). This script
 * fixes the ones that already exist.
 *
 * Dry run (default — reports, writes nothing):
 *   node server/scripts/backfill-stripe-locales.mjs
 * Apply:
 *   node server/scripts/backfill-stripe-locales.mjs --apply
 * Single account:
 *   node server/scripts/backfill-stripe-locales.mjs --email someone@example.com --apply
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import stripe from '../config/stripe.js';
import User from '../models/User.js';
import { stripeLocaleFor } from '../utils/stripeLocale.js';

const apply = process.argv.includes('--apply');
const emailIdx = process.argv.indexOf('--email');
const onlyEmail = emailIdx !== -1 ? process.argv[emailIdx + 1] : null;

await mongoose.connect(process.env.MONGODB_URI);

const query = { 'subscription.stripeCustomerId': { $exists: true, $ne: null } };
if (onlyEmail) {
  query.email = new RegExp(`^${onlyEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

const users = await User.find(query).select('email preferredLanguage subscription.stripeCustomerId').lean();
console.log(`${users.length} user(s) with a Stripe customer${apply ? '' : '  [DRY RUN — no writes]'}\n`);

let updated = 0, alreadyOk = 0, failed = 0;

for (const u of users) {
  const customerId = u.subscription.stripeCustomerId;
  const want = stripeLocaleFor(u);
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      console.log(`  - ${u.email}: customer ${customerId} is deleted, skipping`);
      continue;
    }
    const current = customer.preferred_locales?.[0] || null;
    if (current === want) {
      alreadyOk++;
      continue;
    }
    console.log(`  ${apply ? '✓' : '·'} ${u.email}: ${current || '(unset)'} -> ${want}   (${customerId}, preferredLanguage=${u.preferredLanguage || '(unset)'})`);
    if (apply) {
      await stripe.customers.update(customerId, { preferred_locales: [want] });
    }
    updated++;
  } catch (e) {
    failed++;
    console.error(`  ! ${u.email}: ${e.message}`);
  }
}

console.log(`\n${apply ? 'updated' : 'would update'}=${updated}  alreadyCorrect=${alreadyOk}  failed=${failed}`);
if (!apply && updated > 0) console.log('Re-run with --apply to write these changes.');

await mongoose.disconnect();
