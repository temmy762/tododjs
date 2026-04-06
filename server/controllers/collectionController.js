import Collection from '../models/Collection.js';
import DatePack from '../models/DatePack.js';
import Album from '../models/Album.js';
import Track from '../models/Track.js';
import Source from '../models/Source.js';
import s3Client, { uploadToWasabi, deleteFromWasabi, ensureSignedUrl, signImageFields } from '../config/wasabi.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import yauzl from 'yauzl';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { pipeline as pipelineCb } from 'stream';
import { pipeline as pipelineAsync } from 'stream/promises';
import { parseBuffer } from 'music-metadata';
import { detectTonality } from '../services/tonalityDetection.js';
import { detectGenre, mapToFixedGenre } from '../services/genreDetection.js';
import { detectCategoryAsync } from '../services/categoryDetection.js';
import { sendEmail } from '../services/emailService.js';
import User from '../models/User.js';
import { enqueueCollection } from '../services/processingQueue.js';
import { generateCollectionName, detectGenres, extractDateFromFolderName } from '../utils/collectionNameGenerator.js';

// Strip cloud-storage timestamp suffix from folder names e.g. -20260324T054836Z-1-002
function cleanDatePackName(name) {
  if (!name) return name;
  return name.replace(/-\d{8}T\d{6}Z-\d+-\d+$/, '').trim();
}

function withTimeout(promise, timeoutMs, timeoutValue) {
  let timer;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => resolve(timeoutValue), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// ─── Post-upload: notify admin about tracks that landed in 'Others' ──────────
async function notifyAdminUncategorized(collectionId, collectionName) {
  try {
    const count = await Track.countDocuments({ collectionId, category: 'Others' });
    if (count === 0) return;

    // Surface raw labels that were detected but didn't match any known category
    const rawLabels = await Track.aggregate([
      { $match: { collectionId, category: 'Others', categoryRaw: { $ne: null } } },
      { $group: { _id: '$categoryRaw', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;

    const labelRows = rawLabels.length
      ? rawLabels.map(r => `<tr><td style="padding:6px 12px;border-bottom:1px solid #1a1a1a;">${r._id}</td><td style="padding:6px 12px;border-bottom:1px solid #1a1a1a;text-align:center;">${r.count}</td></tr>`).join('')
      : '<tr><td colspan="2" style="padding:10px;color:#666;">No label hints detected in titles</td></tr>';

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px;text-align:center;">
          <h1 style="margin:0;font-size:22px;font-weight:700;">⚠ Uncategorized Tracks</h1>
          <p style="margin:8px 0 0;opacity:.8;font-size:14px;">Action required in TodoDJs Admin</p>
        </div>
        <div style="padding:28px;">
          <p style="font-size:15px;color:#ccc;line-height:1.6;">
            Collection <strong style="color:#fff;">${collectionName}</strong> finished processing.<br>
            <strong style="color:#f59e0b;font-size:18px;">${count} track${count !== 1 ? 's' : ''}</strong> could not be matched to a known category and were placed in <strong>Others</strong>.
          </p>
          ${rawLabels.length ? `
          <p style="font-size:13px;color:#888;margin-top:20px;margin-bottom:8px;">Labels detected in titles but not yet in your category list:</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;color:#ccc;">
            <thead><tr style="background:#111;">
              <th style="padding:8px 12px;text-align:left;color:#888;">Detected Label</th>
              <th style="padding:8px 12px;text-align:center;color:#888;">Tracks</th>
            </tr></thead>
            <tbody>${labelRows}</tbody>
          </table>
          <p style="font-size:12px;color:#555;margin-top:10px;">Tip: create these as categories in the admin panel and they'll auto-assign on the next upload.</p>
          ` : ''}
          <div style="margin-top:24px;text-align:center;">
            <a href="${process.env.FRONTEND_URL || 'https://tododjs.com'}/#admin-categories" style="display:inline-block;padding:12px 28px;background:#7C3AED;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">Review in Admin Panel</a>
          </div>
        </div>
        <div style="padding:16px 28px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="margin:0;font-size:12px;color:#555;">© ${new Date().getFullYear()} TodoDJs</p>
        </div>
      </div>`;

    await sendEmail({
      to: adminEmail,
      subject: `⚠ ${count} uncategorized track${count !== 1 ? 's' : ''} in "${collectionName}"`,
      html,
      text: `${count} tracks in "${collectionName}" were placed in "Others" and need category assignment. Log in to review them at ${process.env.FRONTEND_URL || 'https://tododjs.com'}.`
    });

    console.log(`📧 Admin notified: ${count} uncategorized tracks in "${collectionName}"`);
  } catch (err) {
    console.error('notifyAdminUncategorized error:', err.message);
  }
}

// ─── Auto-assign cover art to Albums, DatePacks, and Collection ──────────────
async function autoAssignThumbnails(collectionId) {
  try {
    // 1. Albums — pick a random track cover per album
    const albums = await Album.find({ collectionId, $or: [{ coverArt: null }, { coverArt: '' }, { coverArt: { $exists: false } }] });
    for (const album of albums) {
      const track = await Track.findOne({ albumId: album._id, coverArt: { $nin: [null, ''] } });
      if (track?.coverArt) {
        album.coverArt = track.coverArt;
        await album.save();
      }
    }

    // 2. DatePacks — pick a random track cover from any track in the pack
    const datePacks = await DatePack.find({ collectionId, $or: [{ thumbnail: null }, { thumbnail: '' }, { thumbnail: { $exists: false } }] });
    for (const dp of datePacks) {
      const track = await Track.findOne({ datePackId: dp._id, coverArt: { $nin: [null, ''] } });
      if (track?.coverArt) {
        dp.thumbnail = track.coverArt;
        await dp.save();
      }
    }

    // 3. Collection — pick a random track cover from any track
    const collection = await Collection.findById(collectionId);
    if (collection && !collection.thumbnail) {
      const track = await Track.findOne({ collectionId, coverArt: { $nin: [null, ''] } });
      if (track?.coverArt) {
        collection.thumbnail = track.coverArt;
        await collection.save();
      } else {
        // No cover art found at all — notify admin via a flag
        collection.missingThumbnail = true;
        await collection.save();
        console.log(`⚠ No cover art found for collection "${collection.name}" — admin notified via banner`);
      }
    }

    console.log(`🖼  Auto-thumbnails assigned for collection ${collectionId}`);
  } catch (err) {
    console.error('autoAssignThumbnails error:', err.message);
  }
}

// @desc    Reprocess a collection from its stored Wasabi ZIP (useful after server restart)
// @route   POST /api/collections/:id/reprocess
// @access  Private/Admin
export const reprocessCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    if (!collection.zipKey) {
      return res.status(400).json({
        success: false,
        message: 'Collection has no stored ZIP key (zipKey). Re-upload the ZIP to start processing.'
      });
    }

    const cleanup = String(req.query.cleanup || 'true').toLowerCase() !== 'false';
    if (cleanup) {
      await DatePack.deleteMany({ collectionId: collection._id });
      await Album.deleteMany({ collectionId: collection._id });
      await Track.deleteMany({ collectionId: collection._id });
    }

    collection.status = 'processing';
    collection.processingProgress = 5;
    collection.totalDatePacks = 0;
    collection.totalAlbums = 0;
    collection.totalTracks = 0;
    collection.totalSize = 0;
    collection.errorMessage = null;
    await collection.save();

    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const outPath = path.join(
      tempDir,
      `${Date.now()}-${Math.random().toString(16).slice(2)}-reprocess-${collection._id}.zip`
    );

    console.log(`☁️ Reprocess: downloading stored ZIP from Wasabi: ${collection.zipKey}`);
    const command = new GetObjectCommand({
      Bucket: process.env.WASABI_BUCKET_NAME,
      Key: collection.zipKey
    });
    const s3Resp = await s3Client.send(command);
    if (!s3Resp?.Body) {
      return res.status(500).json({ success: false, message: 'Wasabi download failed (empty body)' });
    }

    await pipelineAsync(s3Resp.Body, fs.createWriteStream(outPath));
    console.log(`✅ Reprocess: ZIP downloaded to temp file: ${outPath}`);

    console.log(`🧵 Queuing reprocess background worker for collection: ${collection._id}`);
    enqueueCollection(
      () => processCollectionAsync(collection._id, outPath, collection, [], [], { skipZipUpload: true }),
      collection._id
    );

    return res.status(200).json({
      success: true,
      message: 'Collection reprocessing queued'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

function buildPreviewFromZipFile(zipPathOrBuffer, originalName, fileSize, depth = 0) {
  const zipFileName = path.basename(originalName, '.zip');

  const zip = new AdmZip(zipPathOrBuffer);
  const zipEntries = zip.getEntries();

  const normalizeEntryParts = (entryName, rootFolderName) => {
    const raw = entryName.split('/').filter(p => p);
    if (!rootFolderName) return raw;
    if (raw.length > 0 && raw[0] === rootFolderName) return raw.slice(1);
    return raw;
  };

  let motherFolderName = '';
  for (const entry of zipEntries) {
    const parts = entry.entryName.split('/').filter(p => p);
    if (parts.length > 0) {
      motherFolderName = parts[0];
      break;
    }
  }

  const suggestedCollectionName = generateCollectionName(motherFolderName);

  const isDateLikeFolderName = (name) => {
    if (!name) return false;
    return /(\d{2})[._-](\d{2})[._-](\d{2,4})/.test(name);
  };

  // If the ZIP only has 2-level MP3 paths like "X/track.mp3", X could be:
  // - a DatePack (DatePack/track.mp3)
  // - an Album under a single root DatePack (Root/Album/track.mp3)
  // Heuristic: if the 2-level folder names are mostly NOT date-like, treat them as albums under root.
  let twoLevelFolderCount = 0;
  let twoLevelDateLikeCount = 0;
  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;
    const parts = normalizeEntryParts(entry.entryName, motherFolderName);
    if (parts.length !== 2) continue;
    const fileName = parts[parts.length - 1];
    if (!fileName.toLowerCase().endsWith('.mp3')) continue;
    twoLevelFolderCount++;
    if (isDateLikeFolderName(parts[0])) twoLevelDateLikeCount++;
  }
  const interpretTwoLevelAsAlbumsUnderRoot =
    twoLevelFolderCount > 0 && (twoLevelDateLikeCount / twoLevelFolderCount) < 0.5;

  const datePacks = new Map();
  let totalAlbums = 0;
  let totalTracks = 0;

  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;

    const parts = normalizeEntryParts(entry.entryName, motherFolderName);
    if (parts.length === 0) continue;

    const fileName = parts[parts.length - 1];
    const isMP3 = fileName.toLowerCase().endsWith('.mp3');
    if (!isMP3) continue;

    let datePackName = null;
    let albumName = null;

    // Supported:
    // - DatePack/track.mp3
    // - DatePack/Album/track.mp3
    // - Album/track.mp3 (under a root folder) -> root DatePack + Album
    // - track.mp3 (no folders) -> default DatePack + Album
    if (parts.length >= 3) {
      datePackName = parts[0];
      albumName = parts[1];
    } else if (parts.length === 2) {
      if (interpretTwoLevelAsAlbumsUnderRoot) {
        datePackName = motherFolderName || 'Main';
        albumName = parts[0];
      } else {
        datePackName = parts[0];
        albumName = parts[0];
      }
    } else {
      datePackName = motherFolderName || 'Main';
      albumName = motherFolderName || 'Main';
    }

    if (!datePacks.has(datePackName)) {
      datePacks.set(datePackName, { name: datePackName, albums: new Map() });
    }

    const datePack = datePacks.get(datePackName);
    if (!datePack.albums.has(albumName)) {
      datePack.albums.set(albumName, { name: albumName, trackCount: 0 });
    }

    const album = datePack.albums.get(albumName);
    album.trackCount++;
    totalTracks++;
  }

  const datePackList = [];
  for (const dp of datePacks.values()) {
    const albumList = [];
    for (const album of dp.albums.values()) {
      if (album.trackCount > 0) {
        albumList.push({
          name: album.name,
          trackCount: album.trackCount
        });
        totalAlbums++;
      }
    }

    if (albumList.length > 0) {
      datePackList.push({
        name: dp.name,
        albums: albumList
      });
    }
  }

  const detectedGenres = detectGenres(datePackList);

  const extractedDate = extractDateFromFolderName(motherFolderName) ||
    (datePackList.length > 0 ? extractDateFromFolderName(datePackList[0].name) : null);

  if (totalTracks === 0 && depth === 0) {
    const nestedZipEntries = zipEntries.filter(entry =>
      !entry.isDirectory &&
      entry.entryName.toLowerCase().endsWith('.zip') &&
      !entry.entryName.includes('__MACOSX')
    );

    if (nestedZipEntries.length > 0) {
      const nestedDatePacks = [];
      let nestedTotalAlbums = 0;
      let nestedTotalTracks = 0;

      for (const nested of nestedZipEntries) {
        try {
          const nestedName = path.basename(nested.entryName, '.zip');
          const nestedPreview = buildPreviewFromZipFile(nested.getData(), nested.entryName, nested.header?.size || 0, depth + 1);
          if (nestedPreview?.datePacks?.length > 0) {
            for (const dp of nestedPreview.datePacks) {
              nestedDatePacks.push({
                name: nestedName,
                albums: dp.albums || []
              });
              nestedTotalAlbums += (dp.albums || []).length;
              for (const a of (dp.albums || [])) nestedTotalTracks += (a.trackCount || 0);
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (nestedDatePacks.length > 0) {
        const nestedGenres = detectGenres(nestedDatePacks);
        const extractedDateNested = nestedZipEntries.length > 0
          ? (extractDateFromFolderName(path.basename(nestedZipEntries[0].entryName, '.zip')) || extractedDate)
          : extractedDate;

        return {
          collectionName: zipFileName,
          suggestedCollectionName,
          motherFolderName,
          detectedGenres: nestedGenres,
          extractedDate: extractedDateNested,
          datePacks: nestedDatePacks,
          totalDatePacks: nestedDatePacks.length,
          totalAlbums: nestedTotalAlbums,
          totalTracks: nestedTotalTracks,
          fileSize
        };
      }
    }
  }

  return {
    collectionName: zipFileName,
    suggestedCollectionName,
    motherFolderName,
    detectedGenres,
    extractedDate,
    datePacks: datePackList,
    totalDatePacks: datePackList.length,
    totalAlbums,
    totalTracks,
    fileSize
  };
}

// Helper: Open a ZIP file with yauzl (supports >2GB)
function openZipFile(filePath) {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) reject(err);
      else resolve(zipfile);
    });
  });
}

// Helper: Read all entries from a yauzl zipfile
function readAllEntries(zipfile) {
  return new Promise((resolve, reject) => {
    const entries = [];
    zipfile.on('entry', (entry) => {
      entries.push(entry);
      zipfile.readEntry();
    });
    zipfile.on('end', () => resolve(entries));
    zipfile.on('error', reject);
    zipfile.readEntry();
  });
}

// Helper: Extract a single entry to a buffer
function extractEntryToBuffer(zipfile, entry) {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, readStream) => {
      if (err) return reject(err);
      const chunks = [];
      readStream.on('data', (chunk) => chunks.push(chunk));
      readStream.on('end', () => resolve(Buffer.concat(chunks)));
      readStream.on('error', reject);
    });
  });
}

// Helper: Extract a single entry to a file on disk
function extractEntryToFile(zipfile, entry, outputPath) {
  return new Promise((resolve, reject) => {
    zipfile.openReadStream(entry, (err, readStream) => {
      if (err) return reject(err);
      const writeStream = fs.createWriteStream(outputPath);
      readStream.pipe(writeStream);
      writeStream.on('finish', () => resolve(outputPath));
      writeStream.on('error', reject);
      readStream.on('error', reject);
    });
  });
}

function extractEntryToFileByName(zipPath, targetFileName, outputPath, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);

      let done = false;
      const startedAt = Date.now();
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        try { zipfile.close(); } catch { /* ignore */ }
        reject(new Error(`Timeout extracting inner ZIP entry after ${timeoutMs}ms: ${targetFileName}`));
      }, timeoutMs);

      const cleanup = () => {
        try { clearTimeout(timer); } catch { /* ignore */ }
        try {
          zipfile.removeAllListeners('entry');
          zipfile.removeAllListeners('end');
          zipfile.removeAllListeners('error');
        } catch {
          // ignore
        }
      };

      zipfile.on('error', (e) => {
        if (done) return;
        done = true;
        cleanup();
        try { zipfile.close(); } catch { /* ignore */ }
        reject(e);
      });

      zipfile.on('end', () => {
        if (done) return;
        done = true;
        cleanup();
        try { zipfile.close(); } catch { /* ignore */ }
        reject(new Error(`Inner ZIP entry not found: ${targetFileName}`));
      });

      zipfile.on('entry', (entry) => {
        if (done) return;

        if (entry.fileName !== targetFileName) {
          zipfile.readEntry();
          return;
        }

        zipfile.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr) {
            done = true;
            cleanup();
            try { zipfile.close(); } catch { /* ignore */ }
            reject(streamErr);
            return;
          }

          const writeStream = fs.createWriteStream(outputPath);
          pipelineCb(readStream, writeStream, (err) => {
            cleanup();

            if (err) {
              return reject(err);
            }
            if (done) return;
            done = true;
            cleanup();
            try { zipfile.close(); } catch { /* ignore */ }
            const elapsedMs = Date.now() - startedAt;
            try {
              const st = fs.statSync(outputPath);
              console.log(`   ✅ Extracted inner ZIP entry to file (${st.size} bytes, ${elapsedMs}ms): ${targetFileName}`);
            } catch {
              console.log(`   ✅ Extracted inner ZIP entry to file (${elapsedMs}ms): ${targetFileName}`);
            }
            resolve(outputPath);
          });

          // pipelineCb handles error propagation; no extra handlers needed
        });
      });

      zipfile.readEntry();
    });
  });
}

function extractEntryToBufferByName(zipPath, targetFileName, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);

      let done = false;
      const startedAt = Date.now();
      const timer = setTimeout(() => {
        if (done) return;
        done = true;
        cleanup();
        try { zipfile.close(); } catch { /* ignore */ }
        reject(new Error(`Timeout extracting ZIP entry after ${timeoutMs}ms: ${targetFileName}`));
      }, timeoutMs);

      const cleanup = () => {
        try { clearTimeout(timer); } catch { /* ignore */ }
        try {
          zipfile.removeAllListeners('entry');
          zipfile.removeAllListeners('end');
          zipfile.removeAllListeners('error');
        } catch {
          // ignore
        }
      };

      zipfile.on('error', (e) => {
        if (done) return;
        done = true;
        cleanup();
        try { zipfile.close(); } catch { /* ignore */ }
        reject(e);
      });

      zipfile.on('end', () => {
        if (done) return;
        done = true;
        cleanup();
        try { zipfile.close(); } catch { /* ignore */ }
        reject(new Error(`Entry not found: ${targetFileName}`));
      });

      zipfile.on('entry', (entry) => {
        if (done) return;

        if (entry.fileName !== targetFileName) {
          zipfile.readEntry();
          return;
        }

        zipfile.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr) {
            done = true;
            cleanup();
            try { zipfile.close(); } catch { /* ignore */ }
            reject(streamErr);
            return;
          }

          const chunks = [];
          readStream.on('data', (chunk) => chunks.push(chunk));
          readStream.on('error', (e) => {
            if (done) return;
            done = true;
            cleanup();
            try { zipfile.close(); } catch { /* ignore */ }
            reject(e);
          });
          readStream.on('end', () => {
            if (done) return;
            done = true;
            cleanup();
            try { zipfile.close(); } catch { /* ignore */ }
            const elapsedMs = Date.now() - startedAt;
            console.log(`   ✅ Extracted ZIP entry to buffer (${Buffer.concat(chunks).length} bytes, ${elapsedMs}ms): ${targetFileName}`);
            resolve(Buffer.concat(chunks));
          });
        });
      });

      zipfile.readEntry();
    });
  });
}

// @desc    Upload collection (main ZIP)
// @route   POST /api/collections
// @access  Private/Admin
export const uploadCollection = async (req, res) => {
  try {
    console.log('\n📥 Collection upload request received');
    console.log('Request body:', Object.keys(req.body));
    console.log('Request files:', req.files ? Object.keys(req.files) : 'none');
    
    const { name, year, month, thumbnail, scanResult, sourceId } = req.body;
    const zipFile = req.files?.zipFile?.[0];
    const thumbnailFile = req.files?.thumbnailFile?.[0];

    console.log('ZIP file:', zipFile ? `${zipFile.originalname} (${(zipFile.size / 1024 / 1024).toFixed(2)} MB) - saved to: ${zipFile.path}` : 'missing');

    if (!zipFile) {
      console.error('❌ No ZIP file in request');
      return res.status(400).json({
        success: false,
        message: 'Please upload a ZIP file'
      });
    }

    let thumbnailUrl = thumbnail;

    if (thumbnailFile) {
      console.log('📸 Uploading thumbnail to Wasabi...');
      const thumbnailBuffer = fs.readFileSync(thumbnailFile.path);
      const thumbnailKey = `collections/${name || path.parse(zipFile.originalname).name}/thumbnail${path.extname(thumbnailFile.originalname)}`;
      const thumbnailUpload = await uploadToWasabi(
        thumbnailBuffer,
        thumbnailKey,
        thumbnailFile.mimetype
      );
      thumbnailUrl = thumbnailUpload.location;
      console.log('✅ Thumbnail uploaded');
      fs.unlinkSync(thumbnailFile.path);
    }

    // Parse scanResult if it was sent as JSON string
    let parsedScanResult = null;
    if (scanResult) {
      try {
        parsedScanResult = typeof scanResult === 'string' ? JSON.parse(scanResult) : scanResult;
      } catch (e) {
        console.log('⚠️ Could not parse scanResult:', e.message);
      }
    }

    // Determine dates
    const now = new Date();
    const extractedDate = parsedScanResult?.extractedDate ? new Date(parsedScanResult.extractedDate) : null;
    
    // Get year and month from extracted date or current date
    const finalYear = year || (extractedDate ? extractedDate.getFullYear() : now.getFullYear());
    const finalMonth = month || (extractedDate ? String(extractedDate.getMonth() + 1).padStart(2, '0') : String(now.getMonth() + 1).padStart(2, '0'));

    console.log('💾 Creating collection record in database...');
    const collection = await Collection.create({
      name: name || path.parse(zipFile.originalname).name,
      platform: 'PlayList Pro', // Fixed platform name
      year: finalYear,
      month: finalMonth,
      thumbnail: thumbnailUrl,
      uploadedBy: req.user.id,
      sourceId: sourceId || undefined,
      status: 'pending', // Start as pending until cards are created
      processingProgress: 0,
      uploadDate: now,
      extractedDate: extractedDate,
      scanResult: parsedScanResult ? {
        motherFolderName: parsedScanResult.motherFolderName,
        detectedGenres: parsedScanResult.detectedGenres,
        folderStructure: parsedScanResult.datePacks
      } : null,
      collectionNameSource: name ? 'userEdited' : 'motherFolder'
    });
    console.log(`✅ Collection created: ${collection._id}`);

    // Create DatePack and Album cards immediately based on scan result
    const createdDatePacks = [];
    const createdAlbums = [];

    if (parsedScanResult?.datePacks && parsedScanResult.datePacks.length > 0) {
      console.log(`📦 Creating ${parsedScanResult.datePacks.length} date pack cards...`);
      
      for (const dp of parsedScanResult.datePacks) {
        // Extract date from date pack name
        const dateMatch = dp.name.match(/(\d{2})[._-](\d{2})[._-](\d{2,4})/);
        let packDate = now;
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
          packDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
        }

        const datePack = await DatePack.create({
          name: cleanDatePackName(dp.name),
          collectionId: collection._id,
          date: packDate,
          status: 'pending',
          sourceFolderName: dp.name
        });
        createdDatePacks.push({ _id: datePack._id, name: datePack.name, status: datePack.status });

        // Create Album cards for this date pack
        if (dp.albums && dp.albums.length > 0) {
          for (const albumData of dp.albums) {
            const genreMatch = albumData.name.match(/\((.*)\)/);
            const detectedGenre = genreMatch ? mapToFixedGenre(genreMatch[1]) : null;

            const album = await Album.create({
              collectionId: collection._id,
              datePackId: datePack._id,
              name: albumData.name,
              genre: detectedGenre,
              year: finalYear,
              coverArt: thumbnailUrl,
              trackCount: albumData.trackCount || 0,
              uploadedBy: req.user.id,
              status: 'pending',
              sourceFolderName: albumData.name,
              detectedGenre: detectedGenre
            });
            createdAlbums.push({ 
              _id: album._id, 
              name: album.name, 
              datePackId: datePack._id,
              status: album.status 
            });
          }
        }
      }
      console.log(` Created ${createdDatePacks.length} date packs and ${createdAlbums.length} albums`);
    }

    // Update collection status to processing
    collection.status = 'processing';
    collection.totalDatePacks = createdDatePacks.length;
    await collection.save();

    // Respond immediately (cards may be created during processing if no scanResult)
    res.status(201).json({
      success: true,
      message: createdDatePacks.length > 0
        ? 'Collection cards created. Processing started in background.'
        : 'Upload received. Processing started in background.',
      data: {
        collection: {
          _id: collection._id,
          name: collection.name,
          platform: collection.platform,
          status: collection.status,
          year: collection.year,
          month: collection.month,
          uploadDate: collection.uploadDate,
          extractedDate: collection.extractedDate
        },
        datePacks: createdDatePacks,
        albums: createdAlbums
      }
    });

    // Background: process the ZIP file via queue (prevents concurrent stalling)
    console.log(` Queuing background processing for collection: ${collection._id}`);
    enqueueCollection(
      () => processCollectionAsync(collection._id, zipFile.path, collection, createdDatePacks, createdAlbums),
      collection._id
    );
  } catch (error) {
    console.error('Collection upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const previewZipStructures = async (req, res) => {
  try {
    const zipFiles = req.files;
    if (!zipFiles || zipFiles.length === 0) {
      return res.status(400).json({ success: false, message: 'Please upload ZIP files' });
    }

    const results = [];

    for (const zipFile of zipFiles) {
      try {
        const zipInput = zipFile.buffer || zipFile.path;
        const preview = buildPreviewFromZipFile(zipInput, zipFile.originalname, zipFile.size);
        results.push({
          fileName: zipFile.originalname,
          success: true,
          data: preview
        });
        if (zipFile?.path && fs.existsSync(zipFile.path)) fs.unlinkSync(zipFile.path);
      } catch (error) {
        results.push({
          fileName: zipFile.originalname,
          success: false,
          message: error.message
        });
        if (zipFile?.path && fs.existsSync(zipFile.path)) fs.unlinkSync(zipFile.path);
      }
    }

    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

async function processCollectionAsync(collectionId, zipFilePath, collection, createdDatePacks, createdAlbums, opts = {}) {
  const tempDir = path.dirname(zipFilePath);
  const tempFilesToClean = [];
  try {
    console.log(`\n Starting collection processing: ${collection.name}`);

    // Move from 'queued' to 'processing' now that we have a slot
    if (collection.status === 'queued' || collection.status === 'pending') {
      collection.status = 'processing';
      collection.processingProgress = 0;
      await collection.save();
    }

    if (!opts.skipZipUpload) {
      const zipSizeGB = (fs.statSync(zipFilePath).size / (1024 * 1024 * 1024)).toFixed(2);
      console.log(` Uploading ${zipSizeGB} GB ZIP to Wasabi...`);
      const zipKey = `collections/${collection.name}/original/${Date.now()}-${path.basename(zipFilePath)}`;
      let lastLoggedPct = 0;
      const zipUpload = await uploadToWasabi(
        fs.createReadStream(zipFilePath),
        zipKey,
        'application/zip',
        (pct) => {
          const rounded = Math.floor(pct / 10) * 10;
          if (rounded > lastLoggedPct) {
            lastLoggedPct = rounded;
            console.log(`   Wasabi ZIP upload: ${rounded}%`);
          }
          const progress = Math.min(4, Math.round((pct / 100) * 4));
          if (progress > (collection.processingProgress || 0)) {
            collection.processingProgress = progress;
            Collection.findByIdAndUpdate(collectionId, { processingProgress: progress }).catch(() => {});
          }
        }
      );
      collection.zipUrl = zipUpload.location;
      collection.zipKey = zipUpload.key;
      collection.processingProgress = 5;
      await collection.save();
      console.log(` ZIP uploaded to Wasabi: ${collection.zipKey}`);
    } else {
      collection.processingProgress = Math.max(collection.processingProgress || 0, 5);
      await collection.save();
    }

    // Open ZIP and find MP3 files
    const zipfile = await openZipFile(zipFilePath);
    const entries = await readAllEntries(zipfile);
    console.log(` Total entries in ZIP: ${entries.length}`);

    const innerZipEntries = entries
      .filter(e =>
        !e.fileName.endsWith('/') &&
        e.fileName.toLowerCase().endsWith('.zip') &&
        !e.fileName.includes('__MACOSX')
      )
      .map(e => e.fileName);

    const outerMp3Count = entries.filter(e =>
      !e.fileName.endsWith('/') &&
      e.fileName.toLowerCase().endsWith('.mp3') &&
      !e.fileName.includes('__MACOSX')
    ).length;

    if (outerMp3Count === 0) {
      console.log(` Outer ZIP MP3 count: 0`);
      console.log(` Inner ZIP entries detected: ${innerZipEntries.length}`);
      const sample = entries
        .filter(e => !e.fileName.includes('__MACOSX'))
        .slice(0, 25)
        .map(e => e.fileName);
      console.log(` ZIP entry sample (first ${sample.length}):`, sample);
    }

    const processZipAsDatedPack = async (datedZipPath, datePackName, opts = {}) => {
      const {
        existingDatePack = null,
        progressStart = 5,
        progressEnd = 95
      } = opts;
      const now = new Date();
      const dateMatch = datePackName?.match(/(\d{2})[._-](\d{2})[._-](\d{2,4})/);
      let packDate = now;
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
        packDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
      }

      const datePack = existingDatePack || await DatePack.create({
        name: cleanDatePackName(datePackName),
        collectionId: collection._id,
        date: packDate,
        status: 'pending',
        sourceFolderName: datePackName
      });

      if (datePack.status !== 'processing') {
        datePack.status = 'processing';
        try { await datePack.save(); } catch { /* ignore */ }
      }

      let albumsCreated = 0;
      let tracksCreated = 0;
      let bytesUploaded = 0;
      const albumsCache = new Map();
      const albumCoverUrls = new Map();

      const getOrCreateAlbum = async (albumName, trackCountHint) => {
        const key = albumName || datePackName;
        if (albumsCache.has(key)) return albumsCache.get(key);

        const genreMatch = key.match(/\((.*)\)/);
        const genre = genreMatch ? mapToFixedGenre(genreMatch[1]) : null;

        const album = await Album.create({
          collectionId: collection._id,
          datePackId: datePack._id,
          sourceId: collection.sourceId || undefined,
          name: key,
          genre: genre,
          year: collection.year,
          coverArt: collection.thumbnail,
          trackCount: trackCountHint || 0,
          uploadedBy: collection.uploadedBy
        });

        albumsCreated++;
        albumsCache.set(key, album);
        return album;
      };

      let totalTracksHint = 0;
      try {
        const zfForCount = await openZipFile(datedZipPath);
        const zEntriesForCount = await readAllEntries(zfForCount);
        try { zfForCount.close(); } catch { /* ignore */ }
        totalTracksHint = zEntriesForCount.filter(e =>
          !e.fileName.endsWith('/') &&
          !e.fileName.includes('__MACOSX') &&
          e.fileName.toLowerCase().endsWith('.mp3')
        ).length;

        const albumNameSet = new Set();
        for (const e of zEntriesForCount) {
          if (e.fileName.endsWith('/')) continue;
          if (e.fileName.includes('__MACOSX')) continue;
          if (!e.fileName.toLowerCase().endsWith('.mp3')) continue;
          const parts = e.fileName.split('/').filter(Boolean);
          const parentFolder = parts.length >= 2 ? parts[parts.length - 2] : null;
          const a = parentFolder || datePackName;
          albumNameSet.add(a);
        }

        for (const aName of albumNameSet) {
          await getOrCreateAlbum(aName, 0);
        }
      } catch {
        // ignore
      }

      collection.totalTracksEstimate = (collection.totalTracksEstimate || 0) + totalTracksHint;
      Collection.findByIdAndUpdate(collection._id, { totalTracksEstimate: collection.totalTracksEstimate }).catch(() => {});

      const maybeUpdateCollectionProgress = async () => {
        if (totalTracksHint <= 0) return;
        const pct = progressStart + ((tracksCreated / totalTracksHint) * (progressEnd - progressStart));
        const mapped = Math.max(collection.processingProgress || 0, Math.min(progressEnd, Math.round(pct)));
        if ((collection.processingProgress ?? 0) >= mapped) return;
        collection.processingProgress = mapped;
        try { await collection.save(); } catch { /* ignore */ }
      };

      let lastProgressUpdateMs = 0;
      const maybeUpdateCollectionProgressEffective = async (effectiveTracks) => {
        if (totalTracksHint <= 0) return;
        const nowMs = Date.now();
        if (nowMs - lastProgressUpdateMs < 1200) return;
        lastProgressUpdateMs = nowMs;

        const safeEffective = Math.max(0, Math.min(totalTracksHint, effectiveTracks));
        const pct = progressStart + ((safeEffective / totalTracksHint) * (progressEnd - progressStart));
        const mapped = Math.max(collection.processingProgress || 0, Math.min(progressEnd, Math.round(pct)));
        if ((collection.processingProgress ?? 0) >= mapped) return;
        collection.processingProgress = mapped;
        try { await collection.save(); } catch { /* ignore */ }
      };

      const processZipRecursively = async (zipPath, albumHint, depth = 0) => {
        if (depth > 6) return;

        const zf = await openZipFile(zipPath);
        const zEntries = await readAllEntries(zf);
        try { zf.close(); } catch { /* ignore */ }

        const mp3Names = zEntries
          .filter(e => !e.fileName.endsWith('/') && !e.fileName.includes('__MACOSX') && e.fileName.toLowerCase().endsWith('.mp3'))
          .map(e => e.fileName);

        const innerZipNames = zEntries
          .filter(e => !e.fileName.endsWith('/') && !e.fileName.includes('__MACOSX') && e.fileName.toLowerCase().endsWith('.zip'))
          .map(e => e.fileName);

        if (mp3Names.length > 0) {
          for (const mp3FileName of mp3Names) {
            const mp3Parts = mp3FileName.split('/').filter(Boolean);
            const parentFolder = mp3Parts.length >= 2 ? mp3Parts[mp3Parts.length - 2] : null;
            const finalAlbumName = parentFolder || albumHint || datePackName;
            const album = await getOrCreateAlbum(finalAlbumName, 0);

            const mp3Buffer = await extractEntryToBufferByName(zipPath, mp3FileName);
            const mp3Name = path.basename(mp3FileName);
            collection.processingDetail = path.parse(mp3Name).name;

            // Update progress early (analysis may take time)
            await maybeUpdateCollectionProgressEffective(tracksCreated + 0.15);

            let metadata = {
              title: path.parse(mp3Name).name,
              artist: 'Unknown Artist',
              bpm: null,
              duration: 0
            };
            let trackCoverArt = albumCoverUrls.get(album._id.toString())?.url || collection.thumbnail;
            let trackCoverArtKey = albumCoverUrls.get(album._id.toString())?.key || null;

            try {
              const musicMetadata = await parseBuffer(mp3Buffer, { mimeType: 'audio/mpeg' });
              metadata = {
                title: musicMetadata.common.title || metadata.title,
                artist: musicMetadata.common.artist || metadata.artist,
                bpm: musicMetadata.common.bpm || null,
                duration: musicMetadata.format.duration || 0
              };
              if (!albumCoverUrls.has(album._id.toString()) && musicMetadata.common.picture?.length > 0) {
                try {
                  const pic = musicMetadata.common.picture[0];
                  const mimeType = pic.format || 'image/jpeg';
                  const ext = mimeType.split('/').pop() || 'jpg';
                  const coverKey = `collections/${collection.name}/albums/${album.name}/cover.${ext}`;
                  const coverUpload = await uploadToWasabi(Buffer.from(pic.data), coverKey, mimeType);
                  trackCoverArt = coverUpload.location;
                  trackCoverArtKey = coverKey;
                  albumCoverUrls.set(album._id.toString(), { url: trackCoverArt, key: coverKey });
                  Album.findByIdAndUpdate(album._id, { coverArt: trackCoverArt, coverArtKey: coverKey }).catch(() => {});
                } catch {
                  // ignore, fall back to collection thumbnail
                }
              } else if (albumCoverUrls.has(album._id.toString())) {
                trackCoverArt = albumCoverUrls.get(album._id.toString()).url;
                trackCoverArtKey = albumCoverUrls.get(album._id.toString()).key;
              }
            } catch (error) {
              // ignore
            }

            const tonalityResult = await withTimeout(
              detectTonality(mp3Buffer, metadata),
              45000,
              { tonality: null, detectedBpm: null }
            );

            const tonality = tonalityResult?.tonality || {
              key: null,
              scale: null,
              camelot: null,
              source: 'timeout',
              confidence: 0,
              needsManualReview: true
            };

            if (!metadata.bpm && tonalityResult?.detectedBpm) {
              metadata.bpm = tonalityResult.detectedBpm;
            }

            const genreResult = await withTimeout(
              detectGenre(mp3Buffer, metadata),
              45000,
              { genre: null, confidence: 0, source: 'timeout', needsManualReview: true }
            );

            await maybeUpdateCollectionProgressEffective(tracksCreated + 0.35);

            const trackKey = `collections/${collection.name}/albums/${album.name}/${mp3Name}`;
            const trackUpload = await uploadToWasabi(mp3Buffer, trackKey, 'audio/mpeg');

            await Track.create({
              collectionId: collection._id,
              datePackId: datePack._id,
              albumId: album._id,
              sourceId: collection.sourceId || undefined,
              title: metadata.title,
              artist: metadata.artist,
              genre: genreResult.genre || album.genre || 'Others',
              ...(await detectCategoryAsync(metadata.title, finalAlbumName)),
              categoryVerified: false,
              genreConfidence: genreResult.confidence,
              genreSource: genreResult.source,
              genreNeedsReview: genreResult.needsManualReview,
              bpm: metadata.bpm || 128,
              tonality: tonality,
              pool: collection.platform,
              coverArt: trackCoverArt,
              coverArtKey: trackCoverArtKey,
              audioFile: {
                url: trackUpload.location,
                key: trackUpload.key,
                format: 'MP3',
                size: mp3Buffer.length,
                duration: metadata.duration
              },
              versionType: 'Original Mix',
              uploadedBy: collection.uploadedBy,
              status: 'published'
            });

            bytesUploaded += mp3Buffer.length;
            tracksCreated++;
            collection.tracksProcessed = (collection.tracksProcessed || 0) + 1;
            await maybeUpdateCollectionProgress();
          }
        }

        for (const innerZipName of innerZipNames) {
          const nestedAlbumHint = path.basename(innerZipName, '.zip') || albumHint;
          const outPath = path.join(
            tempDir,
            `${Date.now()}-${Math.random().toString(16).slice(2)}-${path.basename(innerZipName)}`
          );
          await extractEntryToFileByName(zipPath, innerZipName, outPath);
          await processZipRecursively(outPath, nestedAlbumHint, depth + 1);
          if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        }
      };

      await processZipRecursively(datedZipPath, datePackName, 0);

      if (tracksCreated === 0) {
        await DatePack.deleteOne({ _id: datePack._id });
        await Album.deleteMany({ datePackId: datePack._id });
        return { datePack: null, albumsCreated: 0, tracksCreated: 0, bytesUploaded: 0 };
      }

      const createdAlbumsList = await Album.find({ datePackId: datePack._id });
      for (const a of createdAlbumsList) {
        const c = await Track.countDocuments({ albumId: a._id });
        a.trackCount = c;
        a.status = c > 0 ? 'complete' : 'failed';
        await a.save();
      }

      datePack.status = 'completed';
      datePack.processingProgress = 100;
      try { await datePack.save(); } catch { /* ignore */ }

      return { datePack, albumsCreated: createdAlbumsList.length, tracksCreated, bytesUploaded };
    };

    if (outerMp3Count === 0 && innerZipEntries.length > 0) {
      let totalAlbumsNested = 0;
      let totalTracksNested = 0;
      let totalBytesNested = 0;

      for (let i = 0; i < innerZipEntries.length; i++) {
        const innerZipName = innerZipEntries[i];
        const baseName = path.basename(innerZipName, '.zip');

        // Create the DatePack card immediately so the UI has something to show
        const now = new Date();
        const dateMatch = baseName?.match(/(\d{2})[._-](\d{2})[._-](\d{2,4})/);
        let packDate = now;
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
          packDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
        }

        const cleanedBaseName = cleanDatePackName(baseName);
        const existingPack = await DatePack.findOne({ collectionId: collection._id, name: cleanedBaseName });
        const datePackDoc = existingPack || await DatePack.create({
          name: cleanedBaseName,
          collectionId: collection._id,
          date: packDate,
          status: 'processing',
          sourceFolderName: baseName
        });

        collection.totalDatePacks = (i + 1);

        const progressStart = Math.max(collection.processingProgress || 0, 5 + Math.round((i / innerZipEntries.length) * 90));
        const progressEnd = Math.max(progressStart, 5 + Math.round(((i + 1) / innerZipEntries.length) * 90));
        collection.processingProgress = progressStart;
        await collection.save();

        const outPath = path.join(
          tempDir,
          `${Date.now()}-${Math.random().toString(16).slice(2)}-${path.basename(innerZipName)}`
        );
        await extractEntryToFileByName(zipFilePath, innerZipName, outPath);
        const result = await processZipAsDatedPack(outPath, baseName, {
          existingDatePack: datePackDoc,
          progressStart,
          progressEnd
        });
        totalAlbumsNested += result.albumsCreated;
        totalTracksNested += result.tracksCreated;
        totalBytesNested += result.bytesUploaded;
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);

        const pct = innerZipEntries.length > 0
          ? Math.min(95, Math.round(((i + 1) / innerZipEntries.length) * 95))
          : 0;
        collection.processingProgress = Math.max(collection.processingProgress || 0, pct);
        await collection.save();
      }

      collection.totalDatePacks = innerZipEntries.length;
      collection.totalAlbums = totalAlbumsNested;
      collection.totalTracks = totalTracksNested;
      collection.totalSize = totalBytesNested;

      if (totalTracksNested === 0 || innerZipEntries.length === 0) {
        collection.status = 'failed';
        collection.processingProgress = 0;
        await collection.save();
        try { zipfile.close(); } catch { /* ignore */ }
        console.log(' Nested ZIP processing found no MP3 files. Marking collection as failed.');
        return;
      }

      collection.processingProgress = 100;
      collection.status = 'completed';
      await collection.save();

      try { zipfile.close(); } catch { /* ignore */ }

      console.log(`\n Collection processing completed!`);
      console.log(`   Albums: ${totalAlbumsNested}`);
      console.log(`   Tracks: ${totalTracksNested}`);

      setImmediate(() => autoAssignThumbnails(collection._id).catch(() => {}));
      setImmediate(() => notifyAdminUncategorized(collection._id, collection.name).catch(() => {}));

      if (fs.existsSync(zipFilePath)) {
        fs.unlinkSync(zipFilePath);
        console.log(' Cleaned up temp ZIP file');
      }
      return;
    }

    const isDateLikeFolderName = (name) => {
      if (!name) return false;
      return /(\d{2})[._-](\d{2})[._-](\d{2,4})/.test(name);
    };

    const guessMotherFolderName = (zipEntries) => {
      const counts = new Map();
      let total = 0;
      for (const e of zipEntries) {
        if (e.fileName.endsWith('/')) continue;
        const lower = e.fileName.toLowerCase();
        if (!lower.endsWith('.mp3')) continue;
        if (lower.includes('__macosx')) continue;
        const parts = e.fileName.split('/').filter(Boolean);
        if (parts.length === 0) continue;
        total++;
        counts.set(parts[0], (counts.get(parts[0]) || 0) + 1);
      }
      if (total === 0) return null;
      let best = null;
      let bestCount = 0;
      for (const [k, v] of counts) {
        if (v > bestCount) {
          best = k;
          bestCount = v;
        }
      }
      if (!best) return null;
      return (bestCount / total) >= 0.7 ? best : null;
    };

    const motherFolderName = collection?.scanResult?.motherFolderName || guessMotherFolderName(entries);

    // Detect ambiguous 2-level layout for this ZIP (see buildPreviewFromZipFile)
    let twoLevelFolderCount = 0;
    let twoLevelDateLikeCount = 0;
    for (const entry of entries) {
      if (entry.fileName.endsWith('/')) continue;
      if (!entry.fileName.toLowerCase().endsWith('.mp3')) continue;
      if (entry.fileName.includes('__MACOSX')) continue;
      const rawParts = entry.fileName.split('/').filter(p => p);
      if (rawParts.length === 0) continue;
      const rootFolder = motherFolderName || rawParts[0];
      const parts = rawParts[0] === rootFolder ? rawParts.slice(1) : rawParts;
      if (parts.length !== 2) continue;
      twoLevelFolderCount++;
      if (isDateLikeFolderName(parts[0])) twoLevelDateLikeCount++;
    }
    const interpretTwoLevelAsAlbumsUnderRoot =
      twoLevelFolderCount > 0 && (twoLevelDateLikeCount / twoLevelFolderCount) < 0.5;

    // Find all MP3 files and group by date pack name
    const mp3FilesByDatePack = new Map();
    for (const entry of entries) {
      if (entry.fileName.endsWith('/')) continue;
      if (!entry.fileName.toLowerCase().endsWith('.mp3')) continue;
      if (entry.fileName.includes('__MACOSX')) continue;

      const rawParts = entry.fileName.split('/').filter(p => p);
      if (rawParts.length === 0) continue;

      const rootFolder = motherFolderName || rawParts[0];
      const parts = rawParts[0] === rootFolder ? rawParts.slice(1) : rawParts;
      if (parts.length === 0) continue;

      let datePackName = null;
      let albumName = null;
      if (parts.length >= 3) {
        datePackName = parts[0];
        albumName = parts[1];
      } else if (parts.length === 2) {
        if (interpretTwoLevelAsAlbumsUnderRoot) {
          datePackName = rootFolder || 'Main';
          albumName = parts[0];
        } else {
          datePackName = parts[0];
          albumName = parts[0];
        }
      } else {
        datePackName = rootFolder || 'Main';
        albumName = rootFolder || 'Main';
      }

      if (!mp3FilesByDatePack.has(datePackName)) {
        mp3FilesByDatePack.set(datePackName, []);
      }
      mp3FilesByDatePack.get(datePackName).push({
        fileName: entry.fileName,
        albumName: albumName || 'Unknown Album'
      });
    }

    // If the collection was created without scan/preview, create DatePack/Album cards now.
    const ensureCardsExist = async () => {
      const existing = await DatePack.find({ collectionId: collection._id });
      if (existing.length > 0) return existing;

      console.log(' No date pack cards found. Creating cards from ZIP contents...');
      const now = new Date();
      const created = [];

      for (const [datePackName, mp3Files] of mp3FilesByDatePack) {
        const dateMatch = datePackName?.match(/(\d{2})[._-](\d{2})[._-](\d{2,4})/);
        let packDate = now;
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
          packDate = new Date(fullYear, parseInt(month) - 1, parseInt(day));
        }

        const datePack = await DatePack.create({
          name: datePackName,
          collectionId: collection._id,
          date: packDate,
          status: 'pending',
          sourceFolderName: datePackName
        });
        created.push(datePack);

        const mp3sByAlbum = new Map();
        for (const mp3 of mp3Files) {
          const aName = mp3.albumName || 'Unknown Album';
          if (!mp3sByAlbum.has(aName)) mp3sByAlbum.set(aName, []);
          mp3sByAlbum.get(aName).push(mp3);
        }

        for (const [albumName, albumMp3s] of mp3sByAlbum) {
          const genreMatch = albumName.match(/\((.*)\)/);
          const detectedGenre = genreMatch ? mapToFixedGenre(genreMatch[1]) : null;
          await Album.create({
            collectionId: collection._id,
            datePackId: datePack._id,
            name: albumName,
            genre: detectedGenre,
            year: collection.year,
            coverArt: collection.thumbnail,
            trackCount: albumMp3s.length,
            uploadedBy: collection.uploadedBy,
            status: 'pending',
            sourceFolderName: albumName,
            detectedGenre: detectedGenre
          });
        }
      }

      collection.totalDatePacks = created.length;
      await collection.save();
      console.log(` Created ${created.length} date packs from ZIP contents`);
      return created;
    };

    const finalDatePacks = await ensureCardsExist();

    // Build a map of date pack name to ID
    const datePackMap = new Map();
    for (const dp of finalDatePacks) {
      datePackMap.set(dp.name, dp._id.toString());
    }

    console.log(` Found MP3s in ${mp3FilesByDatePack.size} date packs`);

    if (mp3FilesByDatePack.size === 0) {
      collection.status = 'failed';
      collection.processingProgress = 0;
      await collection.save();
      try { zipfile.close(); } catch { /* ignore */ }
      console.log(' No MP3 files found in ZIP. Marking collection as failed.');
      return;
    }

    let totalAlbums = 0;
    let totalTracks = 0;
    let totalSize = 0;
    let processedCount = 0;

    // Process each date pack
    for (const [datePackName, mp3Files] of mp3FilesByDatePack) {
      const datePackId = datePackMap.get(datePackName);
      if (!datePackId) {
        console.log(`   Date pack "${datePackName}" not found in existing cards, skipping`);
        continue;
      }

      const datePack = await DatePack.findById(datePackId);
      console.log(`\n Processing date pack: ${datePackName} (${mp3Files.length} MP3s)`);

      // Update date pack status
      datePack.status = 'processing';
      await datePack.save();

      // Process tracks and update existing albums
      const result = await processTracksForDatePack(
        zipFilePath,
        mp3Files,
        datePack,
        collection
      );

      // Update date pack with results
      datePack.totalAlbums = result.albums;
      datePack.totalTracks = result.tracks;
      datePack.totalSize = result.size;
      datePack.status = 'completed';
      datePack.processingProgress = 100;
      await datePack.save();

      totalAlbums += result.albums;
      totalTracks += result.tracks;
      totalSize += result.size;
      processedCount++;

      const progress = 10 + (processedCount / mp3FilesByDatePack.size) * 85;
      collection.processingProgress = Math.round(progress);
      await collection.save();
      console.log(`   Date pack complete. Progress: ${Math.round(progress)}%`);
    }

    collection.totalAlbums = totalAlbums;
    collection.totalTracks = totalTracks;
    collection.totalSize = totalSize;
    collection.status = 'completed';
    collection.processingProgress = 100;
    await collection.save();

    try { zipfile.close(); } catch { /* ignore */ }

    console.log(`\n Collection processing completed!`);
    console.log(`   Albums: ${totalAlbums}`);
    console.log(`   Tracks: ${totalTracks}`);

    setImmediate(() => autoAssignThumbnails(collection._id).catch(() => {}));
    setImmediate(() => notifyAdminUncategorized(collection._id, collection.name).catch(() => {}));

    if (fs.existsSync(zipFilePath)) {
      fs.unlinkSync(zipFilePath);
      console.log(' Cleaned up temp ZIP file');
    }
  } catch (error) {
    console.error('Collection processing error:', error);
    for (const tempFile of tempFilesToClean) {
      try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch { /* ignore */ }
    }
    try { if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath); } catch { /* ignore */ }

    try {
      const failedCollection = await Collection.findById(collectionId);
      if (failedCollection) {
        failedCollection.status = 'failed';
        failedCollection.errorMessage = error.message;
        await failedCollection.save();
      }
    } catch (saveErr) {
      console.error('Could not mark collection as failed:', saveErr.message);
    }
  }
}

async function processTracksForDatePack(zipFilePath, mp3Files, datePack, collection) {
  console.log(`   Processing ${mp3Files.length} tracks for date pack: ${datePack.name}`);
  
  // Get existing albums for this date pack
  const existingAlbums = await Album.find({ datePackId: datePack._id });
  console.log(`      Found ${existingAlbums.length} existing album cards`);
  
  // Build map of album name to album ID
  const albumMap = new Map();
  for (const album of existingAlbums) {
    albumMap.set(album.name, album._id.toString());
  }
  
  // Group MP3 files by album name
  const mp3sByAlbum = new Map();
  for (const mp3 of mp3Files) {
    const albumName = mp3.albumName;
    if (!mp3sByAlbum.has(albumName)) {
      mp3sByAlbum.set(albumName, []);
    }
    mp3sByAlbum.get(albumName).push(mp3);
  }
  
  console.log(`      Tracks grouped into ${mp3sByAlbum.size} albums`);
  
  let totalTracks = 0;
  let totalSize = 0;
  let processedAlbums = 0;
  
  // Per-album cover art cache (extracted from first MP3 with embedded picture)
  const albumCoverCache = new Map();

  // Process each album
  for (const [albumName, albumMp3s] of mp3sByAlbum) {
    const albumId = albumMap.get(albumName);
    if (!albumId) {
      console.log(`      Album "${albumName}" not found in existing cards, skipping ${albumMp3s.length} tracks`);
      continue;
    }
    
    const album = await Album.findById(albumId);
    console.log(`      Processing album: ${albumName} (${albumMp3s.length} tracks)`);
    
    // Update album status
    album.status = 'processing';
    await album.save();
    
    let albumTrackCount = 0;
    let albumSize = 0;
    
    // Process each MP3 in this album
    for (const mp3Info of albumMp3s) {
      try {
        // Extract MP3 from ZIP (fresh yauzl instance per call — avoids listener accumulation)
        const mp3Buffer = await extractEntryToBufferByName(zipFilePath, mp3Info.fileName);
        if (!mp3Buffer) {
          console.log(`      Could not extract ${mp3Info.fileName}`);
          continue;
        }
        
        const trackSize = mp3Buffer.length;
        albumSize += trackSize;
        totalSize += trackSize;
        
        const mp3Name = path.basename(mp3Info.fileName);
        
        // Parse metadata + extract embedded cover art
        let metadata = {
          title: path.parse(mp3Name).name,
          artist: 'Unknown Artist',
          bpm: null,
          duration: 0
        };
        
        try {
          const musicMetadata = await parseBuffer(mp3Buffer, { mimeType: 'audio/mpeg' });
          metadata = {
            title: musicMetadata.common.title || metadata.title,
            artist: musicMetadata.common.artist || metadata.artist,
            bpm: musicMetadata.common.bpm || extractBPMFromFilename(mp3Name),
            duration: musicMetadata.format.duration || 0
          };

          // Extract embedded cover art from first track in album that has it
          if (!albumCoverCache.has(album._id.toString()) && musicMetadata.common.picture?.length > 0) {
            try {
              const pic = musicMetadata.common.picture[0];
              const mimeType = pic.format || 'image/jpeg';
              const ext = mimeType.split('/').pop() || 'jpg';
              const coverKey = `collections/${collection.name}/albums/${album.name}/cover.${ext}`;
              const coverUpload = await uploadToWasabi(Buffer.from(pic.data), coverKey, mimeType);
              albumCoverCache.set(album._id.toString(), { url: coverUpload.location, key: coverKey });
              Album.findByIdAndUpdate(album._id, { coverArt: coverUpload.location, coverArtKey: coverKey }).catch(() => {});
            } catch { /* ignore — fall back to collection thumbnail */ }
          }
        } catch (error) {
          console.log(`      Metadata parsing failed for ${mp3Name}`);
          metadata.bpm = extractBPMFromFilename(mp3Name);
        }

        const trackCoverArt = albumCoverCache.get(album._id.toString())?.url || album.coverArt || collection.thumbnail;
        const trackCoverArtKey = albumCoverCache.get(album._id.toString())?.key || null;
        
        // Detect tonality and genre (time bounded)
        const tonalityResult = await withTimeout(
          detectTonality(mp3Buffer, metadata),
          45000,
          { tonality: null, detectedBpm: null }
        );
        const tonality = tonalityResult?.tonality || {
          key: null,
          scale: null,
          camelot: null,
          source: 'timeout',
          confidence: 0,
          needsManualReview: true
        };

        if (!metadata.bpm && tonalityResult?.detectedBpm) {
          metadata.bpm = tonalityResult.detectedBpm;
        }

        const genreResult = await withTimeout(
          detectGenre(mp3Buffer, metadata),
          45000,
          { genre: null, confidence: 0, source: 'timeout', needsManualReview: true }
        );
        
        // Upload track to Wasabi
        const trackKey = `collections/${collection.name}/date-packs/${datePack.name}/albums/${albumName}/${mp3Name}`;
        const trackUpload = await uploadToWasabi(
          mp3Buffer,
          trackKey,
          'audio/mpeg'
        );
        
        // Create track record
        await Track.create({
          collectionId: collection._id,
          datePackId: datePack._id,
          albumId: album._id,
          title: metadata.title,
          artist: metadata.artist,
          genre: genreResult.genre || album.genre || 'Others',
          ...(await detectCategoryAsync(metadata.title, albumName)),
          categoryVerified: false,
          genreConfidence: genreResult.confidence,
          genreSource: genreResult.source,
          genreNeedsReview: genreResult.needsManualReview,
          bpm: metadata.bpm || 128,
          tonality: tonality,
          pool: collection.platform,
          coverArt: trackCoverArt || '',
          coverArtKey: trackCoverArtKey,
          audioFile: {
            url: trackUpload.location,
            key: trackUpload.key,
            format: 'MP3',
            size: trackSize,
            duration: metadata.duration
          },
          uploadedBy: collection.uploadedBy,
          status: 'published'
        });
        
        albumTrackCount++;
        totalTracks++;
        
      } catch (error) {
        console.error(`      Error processing track ${mp3Info.fileName}:`, error.message);
      }
    }
    
    // Update album with results
    album.trackCount = albumTrackCount;
    album.totalSize = albumSize;
    album.status = albumTrackCount > 0 ? 'complete' : 'failed';
    await album.save();
    
    processedAlbums++;
    console.log(`      Album complete: ${albumTrackCount} tracks uploaded`);
  }
  
  return {
    albums: processedAlbums,
    tracks: totalTracks,
    size: totalSize
  };
}

async function extractFileFromZip(zipfile, fileName) {
  return new Promise((resolve, reject) => {
    let found = false;
    
    zipfile.on('entry', (entry) => {
      if (entry.fileName === fileName) {
        found = true;
        zipfile.openReadStream(entry, (err, readStream) => {
          if (err) return reject(err);
          
          const chunks = [];
          readStream.on('data', (chunk) => chunks.push(chunk));
          readStream.on('end', () => {
            resolve(Buffer.concat(chunks));
          });
          readStream.on('error', reject);
        });
      } else {
        zipfile.readEntry();
      }
    });
    
    zipfile.on('end', () => {
      if (!found) resolve(null);
    });
    
    zipfile.on('error', reject);
    zipfile.readEntry();
  });
}

async function processDatePack(dateZipBuffer, datePack, collection) {
  const dateZip = new AdmZip(dateZipBuffer);
  const entries = dateZip.getEntries();

  const albumFolders = {};
  
  for (const entry of entries) {
    if (entry.isDirectory && !entry.entryName.includes('__MACOSX')) {
      const folderPath = entry.entryName.replace(/\/$/, '');
      const folderName = path.basename(folderPath);
      
      if (folderName && !albumFolders[folderName]) {
        albumFolders[folderName] = folderPath;
      }
    }
  }

  console.log(`   Found ${Object.keys(albumFolders).length} album folders`);

  let albumCount = 0;
  let trackCount = 0;
  let totalSize = 0;

  for (const [albumName, albumPath] of Object.entries(albumFolders)) {
    console.log(`      Processing album: ${albumName}`);

    const genreMatch = albumName.match(/\((.*)\)/);
    const genre = genreMatch ? mapToFixedGenre(genreMatch[1]) : null;

    const albumEntries = entries.filter(e => 
      e.entryName.startsWith(albumPath + '/') && 
      !e.isDirectory &&
      !e.entryName.includes('__MACOSX')
    );

    const mp3Files = albumEntries.filter(e => e.entryName.toLowerCase().endsWith('.mp3'));
    const coverFile = albumEntries.find(e => 
      /\.(jpg|jpeg|png)$/i.test(e.entryName)
    );

    if (mp3Files.length === 0) {
      console.log(`      ⚠ No MP3 files found, skipping`);
      continue;
    }

    let coverArtUrl = collection.thumbnail;
    if (coverFile) {
      const coverKey = `collections/${collection.name}/albums/${albumName}/cover${path.extname(coverFile.entryName)}`;
      const coverUpload = await uploadToWasabi(
        coverFile.getData(),
        coverKey,
        `image/${path.extname(coverFile.entryName).substring(1)}`
      );
      coverArtUrl = coverUpload.location;
    }

    const album = await Album.create({
      collectionId: collection._id,
      datePackId: datePack._id,
      name: albumName,
      genre: genre,
      year: collection.year,
      coverArt: coverArtUrl,
      trackCount: mp3Files.length,
      uploadedBy: collection.uploadedBy
    });

    // Build a ZIP containing only this album's tracks
    const albumZip = new AdmZip();
    for (const entry of mp3Files) {
      albumZip.addFile(path.basename(entry.entryName), entry.getData());
    }
    const albumZipBuffer = albumZip.toBuffer();
    const albumZipKey = `collections/${collection.name}/albums/${albumName}/album.zip`;
    const albumZipUpload = await uploadToWasabi(
      albumZipBuffer,
      albumZipKey,
      'application/zip'
    );

    album.zipUrl = albumZipUpload.location;
    album.zipKey = albumZipUpload.key;

    let albumSize = 0;

    for (const mp3Entry of mp3Files) {
      const mp3Buffer = mp3Entry.getData();
      const mp3Name = path.basename(mp3Entry.entryName);

      let metadata = {
        title: path.parse(mp3Name).name,
        artist: 'Unknown Artist',
        bpm: null,
        duration: 0
      };

      try {
        const musicMetadata = await parseBuffer(mp3Buffer, { mimeType: 'audio/mpeg' });
        metadata = {
          title: musicMetadata.common.title || metadata.title,
          artist: musicMetadata.common.artist || metadata.artist,
          bpm: musicMetadata.common.bpm || extractBPMFromFilename(mp3Name),
          duration: musicMetadata.format.duration || 0
        };
      } catch (error) {
        console.log(`      ⚠ Metadata parsing failed for ${mp3Name}`);
        metadata.bpm = extractBPMFromFilename(mp3Name);
      }

      const tonalityResult = await withTimeout(
        detectTonality(mp3Buffer, metadata),
        45000,
        { tonality: null, detectedBpm: null }
      );
      const tonality = tonalityResult?.tonality || {
        key: null,
        scale: null,
        camelot: null,
        source: 'timeout',
        confidence: 0,
        needsManualReview: true
      };

      if (!metadata.bpm && tonalityResult?.detectedBpm) {
        metadata.bpm = tonalityResult.detectedBpm;
      }

      const genreResult = await withTimeout(
        detectGenre(mp3Buffer, metadata),
        45000,
        { genre: null, confidence: 0, source: 'timeout', needsManualReview: true }
      );

      const trackKey = `collections/${collection.name}/albums/${albumName}/${mp3Name}`;
      const trackUpload = await uploadToWasabi(
        mp3Buffer,
        trackKey,
        'audio/mpeg'
      );

      await Track.create({
        collectionId: collection._id,
        datePackId: datePack._id,
        albumId: album._id,
        title: metadata.title,
        artist: metadata.artist,
        genre: genreResult.genre || genre || 'Others',
        ...(await detectCategoryAsync(metadata.title, albumName)),
        categoryVerified: false,
        genreConfidence: genreResult.confidence,
        genreSource: genreResult.source,
        genreNeedsReview: genreResult.needsManualReview,
        bpm: metadata.bpm || 128,
        tonality: tonality,
        pool: collection.platform,
        coverArt: coverArtUrl,
        audioFile: {
          url: trackUpload.location,
          key: trackUpload.key,
          format: 'MP3',
          size: mp3Buffer.length,
          duration: metadata.duration
        },
        versionType: 'Original Mix',
        uploadedBy: collection.uploadedBy,
        status: 'published'
      });

      albumSize += mp3Buffer.length;
      trackCount++;
    }

    album.totalSize = albumSize;
    await album.save();

    totalSize += albumSize;
    albumCount++;

    console.log(`      ✓ Album complete: ${mp3Files.length} tracks`);
  }

  return {
    albums: albumCount,
    tracks: trackCount,
    size: totalSize
  };
}

function extractBPMFromFilename(filename) {
  const bpmMatch = filename.match(/(\d{2,3})\s*BPM/i);
  return bpmMatch ? parseInt(bpmMatch[1]) : null;
}

// @desc    Get all collections
// @route   GET /api/collections
// @access  Public (completed only) / Admin (all)
export const getCollections = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    // Exclude in-flight / failed only — old docs without a status field are treated as visible
    const filter = isAdmin ? {} : { status: { $nin: ['pending', 'queued', 'processing', 'failed'] } };
    const collections = await Collection.find(filter)
      .populate('sourceId', 'name thumbnail')
      .sort('-createdAt')
      .lean();

    // Sign Wasabi thumbnail URLs so the browser can load them
    await signImageFields(collections, ['thumbnail']);

    res.status(200).json({
      success: true,
      count: collections.length,
      data: collections
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all albums in a collection (flat, sorted by datePack date desc)
// @route   GET /api/collections/:id/albums
// @access  Public
export const getCollectionAlbums = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user?.role === 'admin';

    const collection = await Collection.findById(id).lean();
    if (!collection) return res.status(404).json({ success: false, message: 'Collection not found' });
    const blocked = ['pending', 'queued', 'processing', 'failed'];
    if (!isAdmin && blocked.includes(collection.status)) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    // Get all datepacks for sorting context
    const datePacks = await DatePack.find({ collectionId: id }).sort('-date').lean();
    const datePackOrder = new Map(datePacks.map((dp, i) => [dp._id.toString(), i]));
    const datePackDates = new Map(datePacks.map(dp => [dp._id.toString(), dp.date]));

    const albums = await Album.find({ collectionId: id })
      .select('_id name coverArt trackCount genre year datePackId')
      .lean();

    // Sign album cover art URLs
    await signImageFields(albums, ['coverArt']);

    // Attach datePackDate for sorting, then sort newest first
    const enriched = albums.map(a => ({
      ...a,
      datePackDate: datePackDates.get(a.datePackId?.toString()) || null,
      datePackOrder: datePackOrder.get(a.datePackId?.toString()) ?? 999
    }));
    enriched.sort((a, b) => (a.datePackOrder - b.datePackOrder) || a.name.localeCompare(b.name));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get single collection
// @route   GET /api/collections/:id
// @access  Public
export const getCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('sourceId', 'name thumbnail')
      .lean();

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      });
    }

    if (collection.thumbnail) collection.thumbnail = await ensureSignedUrl(collection.thumbnail);

    res.status(200).json({
      success: true,
      data: collection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update collection
// @route   PUT /api/collections/:id
// @access  Private/Admin
export const updateCollection = async (req, res) => {
  try {
    const { name, year, month, thumbnail } = req.body;

    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      });
    }

    if (name) collection.name = name;
    if (year) collection.year = year;
    if (month !== undefined) collection.month = month;
    if (req.body.platform !== undefined) collection.platform = req.body.platform;
    if (req.file) {
      const ext = path.extname(req.file.originalname) || '.jpg';
      const thumbKey = `collections/${collection._id}/thumbnail${ext}`;
      const thumbUpload = await uploadToWasabi(req.file.buffer, thumbKey, req.file.mimetype);
      collection.thumbnail = thumbUpload.location;
    } else if (thumbnail) {
      collection.thumbnail = thumbnail;
    }

    await collection.save();

    res.status(200).json({
      success: true,
      data: collection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cleanup DatePack names (strip cloud-storage timestamp suffixes)
// @route   POST /api/collections/cleanup-names
// @access  Private/Admin
export const cleanupDatePackNames = async (req, res) => {
  try {
    const datePacks = await DatePack.find({});
    const regex = /-\d{8}T\d{6}Z-\d+-\d+$/;
    let updated = 0;
    for (const dp of datePacks) {
      const cleaned = dp.name.replace(regex, '').trim();
      if (cleaned !== dp.name) {
        await DatePack.findByIdAndUpdate(dp._id, { name: cleaned });
        updated++;
      }
    }
    res.json({ success: true, updated, message: `Updated ${updated} date pack name(s)` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete collection
// @route   DELETE /api/collections/:id
// @access  Private/Admin
export const deleteCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      });
    }

    await DatePack.deleteMany({ collectionId: collection._id });
    await Album.deleteMany({ collectionId: collection._id });
    await Track.deleteMany({ collectionId: collection._id });

    if (collection.zipKey) {
      await deleteFromWasabi(collection.zipKey);
    }

    await collection.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Collection and all related data deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get collection stats
// @route   GET /api/collections/:id/stats
// @access  Public
export const getCollectionStats = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      });
    }

    const datePacks = await DatePack.countDocuments({ collectionId: collection._id });
    const albums = await Album.countDocuments({ collectionId: collection._id });
    const tracks = await Track.countDocuments({ collectionId: collection._id });

    res.status(200).json({
      success: true,
      data: {
        datePacks,
        albums,
        tracks,
        totalSize: collection.totalSize,
        totalDownloads: collection.totalDownloads
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Preview ZIP structure before upload (extract folder names, count albums/tracks)
// @route   POST /api/collections/preview-zip
// @access  Private/Admin
export const previewZipStructure = async (req, res) => {
  try {
    const zipFile = req.file;
    if (!zipFile) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a ZIP file'
      });
    }

    const zipInput = zipFile.buffer || zipFile.path;
    const preview = buildPreviewFromZipFile(zipInput, zipFile.originalname, zipFile.size);

    res.status(200).json({
      success: true,
      data: preview
    });

    if (zipFile?.path && fs.existsSync(zipFile.path)) fs.unlinkSync(zipFile.path);
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get collection processing status
// @route   GET /api/collections/:id/status
// @access  Private/Admin
export const getCollectionStatus = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      });
    }

    // Count related items
    const datePacks = await DatePack.countDocuments({ collectionId: collection._id });
    const albums = await Album.countDocuments({ collectionId: collection._id });
    const tracks = await Track.countDocuments({ collectionId: collection._id });

    res.status(200).json({
      success: true,
      data: {
        collectionId: collection._id,
        name: collection.name,
        status: collection.status,
        processingProgress: collection.processingProgress,
        totalDatePacks: datePacks,
        totalAlbums: albums,
        totalTracks: tracks,
        totalSize: collection.totalSize,
        updatedAt: collection.updatedAt,
        processingDetail: collection.processingDetail || '',
        tracksProcessed: collection.tracksProcessed || 0,
        totalTracksEstimate: collection.totalTracksEstimate || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel collection processing
// @route   POST /api/collections/:id/cancel
// @access  Private/Admin
export const cancelCollectionProcessing = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }
    collection.status = 'cancelled';
    await collection.save();
    res.status(200).json({ success: true, message: 'Processing cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Retry failed tracks
// @route   POST /api/collections/:id/retry-failed
// @access  Private/Admin
export const retryFailedTracks = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }
    const { trackIds } = req.body;
    const failedTracks = await Track.find({ _id: { $in: trackIds }, status: 'failed' });
    for (const track of failedTracks) {
      track.status = 'pending';
      await track.save();
    }
    collection.status = 'processing';
    collection.processingProgress = 0;
    await collection.save();
    res.status(200).json({ success: true, message: `Retrying ${failedTracks.length} tracks`, data: { retryCount: failedTracks.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
