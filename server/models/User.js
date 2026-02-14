import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [
      /^\+?[1-9]\d{6,14}$/,
      'Please provide a valid phone number (e.g. +1234567890)'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'premium', 'pro'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'past_due'],
      default: 'active'
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: Boolean
  },
  downloads: {
    today: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    lastDownloadDate: Date
  },
  favorites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track'
  }],
  playlists: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Playlist'
  }],
  avatar: {
    type: String,
    default: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'
  },
  avatarKey: {
    type: String
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  registeredDevices: [{
    deviceId: { type: String, required: true },
    deviceInfo: { type: String, default: 'Unknown Device' },
    ipAddress: { type: String },
    activeToken: { type: String, default: null },
    registeredAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: Date.now }
  }],
  maxDevices: {
    type: Number,
    default: 2
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Reset daily download count
userSchema.methods.resetDailyDownloads = function() {
  const today = new Date().setHours(0, 0, 0, 0);
  const lastDownload = this.downloads.lastDownloadDate 
    ? new Date(this.downloads.lastDownloadDate).setHours(0, 0, 0, 0)
    : null;
  
  if (!lastDownload || today > lastDownload) {
    this.downloads.today = 0;
  }
};

// Check download limit based on subscription
userSchema.methods.canDownload = function() {
  this.resetDailyDownloads();
  
  const limits = {
    free: 5,
    premium: 50,
    pro: Infinity
  };
  
  return this.downloads.today < limits[this.subscription.plan];
};

// Increment download count
userSchema.methods.incrementDownload = function() {
  this.resetDailyDownloads();
  this.downloads.today += 1;
  this.downloads.total += 1;
  this.downloads.lastDownloadDate = new Date();
};

export default mongoose.model('User', userSchema);
