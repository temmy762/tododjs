import path from 'path';

/**
 * Generate a clean collection name from mother folder name
 * Algorithm:
 * 1. Remove date patterns (e.g., 29-12-2025, 2025-12-29)
 * 2. Remove special words: EXCLUSIVO, EXCLUSIVE, PACK, BUNDLE
 * 3. Title case + clean formatting
 * 
 * @param {string} motherFolderName - The mother folder name from ZIP
 * @returns {string} - Clean collection name
 */
export function generateCollectionName(motherFolderName) {
  if (!motherFolderName || typeof motherFolderName !== 'string') {
    return 'Untitled Collection';
  }

  let name = motherFolderName.trim();

  // Remove date patterns (various formats)
  const datePatterns = [
    /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/g,  // 29-12-2025, 29/12/2025
    /\d{4}[-/]\d{1,2}[-/]\d{1,2}/g,    // 2025-12-29, 2025/12/29
    /\d{1,2}\.\d{1,2}\.\d{2,4}/g,      // 29.12.2025
    /\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4}/gi, // 29 December 2025
    /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4}/gi // December 29, 2025
  ];

  datePatterns.forEach(pattern => {
    name = name.replace(pattern, '');
  });

  // Remove special/common words (case insensitive)
  const wordsToRemove = [
    'EXCLUSIVO', 'EXCLUSIVE', 'EXCLUSIVA',
    'PACK', 'PACKS', 'BUNDLE', 'BUNDLES',
    'COLLECTION', 'COLLECTIONS',
    'FOLDER', 'FOLDERS',
    'NEW', 'LATEST', 'UPDATE', 'UPDATED',
    'COMPLETE', 'FULL', 'VERSION'
  ];

  const wordPattern = new RegExp(`\\b(${wordsToRemove.join('|')})\\b`, 'gi');
  name = name.replace(wordPattern, '');

  // Clean up multiple spaces and trim
  name = name.replace(/\s+/g, ' ').trim();

  // Remove leading/trailing special characters
  name = name.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');

  // Convert to title case
  name = toTitleCase(name);

  // If empty after cleaning, use original with "Collection" suffix
  if (!name || name.length < 2) {
    const cleanOriginal = motherFolderName.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
    name = toTitleCase(cleanOriginal) || 'Untitled Collection';
  }

  return name;
}

/**
 * Convert string to title case
 * @param {string} str 
 * @returns {string}
 */
function toTitleCase(str) {
  if (!str) return '';
  
  return str
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (!word) return '';
      // Keep small words lowercase unless they're the first word
      const smallWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'in', 'of'];
      if (smallWords.includes(word) && word !== str.split(' ')[0].toLowerCase()) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .trim();
}

/**
 * Detect genres from folder names
 * @param {Array} datePacks - Array of date pack objects with albums
 * @returns {Array} - Array of detected unique genres
 */
export function detectGenres(datePacks) {
  const genres = new Set();
  const genrePattern = /\(([^)]+)\)/;

  datePacks.forEach(dp => {
    dp.albums.forEach(album => {
      const match = album.name.match(genrePattern);
      if (match) {
        const genre = match[1].trim();
        if (genre && genre.length > 1) {
          genres.add(genre);
        }
      }
    });
  });

  return Array.from(genres);
}

/**
 * Extract date from folder name
 * @param {string} folderName 
 * @returns {Date|null}
 */
export function extractDateFromFolderName(folderName) {
  if (!folderName) return null;

  // Pattern: DD-MM-YYYY or DD/MM/YYYY
  const datePattern1 = /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/;
  const match1 = folderName.match(datePattern1);
  if (match1) {
    const [, day, month, year] = match1;
    const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
    return new Date(fullYear, parseInt(month) - 1, parseInt(day));
  }

  // Pattern: YYYY-MM-DD
  const datePattern2 = /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;
  const match2 = folderName.match(datePattern2);
  if (match2) {
    const [, year, month, day] = match2;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  return null;
}
