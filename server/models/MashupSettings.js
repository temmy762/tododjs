import mongoose from 'mongoose';

const mashupSettingsSchema = new mongoose.Schema({
  videoUrl: {
    type: String,
    default: ''
  },
  bannerImageUrl: {
    type: String,
    default: ''
  },
  bannerImageKey: {
    type: String,
    default: ''
  },
  pageTitle: {
    type: String,
    default: 'Mash Ups'
  },
  pageDescription: {
    type: String,
    default: 'Fresh mashups, remixes & edits'
  },
  tags: {
    type: [String],
    default: ['Intro', 'Outro', 'Clean', 'Dirty', 'Extended', 'Original', 'Acapella']
  }
}, {
  timestamps: true
});

export default mongoose.model('MashupSettings', mashupSettingsSchema);
