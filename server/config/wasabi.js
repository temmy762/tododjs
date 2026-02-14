import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

// Validate Wasabi credentials
if (!process.env.WASABI_ACCESS_KEY_ID || !process.env.WASABI_SECRET_ACCESS_KEY) {
  console.error('❌ Wasabi credentials not found in environment variables');
  throw new Error('Wasabi credentials are required');
}

console.log('✅ Wasabi credentials loaded');
console.log('   Access Key:', process.env.WASABI_ACCESS_KEY_ID?.substring(0, 8) + '...');
console.log('   Region:', process.env.WASABI_REGION);
console.log('   Endpoint:', process.env.WASABI_ENDPOINT);
console.log('   Bucket:', process.env.WASABI_BUCKET_NAME);

// Wasabi S3 Configuration
const wasabiConfig = {
  endpoint: `https://${process.env.WASABI_ENDPOINT}`,
  region: process.env.WASABI_REGION,
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY
  },
  forcePathStyle: true
};

const s3Client = new S3Client(wasabiConfig);

const BUCKET_NAME = process.env.WASABI_BUCKET_NAME;

// ── Signed URL Cache ──
// Caches signed URLs in memory to avoid re-signing and reduce egress.
// Key: S3 object key + expiresIn, Value: { url, expiresAt }
const urlCache = new Map();
const CACHE_SAFETY_MARGIN = 300; // 5 min before expiry, regenerate

const getCachedUrl = (key, expiresIn) => {
  const cacheKey = `${key}::${expiresIn}`;
  const cached = urlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }
  urlCache.delete(cacheKey);
  return null;
};

const setCachedUrl = (key, expiresIn, url) => {
  const cacheKey = `${key}::${expiresIn}`;
  const ttlMs = (expiresIn - CACHE_SAFETY_MARGIN) * 1000;
  urlCache.set(cacheKey, { url, expiresAt: Date.now() + ttlMs });

  // Periodic cleanup: cap cache at 5000 entries
  if (urlCache.size > 5000) {
    const now = Date.now();
    for (const [k, v] of urlCache) {
      if (v.expiresAt <= now) urlCache.delete(k);
    }
  }
};

/**
 * Upload file to Wasabi with progress tracking
 * @param {Buffer|Stream} fileData - File data to upload
 * @param {string} key - S3 object key (path)
 * @param {string} contentType - MIME type
 * @param {Function} progressCallback - Progress callback function
 */
export const uploadToWasabi = async (fileData, key, contentType, progressCallback) => {
  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileData,
        ContentType: contentType,
        ACL: 'private' // Files are private, accessed via signed URLs
      }
    });

    // Track upload progress
    upload.on('httpUploadProgress', (progress) => {
      if (progressCallback && progress.loaded && progress.total) {
        const percentage = (progress.loaded / progress.total) * 100;
        progressCallback(percentage);
      }
    });

    const result = await upload.done();
    
    return {
      success: true,
      key: key,
      location: result.Location,
      bucket: BUCKET_NAME
    };
  } catch (error) {
    console.error('Wasabi upload error:', error);
    throw new Error(`Failed to upload to Wasabi: ${error.message}`);
  }
};

/**
 * Generate signed URL for temporary file access
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration in seconds (default 1 hour)
 */
export const getSignedDownloadUrl = async (key, expiresIn = 3600) => {
  try {
    // Check cache first
    const cached = getCachedUrl(key, expiresIn);
    if (cached) return cached;

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    // Cache the signed URL
    setCachedUrl(key, expiresIn, signedUrl);

    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error(`Failed to generate download URL: ${error.message}`);
  }
};

/**
 * Generate signed URL for preview (shorter expiration)
 * @param {string} key - S3 object key
 */
export const getSignedPreviewUrl = async (key) => {
  return getSignedDownloadUrl(key, 1800); // 30 minutes
};

/**
 * Delete file from Wasabi
 * @param {string} key - S3 object key
 */
export const deleteFromWasabi = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
    return { success: true };
  } catch (error) {
    console.error('Error deleting from Wasabi:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};

/**
 * Upload multiple files (for ZIP extraction)
 * @param {Array} files - Array of {data, key, contentType}
 */
export const uploadMultipleToWasabi = async (files, progressCallback) => {
  const results = [];
  let totalUploaded = 0;

  for (const file of files) {
    const result = await uploadToWasabi(
      file.data,
      file.key,
      file.contentType,
      (progress) => {
        const overallProgress = ((totalUploaded + (progress / 100)) / files.length) * 100;
        if (progressCallback) {
          progressCallback(overallProgress);
        }
      }
    );
    results.push(result);
    totalUploaded++;
  }

  return results;
};

export default s3Client;
