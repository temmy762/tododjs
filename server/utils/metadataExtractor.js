import { parseFile } from 'music-metadata';
import path from 'path';
import { cleanTrackTitle, detectVersionType, detectCleanDirty } from './trackValidation.js';

/**
 * Extract metadata from audio file using music-metadata library
 * @param {string} filePath - Path to audio file
 * @returns {Object} Extracted metadata
 */
export const extractMetadata = async (filePath) => {
  try {
    const metadata = await parseFile(filePath);
    const { common, format } = metadata;

    // Extract basic ID3 tags
    const extractedData = {
      title: common.title || path.basename(filePath, path.extname(filePath)),
      artist: common.artist || common.artists?.join(', ') || 'Unknown Artist',
      featuredArtist: common.artists?.length > 1 ? common.artists.slice(1).join(', ') : null,
      album: common.album || null,
      genre: common.genre?.[0] || null,
      year: common.year || null,
      bpm: common.bpm || null,
      key: null, // Will be detected separately
      duration: format.duration || 0,
      bitrate: format.bitrate || null,
      sampleRate: format.sampleRate || null,
      codec: format.codec || null,
      lossless: format.lossless || false
    };

    // Clean title
    extractedData.title = cleanTrackTitle(extractedData.title);

    // Auto-detect version type
    const fileName = path.basename(filePath);
    extractedData.versionType = detectVersionType(extractedData.title, fileName);

    // Auto-detect clean/dirty
    extractedData.cleanDirty = detectCleanDirty(extractedData.title, fileName);

    // Map genre to DJ Pool genres
    extractedData.genre = mapGenreToDJPool(extractedData.genre);

    return extractedData;
  } catch (error) {
    console.error('Metadata extraction error:', error);
    
    // Return minimal metadata if extraction fails
    const fileName = path.basename(filePath, path.extname(filePath));
    return {
      title: cleanTrackTitle(fileName),
      artist: 'Unknown Artist',
      featuredArtist: null,
      album: null,
      genre: null,
      year: null,
      bpm: null,
      key: null,
      duration: 0,
      bitrate: null,
      sampleRate: null,
      codec: null,
      lossless: false,
      versionType: detectVersionType(fileName, fileName),
      cleanDirty: detectCleanDirty(fileName, fileName),
      extractionError: error.message
    };
  }
};

/**
 * Map generic genres to DJ Pool specific genres
 */
const mapGenreToDJPool = (genre) => {
  if (!genre) return null;

  const genreMap = {
    'house': 'House',
    'deep house': 'House',
    'tech house': 'Tech House',
    'progressive house': 'House',
    'electro house': 'House',
    'afro house': 'Afro House',
    'afrobeat': 'Afro House',
    'amapiano': 'Amapiano',
    'techno': 'Techno',
    'minimal techno': 'Techno',
    'hip hop': 'Hip-Hop',
    'hip-hop': 'Hip-Hop',
    'rap': 'Hip-Hop',
    'trap': 'Hip-Hop',
    'jazz': 'Jazz',
    'ambient': 'Ambient',
    'downtempo': 'Ambient',
    'chillout': 'Ambient',
    'dubstep': 'Dubstep',
    'drum and bass': 'Dubstep',
    'dnb': 'Dubstep',
    'trance': 'Trance',
    'progressive trance': 'Trance',
    'psytrance': 'Trance',
    'edm': 'EDM',
    'electronic': 'EDM'
  };

  const normalized = genre.toLowerCase();
  return genreMap[normalized] || null;
};

/**
 * Detect BPM using external library or algorithm
 * This is a placeholder - in production, use a library like 'web-audio-beat-detector'
 */
export const detectBPM = async (filePath) => {
  try {
    // TODO: Implement BPM detection using audio analysis
    // For now, return null and let admin fill it manually
    return null;
  } catch (error) {
    console.error('BPM detection error:', error);
    return null;
  }
};

/**
 * Detect musical key using external library
 * This is a placeholder - in production, use a library like 'key-detector'
 */
export const detectKey = async (filePath) => {
  try {
    // TODO: Implement key detection using audio analysis
    // For now, return null and let admin fill it manually
    return null;
  } catch (error) {
    console.error('Key detection error:', error);
    return null;
  }
};

/**
 * Convert musical key to Camelot notation
 */
export const keyToCamelot = (key) => {
  const camelotMap = {
    'C major': '8B', 'A minor': '8A',
    'G major': '9B', 'E minor': '9A',
    'D major': '10B', 'B minor': '10A',
    'A major': '11B', 'F# minor': '11A',
    'E major': '12B', 'C# minor': '12A',
    'B major': '1B', 'G# minor': '1A',
    'F# major': '2B', 'D# minor': '2A',
    'Db major': '3B', 'Bb minor': '3A',
    'Ab major': '4B', 'F minor': '4A',
    'Eb major': '5B', 'C minor': '5A',
    'Bb major': '6B', 'G minor': '6A',
    'F major': '7B', 'D minor': '7A'
  };

  return camelotMap[key] || null;
};

/**
 * Extract comprehensive metadata including BPM and Key detection
 */
export const extractFullMetadata = async (filePath) => {
  const basicMetadata = await extractMetadata(filePath);
  
  // Try to detect BPM if not in ID3 tags
  if (!basicMetadata.bpm) {
    basicMetadata.bpm = await detectBPM(filePath);
  }

  // Try to detect key if not in ID3 tags
  if (!basicMetadata.key) {
    const detectedKey = await detectKey(filePath);
    if (detectedKey) {
      basicMetadata.key = keyToCamelot(detectedKey) || detectedKey;
    }
  }

  return basicMetadata;
};

/**
 * Extract metadata from ZIP file entries
 * @param {AdmZip} zip - AdmZip instance
 * @param {Array} mp3Files - Array of ZIP entries that are MP3 files
 * @returns {Object} { tracks, coverArt, duplicates }
 */
export const extractMetadataFromZip = async (zip, mp3Files) => {
  const tracks = [];
  const seenTracks = new Map(); // For duplicate detection
  const duplicates = [];
  let coverArt = null;

  for (const entry of mp3Files) {
    try {
      const buffer = entry.getData();
      const filename = path.basename(entry.entryName);
      
      // Parse metadata from buffer
      const { parseBuffer } = await import('music-metadata');
      const metadata = await parseBuffer(buffer, { mimeType: 'audio/mpeg' });
      const { common, format } = metadata;

      // Extract cover art if available
      if (!coverArt && common.picture && common.picture.length > 0) {
        const picture = common.picture[0];
        coverArt = `data:${picture.format};base64,${picture.data.toString('base64')}`;
      }

      const trackData = {
        filename,
        buffer,
        title: common.title || filename.replace('.mp3', ''),
        artist: common.artist || common.artists?.join(', ') || 'Unknown Artist',
        featuredArtist: common.artists?.length > 1 ? common.artists.slice(1).join(', ') : null,
        album: common.album || null,
        genre: mapGenreToDJPool(common.genre?.[0]) || 'House',
        year: common.year || null,
        bpm: common.bpm || null,
        tonality: null,
        duration: format.duration || 0,
        size: buffer.length,
        versionType: detectVersionType(common.title || filename, filename),
        cleanDirty: detectCleanDirty(common.title || filename, filename)
      };

      // Clean title
      trackData.title = cleanTrackTitle(trackData.title);

      // Duplicate detection
      const trackKey = `${trackData.title.toLowerCase()}-${trackData.artist.toLowerCase()}`;
      if (seenTracks.has(trackKey)) {
        duplicates.push({
          filename,
          title: trackData.title,
          artist: trackData.artist,
          duplicate_of: seenTracks.get(trackKey)
        });
        continue; // Skip duplicate
      }

      seenTracks.set(trackKey, filename);
      tracks.push(trackData);
    } catch (error) {
      console.error(`Error extracting metadata from ${entry.entryName}:`, error);
      // Add track with minimal data
      tracks.push({
        filename: path.basename(entry.entryName),
        buffer: entry.getData(),
        title: path.basename(entry.entryName, '.mp3'),
        artist: 'Unknown Artist',
        genre: 'House',
        size: entry.getData().length,
        duration: 0,
        extractionError: error.message
      });
    }
  }

  return { tracks, coverArt, duplicates };
};

/**
 * Detect duplicates in track list
 * @param {Array} tracks - Array of track objects
 * @returns {Array} Array of duplicate track info
 */
export const detectDuplicates = (tracks) => {
  const seen = new Map();
  const duplicates = [];

  tracks.forEach((track, index) => {
    const key = `${track.title.toLowerCase()}-${track.artist.toLowerCase()}`;
    if (seen.has(key)) {
      duplicates.push({
        index,
        title: track.title,
        artist: track.artist,
        duplicate_of_index: seen.get(key)
      });
    } else {
      seen.set(key, index);
    }
  });

  return duplicates;
};
