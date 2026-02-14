import mongoose from 'mongoose';

const packSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a pack name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  packType: {
    type: String,
    enum: ['weekly', 'monthly', 'special'],
    default: 'weekly'
  },
  releaseDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  coverArt: {
    type: String,
    required: true
  },
  trackCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for search
packSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Pack', packSchema);
