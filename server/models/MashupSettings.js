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
  categories: {
    type: [String],
    default: ['Reggaeton', 'Old School Reggaeton', 'Dembow', 'Trap', 'House', 'EDM', 'Afro House', 'Remember', 'International']
  }
}, {
  timestamps: true
});

export default mongoose.model('MashupSettings', mashupSettingsSchema);
