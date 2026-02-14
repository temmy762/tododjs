import Mashup from '../models/Mashup.js';
import MashupSettings from '../models/MashupSettings.js';
import { getSignedDownloadUrl, uploadToWasabi, deleteFromWasabi } from '../config/wasabi.js';

// @desc    Get all mashups (public)
// @route   GET /api/mashups
// @access  Public
export const getMashups = async (req, res) => {
  try {
    const { sort = '-createdAt', limit = 100 } = req.query;

    const mashups = await Mashup.find({ isPublished: true })
      .sort(sort)
      .limit(parseInt(limit))
      .lean();

    // Sign cover art URLs
    const signed = await Promise.all(mashups.map(async (m) => {
      let coverArt = m.coverArt;
      if (m.coverArtKey) {
        try { coverArt = await getSignedDownloadUrl(m.coverArtKey, 7200); } catch {}
      }
      return { ...m, coverArt };
    }));

    res.status(200).json({ success: true, count: signed.length, data: signed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get mashup settings (video link, page title)
// @route   GET /api/mashups/settings
// @access  Public
export const getMashupSettings = async (req, res) => {
  try {
    let settings = await MashupSettings.findOne();
    if (!settings) {
      settings = await MashupSettings.create({});
    }
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update mashup settings
// @route   PUT /api/mashups/settings
// @access  Private/Admin
export const updateMashupSettings = async (req, res) => {
  try {
    const { videoUrl, pageTitle, pageDescription } = req.body;
    let settings = await MashupSettings.findOne();
    if (!settings) {
      settings = await MashupSettings.create({});
    }

    if (videoUrl !== undefined) settings.videoUrl = videoUrl;
    if (pageTitle !== undefined) settings.pageTitle = pageTitle;
    if (pageDescription !== undefined) settings.pageDescription = pageDescription;

    await settings.save();
    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all mashups (admin - includes unpublished)
// @route   GET /api/mashups/admin
// @access  Private/Admin
export const getAdminMashups = async (req, res) => {
  try {
    const mashups = await Mashup.find()
      .sort('-createdAt')
      .populate('uploadedBy', 'name email')
      .lean();

    const signed = await Promise.all(mashups.map(async (m) => {
      let coverArt = m.coverArt;
      if (m.coverArtKey) {
        try { coverArt = await getSignedDownloadUrl(m.coverArtKey, 7200); } catch {}
      }
      return { ...m, coverArt };
    }));

    res.status(200).json({ success: true, count: signed.length, data: signed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload a new mashup track
// @route   POST /api/mashups
// @access  Private/Admin
export const createMashup = async (req, res) => {
  try {
    const { title, artist, genre, bpm, tonality } = req.body;

    if (!req.files || !req.files.audio) {
      return res.status(400).json({ success: false, message: 'Please upload an audio file' });
    }

    const audioFile = req.files.audio[0];
    const allowedAudio = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/x-wav', 'audio/mp3'];
    if (!allowedAudio.includes(audioFile.mimetype)) {
      return res.status(400).json({ success: false, message: 'Only MP3, WAV, and FLAC files are allowed' });
    }

    // Upload audio to Wasabi
    const audioExt = audioFile.originalname.split('.').pop() || 'mp3';
    const audioKey = `mashups/audio/${Date.now()}-${audioFile.originalname.replace(/\s+/g, '_')}`;
    const audioUpload = await uploadToWasabi(audioFile.buffer, audioKey, audioFile.mimetype);

    const formatMap = { mp3: 'MP3', wav: 'WAV', flac: 'FLAC' };

    const mashupData = {
      title: title || audioFile.originalname.replace(/\.[^/.]+$/, ''),
      artist: artist || 'Unknown Artist',
      genre: genre || 'Mashup',
      bpm: bpm ? parseInt(bpm) : undefined,
      tonality: tonality || '',
      audioFile: {
        url: audioUpload.location || audioUpload.Location,
        key: audioKey,
        format: formatMap[audioExt.toLowerCase()] || 'MP3',
        size: audioFile.size
      },
      uploadedBy: req.user.id
    };

    // Upload cover art if provided
    if (req.files.coverArt && req.files.coverArt[0]) {
      const coverFile = req.files.coverArt[0];
      const coverKey = `mashups/covers/${Date.now()}-${coverFile.originalname.replace(/\s+/g, '_')}`;
      const coverUpload = await uploadToWasabi(coverFile.buffer, coverKey, coverFile.mimetype);
      mashupData.coverArt = coverUpload.location || coverUpload.Location;
      mashupData.coverArtKey = coverKey;
    }

    const mashup = await Mashup.create(mashupData);

    res.status(201).json({ success: true, data: mashup });
  } catch (error) {
    console.error('Mashup upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a mashup
// @route   PUT /api/mashups/:id
// @access  Private/Admin
export const updateMashup = async (req, res) => {
  try {
    const { title, artist, genre, bpm, tonality, isPublished } = req.body;
    const mashup = await Mashup.findById(req.params.id);

    if (!mashup) {
      return res.status(404).json({ success: false, message: 'Mashup not found' });
    }

    if (title !== undefined) mashup.title = title;
    if (artist !== undefined) mashup.artist = artist;
    if (genre !== undefined) mashup.genre = genre;
    if (bpm !== undefined) mashup.bpm = parseInt(bpm);
    if (tonality !== undefined) mashup.tonality = tonality;
    if (isPublished !== undefined) mashup.isPublished = isPublished;

    // Update cover art if provided
    if (req.files && req.files.coverArt && req.files.coverArt[0]) {
      if (mashup.coverArtKey) {
        try { await deleteFromWasabi(mashup.coverArtKey); } catch {}
      }
      const coverFile = req.files.coverArt[0];
      const coverKey = `mashups/covers/${Date.now()}-${coverFile.originalname.replace(/\s+/g, '_')}`;
      const coverUpload = await uploadToWasabi(coverFile.buffer, coverKey, coverFile.mimetype);
      mashup.coverArt = coverUpload.location || coverUpload.Location;
      mashup.coverArtKey = coverKey;
    }

    await mashup.save();
    res.status(200).json({ success: true, data: mashup });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a mashup
// @route   DELETE /api/mashups/:id
// @access  Private/Admin
export const deleteMashup = async (req, res) => {
  try {
    const mashup = await Mashup.findById(req.params.id);

    if (!mashup) {
      return res.status(404).json({ success: false, message: 'Mashup not found' });
    }

    // Delete files from Wasabi
    if (mashup.audioFile?.key) {
      try { await deleteFromWasabi(mashup.audioFile.key); } catch {}
    }
    if (mashup.coverArtKey) {
      try { await deleteFromWasabi(mashup.coverArtKey); } catch {}
    }

    await mashup.deleteOne();
    res.status(200).json({ success: true, message: 'Mashup deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get mashup playback URL
// @route   GET /api/mashups/:id/playback
// @access  Public
export const getMashupPlayback = async (req, res) => {
  try {
    const mashup = await Mashup.findById(req.params.id);
    if (!mashup || !mashup.audioFile?.key) {
      return res.status(404).json({ success: false, message: 'Mashup not found' });
    }

    const url = await getSignedDownloadUrl(mashup.audioFile.key, 3600);

    mashup.plays = (mashup.plays || 0) + 1;
    await mashup.save();

    // Cache response for 55 min to reduce repeated Wasabi egress
    res.set('Cache-Control', 'private, max-age=3300');
    res.status(200).json({ success: true, data: { url } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
