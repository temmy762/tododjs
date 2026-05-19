import mongoose from 'mongoose';

const downloadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  trackId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Track'
  },
  albumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Album'
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Source',
    required: false
  },
  type: {
    type: String,
    enum: ['single', 'bulk'],
    required: true
  },
  fileType: {
    type: String,
    enum: ['MP3', 'ZIP'],
    default: 'MP3'
  },
  fileName: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: ''
  },
  section: {
    type: String,
    default: ''
  },
  planId: {
    type: String,
    default: ''
  },
  deviceBrowser: {
    type: String,
    default: ''
  },
  deviceOS: {
    type: String,
    default: ''
  },
  deviceName: {
    type: String,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for analytics
downloadSchema.index({ userId: 1, createdAt: -1 });
downloadSchema.index({ email: 1, createdAt: -1 });
downloadSchema.index({ fileType: 1, createdAt: -1 });
downloadSchema.index({ trackId: 1, createdAt: -1 });
downloadSchema.index({ albumId: 1, createdAt: -1 });
downloadSchema.index({ sourceId: 1, createdAt: -1 });
downloadSchema.index({ createdAt: -1 });

export default mongoose.model('Download', downloadSchema);
