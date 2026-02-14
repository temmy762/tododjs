import mongoose from 'mongoose';

const mashupSettingsSchema = new mongoose.Schema({
  videoUrl: {
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
  }
}, {
  timestamps: true
});

export default mongoose.model('MashupSettings', mashupSettingsSchema);
