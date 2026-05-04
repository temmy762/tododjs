import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import SubscriptionPlan from '../models/SubscriptionPlan.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const priceIds = {
  individual_monthly:  process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY  || 'price_1TTSD6ENp1BvwFvRNknUdKSR',
  individual_quarterly: process.env.STRIPE_PRICE_INDIVIDUAL_QUARTERLY || 'price_1TTSDrENp1BvwFvRl8E3HD8A',
  shared_monthly:      process.env.STRIPE_PRICE_SHARED_MONTHLY       || 'price_1TTSEeENp1BvwFvRcRAXjE9t',
  shared_quarterly:    process.env.STRIPE_PRICE_SHARED_QUARTERLY      || 'price_1TTSFOENp1BvwFvRn1nZm3b8'
};

const subscriptionPlans = [
  {
    planId: 'individual_monthly',
    name: 'Individual Monthly',
    nameEs: 'Individual Mensual',
    type: 'individual',
    duration: 'monthly',
    price: 19.99,
    currency: 'EUR',
    badge: '🔥',
    badgeEs: '🔥',
    isBestOption: false,
    features: {
      maxUsers: 1,
      maxDevices: 1,
      unlimitedDownloads: true,
      whatsappSupport: true,
      fullWebAccess: true,
      noCommitment: true
    },
    durationDays: 30,
    stripePriceId: priceIds.individual_monthly,
    order: 1
  },
  {
    planId: 'individual_quarterly',
    name: 'Individual Quarterly',
    nameEs: 'Individual Trimestral',
    type: 'individual',
    duration: 'quarterly',
    price: 54.99,
    currency: 'EUR',
    badge: '⭐ Best Option',
    badgeEs: '⭐ Mejor Opción',
    isBestOption: true,
    features: {
      maxUsers: 1,
      maxDevices: 1,
      unlimitedDownloads: true,
      whatsappSupport: true,
      fullWebAccess: true,
      noCommitment: true
    },
    durationDays: 90,
    stripePriceId: priceIds.individual_quarterly,
    order: 2
  },
  {
    planId: 'shared_monthly',
    name: 'Shared Monthly',
    nameEs: 'Compartida Mensual',
    type: 'shared',
    duration: 'monthly',
    price: 29.99,
    currency: 'EUR',
    badge: '🫂',
    badgeEs: '🫂',
    isBestOption: false,
    features: {
      maxUsers: 2,
      maxDevices: 2,
      unlimitedDownloads: true,
      whatsappSupport: true,
      fullWebAccess: true,
      noCommitment: true
    },
    durationDays: 30,
    stripePriceId: priceIds.shared_monthly,
    order: 3
  },
  {
    planId: 'shared_quarterly',
    name: 'Shared Quarterly',
    nameEs: 'Compartida Trimestral',
    type: 'shared',
    duration: 'quarterly',
    price: 79.99,
    currency: 'EUR',
    badge: '⭐ Best Option',
    badgeEs: '⭐ Mejor Opción',
    isBestOption: true,
    features: {
      maxUsers: 2,
      maxDevices: 2,
      unlimitedDownloads: true,
      whatsappSupport: true,
      fullWebAccess: true,
      noCommitment: true
    },
    durationDays: 90,
    stripePriceId: priceIds.shared_quarterly,
    order: 4
  }
];

async function seedPlans() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');

    // Clear existing plans
    await SubscriptionPlan.deleteMany({});
    console.log('Cleared existing subscription plans');

    // Insert new plans
    await SubscriptionPlan.insertMany(subscriptionPlans);
    console.log('✅ Successfully seeded 4 subscription plans');

    // Display plans
    const plans = await SubscriptionPlan.find().sort({ order: 1 });
    console.log('\nSubscription Plans:');
    plans.forEach(plan => {
      console.log(`- ${plan.name} (${plan.nameEs}): €${plan.price}/${plan.duration} ${plan.badge}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding plans:', error);
    process.exit(1);
  }
}

seedPlans();
