import mongoose from 'mongoose';

const trackSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a track title'],
    trim: true
  },
  artist: {
    type: String,
    required: [true, 'Please provide an artist name'],
    trim: true
  },
  featuredArtist: {
    type: String,
    trim: true
  },
  genre: {
    type: String,
    required: [true, 'Genre is required for publishing']
  },
  versionType: {
    type: String,
    required: [true, 'Version type is required for publishing'],
    enum: ['Original Mix', 'Intro', 'Outro', 'Extended', 'Edit', 'Transition', 'Acapella', 'Instrumental', 'Clean', 'Dirty'],
    default: 'Original Mix'
  },
  cleanDirty: {
    type: String,
    enum: ['Clean', 'Dirty', 'N/A'],
    default: 'N/A'
  },
  bpm: {
    type: Number,
    min: 60,
    max: 200
  },
  tonality: {
    key: String,
    scale: String,
    camelot: String,
    openKey: String,
    source: {
      type: String,
      enum: ['audio-analysis', 'openai', 'id3-tag', 'manual', 'unknown'],
      default: 'unknown'
    },
    confidence: {
      type: Number,
      default: 0
    },
    needsManualReview: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: Date
  },
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
  albumId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Album',
    required: false
  },
  pack: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pack'
  },
  pool: {
    type: String,
    required: false
  },
  collection: {
    type: String,
    default: 'New This Week'
  },
  coverArt: {
    type: String,
    default: ''
  },
  coverArtKey: {
    type: String,
    default: null
  },
  audioFile: {
    url: String,
    key: String, // Wasabi S3 key
    format: {
      type: String,
      enum: ['MP3', 'WAV', 'FLAC']
    },
    size: Number,
    duration: Number
  },
  dateAdded: {
    type: Date,
    default: Date.now
  },
  downloads: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  plays: {
    type: Number,
    default: 0
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  requiredPlan: {
    type: String,
    enum: ['free', 'premium', 'pro'],
    default: 'free'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['draft', 'ready', 'published', 'rejected'],
    default: 'draft'
  },
  needsDJData: {
    type: Boolean,
    default: false
  },
  previewFile: {
    url: String,
    duration: Number
  }
}, {
  timestamps: true
});

// Auto-determine status based on metadata completeness
trackSchema.pre('save', function (next) {
  // Only auto-set on creation or if status is still draft
  if (this.isNew || this.status === 'draft') {
    const hasArtist = this.artist && this.artist !== 'Unknown Artist';
    const hasTonality = this.tonality && this.tonality.camelot;
    const hasBpm = this.bpm && this.bpm > 0;
    const hasGenre = !!this.genre;
    const hasAudio = this.audioFile && this.audioFile.key;

    if (hasArtist && hasTonality && hasBpm && hasGenre && hasAudio) {
      this.status = 'published';
    } else {
      this.status = 'draft';
      this.needsDJData = true;
    }
  }
  next();
});

// Same logic for Track.create() which uses insertMany internally
trackSchema.pre('validate', function (next) {
  if (this.isNew && !this._skipAutoStatus) {
    const hasArtist = this.artist && this.artist !== 'Unknown Artist';
    const hasTonality = this.tonality && this.tonality.camelot;
    const hasBpm = this.bpm && this.bpm > 0;

    if (!hasArtist || !hasTonality || !hasBpm) {
      this.needsDJData = true;
    }
  }
  next();
});

// Index for search
trackSchema.index({ title: 'text', artist: 'text' });

export default mongoose.model('Track', trackSchema);
