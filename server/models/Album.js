import mongoose from 'mongoose';

const albumSchema = new mongoose.Schema({
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Source',
    required: false
  },
  collectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection',
    required: false
  },
  datePackId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DatePack',
    required: false
  },
  name: {
    type: String,
    required: [true, 'Please provide album name'],
    trim: true
  },
  genre: {
    type: String,
    trim: true
  },
  year: {
    type: Number,
    required: true
  },
  coverArt: {
    type: String,
    default: null
  },
  coverArtKey: {
    type: String,
    default: null
  },
  trackCount: {
    type: Number,
    default: 0
  },
  totalSize: {
    type: Number, // in bytes
    default: 0
  },
  zipUrl: {
    type: String, // Wasabi URL for bulk download
    default: null
  },
  zipKey: {
    type: String, // Wasabi S3 key
    default: null
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

// Index for search and filtering
albumSchema.index({ name: 'text' });
albumSchema.index({ sourceId: 1, year: -1 });

export default mongoose.model('Album', albumSchema);
