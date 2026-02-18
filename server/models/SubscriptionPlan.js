import mongoose from 'mongoose';

const SubscriptionPlanSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  nameEs: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['individual', 'shared'],
    required: true
  },
  duration: {
    type: String,
    enum: ['monthly', 'quarterly'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'EUR'
  },
  badge: {
    type: String,
    default: ''
  },
  badgeEs: {
    type: String,
    default: ''
  },
  isBestOption: {
    type: Boolean,
    default: false
  },
  features: {
    maxUsers: {
      type: Number,
      default: 1
    },
    maxDevices: {
      type: Number,
      default: 1
    },
    unlimitedDownloads: {
      type: Boolean,
      default: true
    },
    whatsappSupport: {
      type: Boolean,
      default: true
    },
    fullWebAccess: {
      type: Boolean,
      default: true
    },
    noCommitment: {
      type: Boolean,
      default: true
    }
  },
  durationDays: {
    type: Number,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  stripePriceId: {
    type: String,
    default: null
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

export default mongoose.model('SubscriptionPlan', SubscriptionPlanSchema);
