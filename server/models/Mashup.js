import mongoose from 'mongoose';

const mashupSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a mashup title'],
    trim: true
  },
  artist: {
    type: String,
    required: [true, 'Please provide an artist name'],
    trim: true
  },
  genre: {
    type: String,
    default: 'Mashup'
  },
  bpm: {
    type: Number,
    min: 60,
    max: 200
  },
  tonality: {
    type: String,
    default: ''
  },
  coverArt: {
    type: String,
    default: ''
  },
  coverArtKey: {
    type: String,
    default: ''
  },
  audioFile: {
    url: String,
    key: String,
    format: {
      type: String,
      enum: ['MP3', 'WAV', 'FLAC'],
      default: 'MP3'
    },
    size: Number,
    duration: Number
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
  isPublished: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

mashupSchema.index({ title: 'text', artist: 'text' });

export default mongoose.model('Mashup', mashupSchema);
