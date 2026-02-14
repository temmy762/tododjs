import { getSignedDownloadUrl } from '../config/wasabi.js';

const WASABI_BUCKET = process.env.WASABI_BUCKET_NAME || 'tododj';
const WASABI_ENDPOINT = process.env.WASABI_ENDPOINT || 's3.eu-west-1.wasabisys.com';

/**
 * Extract S3 key from a Wasabi URL.
 * Handles both path-style and virtual-hosted-style URLs.
 */
function extractKeyFromWasabiUrl(url) {
  if (!url || typeof url !== 'string') return null;
  // Skip non-wasabi URLs (external image URLs)
  if (!url.includes('wasabi') && !url.includes(WASABI_BUCKET)) return null;

  try {
    const parsed = new URL(url);
    // Path-style: https://s3.region.wasabisys.com/bucket/key
    const pathMatch = parsed.pathname.match(new RegExp(`^/${WASABI_BUCKET}/(.+)$`));
    if (pathMatch) return decodeURIComponent(pathMatch[1]);

    // Virtual-hosted: https://bucket.s3.region.wasabisys.com/key
    if (parsed.hostname.startsWith(WASABI_BUCKET)) {
      return decodeURIComponent(parsed.pathname.slice(1));
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve thumbnail/coverArt signed URLs for an array of documents.
 * Uses the stored key field first, falls back to extracting key from the URL.
 * External (non-Wasabi) URLs are left untouched.
 */
export async function resolveSignedUrls(docs, fields = ['thumbnail']) {
  if (!docs || docs.length === 0) return docs;

  const results = await Promise.all(
    docs.map(async (doc) => {
      const obj = doc.toObject ? doc.toObject() : { ...doc };

      for (const field of fields) {
        const keyField = field === 'coverArt' ? 'coverArtKey' : 'thumbnailKey';
        let key = obj[keyField] || null;

        // Fallback: extract key from the stored URL for legacy records
        if (!key && obj[field]) {
          key = extractKeyFromWasabiUrl(obj[field]);
        }

        if (key) {
          try {
            obj[field] = await getSignedDownloadUrl(key, 7200); // 2 hours
          } catch (err) {
            console.error(`Error signing ${field} (key: ${key}):`, err.message);
          }
        }
        // If no key and not a wasabi URL, leave the field as-is (external URL)
      }

      return obj;
    })
  );

  return results;
}

/**
 * Resolve signed URL for a single document
 */
export async function resolveSignedUrl(doc, fields = ['thumbnail']) {
  if (!doc) return doc;
  const [result] = await resolveSignedUrls([doc], fields);
  return result;
}
