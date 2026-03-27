import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Collection name is required'],
    trim: true
  },
  platform: {
    type: String,
    required: true,
    trim: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Source',
    required: false
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: String,
    trim: true
  },
  thumbnail: {
    type: String,
    required: false
  },
  zipUrl: {
    type: String
  },
  zipKey: {
    type: String
  },
  totalDatePacks: {
    type: Number,
    default: 0
  },
  totalAlbums: {
    type: Number,
    default: 0
  },
  totalTracks: {
    type: Number,
    default: 0
  },
  totalSize: {
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
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processingProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  errorMessage: {
    type: String
  },
  processingDetail: {
    type: String,
    default: ''
  },
  tracksProcessed: {
    type: Number,
    default: 0
  },
  totalTracksEstimate: {
    type: Number,
    default: 0
  },
  // New fields for scan-first workflow
  scanResult: {
    motherFolderName: { type: String },
    detectedGenres: [{ type: String }],
    folderStructure: { type: Object }
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  extractedDate: {
    type: Date
  },
  collectionNameSource: {
    type: String,
    enum: ['motherFolder', 'zipFilename', 'userEdited'],
    default: 'motherFolder'
  }
}, {
  timestamps: true
});

collectionSchema.index({ platform: 1, year: 1 });
collectionSchema.index({ name: 'text' });

export default mongoose.model('Collection', collectionSchema);
