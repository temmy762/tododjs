import mongoose from 'mongoose';

const sourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a source name'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Please provide upload year'],
    min: 2000,
    max: 2100
  },
  thumbnail: {
    type: String,
    required: [true, 'Please provide a thumbnail']
  },
  thumbnailKey: {
    type: String,
    default: null
  },
  platform: {
    type: String,
    trim: true,
    default: ''
  },
  totalAlbums: {
    type: Number,
    default: 0
  },
  totalTracks: {
    type: Number,
    default: 0
  },
  totalDownloads: {
    type: Number,
    default: 0
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for search
sourceSchema.index({ name: 'text' });

export default mongoose.model('Source', sourceSchema);
