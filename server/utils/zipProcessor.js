import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs/promises';
import { extractFullMetadata } from './metadataExtractor.js';

/**
 * Process ZIP file and extract audio files
 * @param {string} zipPath - Path to ZIP file
 * @param {string} extractPath - Path to extract files to
 * @returns {Array} Array of extracted audio files with metadata
 */
export const processZipFile = async (zipPath, extractPath) => {
  try {
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    
    const audioFiles = [];
    const supportedFormats = ['.mp3', '.wav', '.flac', '.m4a', '.aac'];

    // Filter audio files from ZIP
    const audioEntries = zipEntries.filter(entry => {
      if (entry.isDirectory) return false;
      const ext = path.extname(entry.entryName).toLowerCase();
      return supportedFormats.includes(ext);
    });

    console.log(`Found ${audioEntries.length} audio files in ZIP`);

    // Extract audio files
    for (const entry of audioEntries) {
      const fileName = path.basename(entry.entryName);
      const extractedPath = path.join(extractPath, fileName);
      
      // Extract file
      await fs.writeFile(extractedPath, entry.getData());
      
      audioFiles.push({
        originalName: fileName,
        path: extractedPath,
        size: entry.header.size,
        entryName: entry.entryName
      });
    }

    return audioFiles;
  } catch (error) {
    console.error('ZIP processing error:', error);
    throw new Error(`Failed to process ZIP file: ${error.message}`);
  }
};

/**
 * Extract metadata from all files in ZIP
 * @param {Array} audioFiles - Array of audio file objects
 * @returns {Array} Array of files with extracted metadata
 */
export const extractMetadataFromZip = async (audioFiles) => {
  const filesWithMetadata = [];

  for (const audioFile of audioFiles) {
    try {
      console.log(`Extracting metadata from: ${audioFile.originalName}`);
      const metadata = await extractFullMetadata(audioFile.path);
      
      filesWithMetadata.push({
        ...audioFile,
        metadata: metadata,
        status: 'ready'
      });
    } catch (error) {
      console.error(`Metadata extraction failed for ${audioFile.originalName}:`, error);
      filesWithMetadata.push({
        ...audioFile,
        metadata: null,
        status: 'error',
        error: error.message
      });
    }
  }

  return filesWithMetadata;
};

/**
 * Clean up extracted files
 * @param {Array} filePaths - Array of file paths to delete
 */
export const cleanupExtractedFiles = async (filePaths) => {
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete ${filePath}:`, error);
    }
  }
};

/**
 * Validate ZIP file
 * @param {string} zipPath - Path to ZIP file
 * @returns {Object} Validation result
 */
export const validateZipFile = async (zipPath) => {
  try {
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac'];
    const audioFiles = entries.filter(entry => {
      if (entry.isDirectory) return false;
      const ext = path.extname(entry.entryName).toLowerCase();
      return audioExtensions.includes(ext);
    });

    if (audioFiles.length === 0) {
      return {
        valid: false,
        error: 'ZIP file contains no audio files'
      };
    }

    // Check total uncompressed size
    const totalSize = audioFiles.reduce((sum, entry) => sum + entry.header.size, 0);
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB limit

    if (totalSize > maxSize) {
      return {
        valid: false,
        error: 'Total uncompressed size exceeds 5GB limit'
      };
    }

    return {
      valid: true,
      audioFileCount: audioFiles.length,
      totalSize: totalSize,
      files: audioFiles.map(e => ({
        name: path.basename(e.entryName),
        size: e.header.size
      }))
    };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid ZIP file: ${error.message}`
    };
  }
};

/**
 * Process ZIP file completely - extract, analyze, and prepare for upload
 * @param {string} zipPath - Path to ZIP file
 * @param {string} tempDir - Temporary directory for extraction
 * @returns {Object} Processing result with file metadata
 */
export const processZipComplete = async (zipPath, tempDir) => {
  try {
    // Validate ZIP first
    const validation = await validateZipFile(zipPath);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Extract audio files
    const extractedFiles = await processZipFile(zipPath, tempDir);
    
    // Extract metadata from all files
    const filesWithMetadata = await extractMetadataFromZip(extractedFiles);

    return {
      success: true,
      totalFiles: filesWithMetadata.length,
      files: filesWithMetadata,
      validation: validation
    };
  } catch (error) {
    throw new Error(`ZIP processing failed: ${error.message}`);
  }
};
