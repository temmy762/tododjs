import Collection from '../models/Collection.js';
import DatePack from '../models/DatePack.js';
import Album from '../models/Album.js';
import Track from '../models/Track.js';
import Source from '../models/Source.js';
import { uploadToWasabi, deleteFromWasabi } from '../config/wasabi.js';
import yauzl from 'yauzl';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';
import { parseBuffer } from 'music-metadata';
import { detectTonality } from '../services/tonalityDetection.js';

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

// @desc    Upload collection (main ZIP)
// @route   POST /api/collections
// @access  Private/Admin
export const uploadCollection = async (req, res) => {
  try {
    console.log('\n📥 Collection upload request received');
    console.log('Request body:', Object.keys(req.body));
    console.log('Request files:', req.files ? Object.keys(req.files) : 'none');
    
    const { platform, year, month, name, thumbnail } = req.body;
    const zipFile = req.files?.zipFile?.[0];
    const thumbnailFile = req.files?.thumbnailFile?.[0];

    console.log('ZIP file:', zipFile ? `${zipFile.originalname} (${(zipFile.size / 1024 / 1024).toFixed(2)} MB) - saved to: ${zipFile.path}` : 'missing');
    console.log('Platform:', platform);

    if (!zipFile) {
      console.error('❌ No ZIP file in request');
      return res.status(400).json({
        success: false,
        message: 'Please upload a ZIP file'
      });
    }

    if (!platform) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a platform name'
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
      // Clean up temp thumbnail file
      fs.unlinkSync(thumbnailFile.path);
    }

    console.log('💾 Creating collection record in database...');
    const collection = await Collection.create({
      name: name || path.parse(zipFile.originalname).name,
      platform,
      year: year || new Date().getFullYear(),
      month: month || '',
      thumbnail: thumbnailUrl,
      uploadedBy: req.user.id,
      status: 'processing',
      processingProgress: 0
    });
    console.log(`✅ Collection created: ${collection._id}`);

    // Respond immediately — Wasabi upload + processing happens in background
    res.status(201).json({
      success: true,
      message: 'Collection upload started. Processing in background.',
      data: collection
    });

    // Background: upload ZIP to Wasabi then process
    processCollectionAsync(collection._id, zipFile.path, collection);
  } catch (error) {
    console.error('Collection upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

async function processCollectionAsync(collectionId, zipFilePath, collectionData) {
  const tempDir = path.dirname(zipFilePath);
  const extractedDatePacks = []; // Track temp files for cleanup

  try {
    const collection = await Collection.findById(collectionId);
    
    console.log(`\n🚀 Starting collection processing: ${collection.name}`);
    
    // Upload original ZIP to Wasabi S3 first (streaming, supports >2GB)
    const zipSizeGB = (fs.statSync(zipFilePath).size / 1024 / 1024 / 1024).toFixed(2);
    console.log(`☁️ Uploading ${zipSizeGB} GB ZIP to Wasabi S3...`);
    const zipStream = fs.createReadStream(zipFilePath);
    const collectionKey = `collections/${collection.name}/original.zip`;
    const zipUpload = await uploadToWasabi(
      zipStream,
      collectionKey,
      'application/zip',
      (progress) => {
        console.log(`   ☁️ Wasabi upload: ${progress.toFixed(1)}%`);
      }
    );
    console.log('✅ ZIP uploaded to Wasabi S3');

    collection.zipUrl = zipUpload.location;
    collection.zipKey = zipUpload.key;
    collection.processingProgress = 5;
    await collection.save();

    console.log(`📂 Opening ZIP with yauzl (streaming, >2GB safe): ${zipFilePath}`);
    
    // Use yauzl for >2GB ZIP support
    const zipfile = await openZipFile(zipFilePath);
    const entries = await readAllEntries(zipfile);
    
    console.log(`📋 Total entries in ZIP: ${entries.length}`);

    let motherFolder = null;
    for (const entry of entries) {
      if (entry.fileName.endsWith('/') && !entry.fileName.includes('__MACOSX')) {
        motherFolder = entry.fileName;
        break;
      }
    }

    if (!motherFolder) {
      motherFolder = '';
    }

    console.log(`📁 Mother folder: ${motherFolder || 'root'}`);

    const dateZipEntries = entries.filter(entry => 
      !entry.fileName.endsWith('/') && 
      entry.fileName.endsWith('.zip') &&
      entry.fileName.startsWith(motherFolder) &&
      !entry.fileName.includes('__MACOSX')
    );

    console.log(`📦 Found ${dateZipEntries.length} date pack ZIPs`);

    collection.totalDatePacks = dateZipEntries.length;
    collection.processingProgress = 10;
    await collection.save();

    let totalAlbums = 0;
    let totalTracks = 0;
    let totalSize = 0;

    // Re-open ZIP for extraction (yauzl requires re-open after reading entries)
    const zipfile2 = await openZipFile(zipFilePath);

    for (let i = 0; i < dateZipEntries.length; i++) {
      const dateZipEntry = dateZipEntries[i];
      const dateZipName = path.parse(dateZipEntry.fileName).name;
      
      console.log(`\n📅 Processing date pack ${i + 1}/${dateZipEntries.length}: ${dateZipName}`);

      // Extract date pack ZIP to temp file on disk
      const tempDatePackPath = path.join(tempDir, `datepack-${Date.now()}-${dateZipName}.zip`);
      
      // Re-open for each extraction since yauzl is sequential
      const zipfileForExtract = await openZipFile(zipFilePath);
      const allEntries2 = await readAllEntries(zipfileForExtract);
      const matchingEntry = allEntries2.find(e => e.fileName === dateZipEntry.fileName);
      
      if (!matchingEntry) {
        console.log(`   ⚠ Could not find entry ${dateZipEntry.fileName}, skipping`);
        continue;
      }

      // Re-open again to extract (yauzl closes after readAllEntries)
      const zipfileForStream = await openZipFile(zipFilePath);
      await new Promise((resolve, reject) => {
        zipfileForStream.on('entry', (entry) => {
          if (entry.fileName === dateZipEntry.fileName) {
            zipfileForStream.openReadStream(entry, (err, readStream) => {
              if (err) return reject(err);
              const writeStream = fs.createWriteStream(tempDatePackPath);
              readStream.pipe(writeStream);
              writeStream.on('finish', resolve);
              writeStream.on('error', reject);
            });
          } else {
            zipfileForStream.readEntry();
          }
        });
        zipfileForStream.on('error', reject);
        zipfileForStream.readEntry();
      });

      extractedDatePacks.push(tempDatePackPath);
      const datePackStats = fs.statSync(tempDatePackPath);
      console.log(`   📦 Extracted to temp: ${(datePackStats.size / 1024 / 1024).toFixed(2)} MB`);

      // Read the extracted date pack ZIP into buffer (should be <2GB)
      const dateZipBuffer = fs.readFileSync(tempDatePackPath);
      
      const dateMatch = dateZipName.match(/(\d{2})_(\d{2})_(\d{2})/);
      let packDate = new Date();
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        packDate = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day));
      }

      const datePack = await DatePack.create({
        name: dateZipName,
        collectionId: collection._id,
        date: packDate,
        status: 'processing'
      });

      // Upload date pack ZIP to Wasabi using stream
      const datePackStream = fs.createReadStream(tempDatePackPath);
      const datePackKey = `collections/${collection.name}/date-packs/${dateZipName}.zip`;
      const datePackUpload = await uploadToWasabi(
        datePackStream,
        datePackKey,
        'application/zip'
      );

      datePack.zipUrl = datePackUpload.location;
      datePack.zipKey = datePackUpload.key;
      await datePack.save();

      const { albums, tracks, size } = await processDatePack(
        dateZipBuffer,
        datePack,
        collection
      );

      datePack.totalAlbums = albums;
      datePack.totalTracks = tracks;
      datePack.totalSize = size;
      datePack.status = 'completed';
      datePack.processingProgress = 100;
      await datePack.save();

      totalAlbums += albums;
      totalTracks += tracks;
      totalSize += size;

      // Clean up temp date pack file after processing
      if (fs.existsSync(tempDatePackPath)) {
        fs.unlinkSync(tempDatePackPath);
      }

      const progress = 10 + ((i + 1) / dateZipEntries.length) * 85;
      collection.processingProgress = Math.round(progress);
      await collection.save();
      console.log(`   ✅ Date pack complete. Progress: ${Math.round(progress)}%`);
    }

    collection.totalAlbums = totalAlbums;
    collection.totalTracks = totalTracks;
    collection.totalSize = totalSize;
    collection.status = 'completed';
    collection.processingProgress = 100;
    await collection.save();

    console.log(`\n✅ Collection processing completed!`);
    console.log(`   Albums: ${totalAlbums}`);
    console.log(`   Tracks: ${totalTracks}`);
    console.log(`   Size: ${(totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB\n`);

    // Clean up temp ZIP file
    if (fs.existsSync(zipFilePath)) {
      fs.unlinkSync(zipFilePath);
      console.log('🧹 Cleaned up temp ZIP file');
    }

  } catch (error) {
    console.error('Collection processing error:', error);
    
    // Clean up all temp files
    for (const tempFile of extractedDatePacks) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
    if (fs.existsSync(zipFilePath)) {
      fs.unlinkSync(zipFilePath);
      console.log('🧹 Cleaned up temp ZIP file after error');
    }

    const collection = await Collection.findById(collectionId);
    collection.status = 'failed';
    collection.errorMessage = error.message;
    await collection.save();
  }
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

  console.log(`   📂 Found ${Object.keys(albumFolders).length} album folders`);

  let albumCount = 0;
  let trackCount = 0;
  let totalSize = 0;

  for (const [albumName, albumPath] of Object.entries(albumFolders)) {
    console.log(`      🎵 Processing album: ${albumName}`);

    const genreMatch = albumName.match(/\((.*?)\)/);
    const genre = genreMatch ? genreMatch[1] : null;

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

    const albumZipBuffer = Buffer.from(dateZip.toBuffer());
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

      const tonality = await detectTonality(mp3Buffer, metadata);

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
        genre: genre || 'House',
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
// @access  Public
export const getCollections = async (req, res) => {
  try {
    const collections = await Collection.find()
      .populate('sourceId', 'name thumbnail')
      .sort('-createdAt');

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

// @desc    Get single collection
// @route   GET /api/collections/:id
// @access  Public
export const getCollection = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('sourceId', 'name thumbnail');

    if (!collection) {
      return res.status(404).json({
        success: false,
        message: 'Collection not found'
      });
    }

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
    if (thumbnail) collection.thumbnail = thumbnail;

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
