import mongoose from 'mongoose';

const datePackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Date card name is required'],
    trim: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Source',
    required: [true, 'Source is required']
  },
  collectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Collection',
    required: false
  },
  date: {
    type: Date,
    required: true
  },
  thumbnail: {
    type: String,
    required: [true, 'Please provide a thumbnail']
  },
  thumbnailKey: {
    type: String,
    default: null
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
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

datePackSchema.index({ sourceId: 1, date: -1 });
datePackSchema.index({ name: 'text' });

export default mongoose.model('DatePack', datePackSchema);
