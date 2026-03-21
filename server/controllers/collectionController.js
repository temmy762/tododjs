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
import { detectGenre } from '../services/genreDetection.js';
import { generateCollectionName, detectGenres, extractDateFromFolderName } from '../utils/collectionNameGenerator.js';

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
    
    const { name, year, month, thumbnail, scanResult } = req.body;
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
          name: dp.name,
          collectionId: collection._id,
          date: packDate,
          status: 'pending',
          sourceFolderName: dp.name
        });
        createdDatePacks.push({ _id: datePack._id, name: datePack.name, status: datePack.status });

        // Create Album cards for this date pack
        if (dp.albums && dp.albums.length > 0) {
          for (const albumData of dp.albums) {
            const genreMatch = albumData.name.match(/\((.*?)\)/);
            const detectedGenre = genreMatch ? genreMatch[1] : null;

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
      console.log(`✅ Created ${createdDatePacks.length} date packs and ${createdAlbums.length} albums`);
    }

    // Update collection status to processing
    collection.status = 'processing';
    collection.totalDatePacks = createdDatePacks.length;
    await collection.save();

    // Respond with created cards
    res.status(201).json({
      success: true,
      message: 'Collection cards created. Processing started in background.',
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

    // Background: process the ZIP file
    processCollectionAsync(collection._id, zipFile.path, collection, createdDatePacks, createdAlbums);
  } catch (error) {
    console.error('Collection upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

async function processCollectionAsync(collectionId, zipFilePath, collectionData, createdDatePacks, createdAlbums) {
  const tempDir = path.dirname(zipFilePath);
  const extractedDatePacks = [];

  try {
    const collection = await Collection.findById(collectionId);
    console.log(`\n🚀 Starting collection processing: ${collection.name}`);
    
    // Upload original ZIP to Wasabi S3
    const zipSizeGB = (fs.statSync(zipFilePath).size / 1024 / 1024 / 1024).toFixed(2);
    console.log(`☁️ Uploading ${zipSizeGB} GB ZIP to Wasabi S3...`);
    const zipStream = fs.createReadStream(zipFilePath);
    const collectionKey = `collections/${collection.name}/original.zip`;
    const zipUpload = await uploadToWasabi(
      zipStream,
      collectionKey,
      'application/zip',
      (progress) => console.log(`   ☁️ Wasabi upload: ${progress.toFixed(1)}%`)
    );
    console.log('✅ ZIP uploaded to Wasabi S3');

    collection.zipUrl = zipUpload.location;
    collection.zipKey = zipUpload.key;
    collection.processingProgress = 5;
    await collection.save();

    // Get existing date packs from database
    const existingDatePacks = await DatePack.find({ collectionId: collection._id });
    console.log(`📦 Found ${existingDatePacks.length} existing date pack cards`);

    if (existingDatePacks.length === 0) {
      console.log('⚠️ No date pack cards found, collection may have been created without scan');
      collection.status = 'failed';
      collection.errorMessage = 'No date pack cards found';
      await collection.save();
      return;
    }

    // Build a map of date pack name to ID
    const datePackMap = new Map();
    for (const dp of existingDatePacks) {
      datePackMap.set(dp.name, dp._id.toString());
    }

    // Open ZIP and find MP3 files
    const zipfile = await openZipFile(zipFilePath);
    const entries = await readAllEntries(zipfile);
    console.log(`📋 Total entries in ZIP: ${entries.length}`);

    // Find all MP3 files and group by date pack name
    const mp3FilesByDatePack = new Map();
    for (const entry of entries) {
      if (entry.fileName.endsWith('/')) continue;
      if (!entry.fileName.toLowerCase().endsWith('.mp3')) continue;
      if (entry.fileName.includes('__MACOSX')) continue;

      const parts = entry.fileName.split('/').filter(p => p);
      if (parts.length >= 2) {
        const datePackName = parts[0];
        if (!mp3FilesByDatePack.has(datePackName)) {
          mp3FilesByDatePack.set(datePackName, []);
        }
        mp3FilesByDatePack.get(datePackName).push({
          fileName: entry.fileName,
          albumName: parts[1] || 'Unknown Album'
        });
      }
    }

    console.log(`📂 Found MP3s in ${mp3FilesByDatePack.size} date packs`);

    let totalAlbums = 0;
    let totalTracks = 0;
    let totalSize = 0;
    let processedCount = 0;

    // Process each date pack
    for (const [datePackName, mp3Files] of mp3FilesByDatePack) {
      const datePackId = datePackMap.get(datePackName);
      if (!datePackId) {
        console.log(`   ⚠ Date pack "${datePackName}" not found in existing cards, skipping`);
        continue;
      }

      const datePack = await DatePack.findById(datePackId);
      console.log(`\n📅 Processing date pack: ${datePackName} (${mp3Files.length} MP3s)`);

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

    if (fs.existsSync(zipFilePath)) {
      fs.unlinkSync(zipFilePath);
      console.log('🧹 Cleaned up temp ZIP file');
    }
  } catch (error) {
    console.error('Collection processing error:', error);
    for (const tempFile of extractedDatePacks) {
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
    if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);

    const collection = await Collection.findById(collectionId);
    if (collection) {
      collection.status = 'failed';
      collection.errorMessage = error.message;
      await collection.save();
    }
  }
}

async function processTracksForDatePack(zipFilePath, mp3Files, datePack, collection) {
  console.log(`   🎵 Processing ${mp3Files.length} tracks for date pack: ${datePack.name}`);
  
  // Get existing albums for this date pack
  const existingAlbums = await Album.find({ datePackId: datePack._id });
  console.log(`      📀 Found ${existingAlbums.length} existing album cards`);
  
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
  
  console.log(`      📂 Tracks grouped into ${mp3sByAlbum.size} albums`);
  
  let totalTracks = 0;
  let totalSize = 0;
  let processedAlbums = 0;
  
  // Re-open ZIP for streaming extraction
  const zipfile = await openZipFile(zipFilePath);
  
  // Process each album
  for (const [albumName, albumMp3s] of mp3sByAlbum) {
    const albumId = albumMap.get(albumName);
    if (!albumId) {
      console.log(`      ⚠ Album "${albumName}" not found in existing cards, skipping ${albumMp3s.length} tracks`);
      continue;
    }
    
    const album = await Album.findById(albumId);
    console.log(`      💿 Processing album: ${albumName} (${albumMp3s.length} tracks)`);
    
    // Update album status
    album.status = 'processing';
    await album.save();
    
    let albumTrackCount = 0;
    let albumSize = 0;
    
    // Process each MP3 in this album
    for (const mp3Info of albumMp3s) {
      try {
        // Extract MP3 from ZIP
        const mp3Buffer = await extractFileFromZip(zipfile, mp3Info.fileName);
        if (!mp3Buffer) {
          console.log(`      ⚠ Could not extract ${mp3Info.fileName}`);
          continue;
        }
        
        const trackSize = mp3Buffer.length;
        albumSize += trackSize;
        totalSize += trackSize;
        
        const mp3Name = path.basename(mp3Info.fileName);
        
        // Parse metadata
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
        
        // Detect tonality and genre
        const tonality = await detectTonality(mp3Buffer, metadata);
        const genreResult = await detectGenre(mp3Buffer, metadata);
        
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
          genre: genreResult.genre || album.genre || 'House',
          genreConfidence: genreResult.confidence,
          genreSource: genreResult.source,
          genreNeedsReview: genreResult.needsManualReview,
          bpm: metadata.bpm || 128,
          tonality: tonality,
          pool: collection.platform,
          coverArt: album.coverArt || collection.thumbnail,
          audioFile: {
            url: trackUpload.location,
            key: trackUpload.key,
            format: 'MP3',
            size: trackSize,
            duration: metadata.duration
          },
          status: 'complete'
        });
        
        albumTrackCount++;
        totalTracks++;
        
      } catch (error) {
        console.error(`      ❌ Error processing track ${mp3Info.fileName}:`, error.message);
      }
    }
    
    // Update album with results
    album.trackCount = albumTrackCount;
    album.totalSize = albumSize;
    album.status = albumTrackCount > 0 ? 'complete' : 'failed';
    await album.save();
    
    processedAlbums++;
    console.log(`      ✅ Album complete: ${albumTrackCount} tracks uploaded`);
  }
  
  zipfile.close();
  
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
      const genreResult = await detectGenre(mp3Buffer, metadata);

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
        genre: genreResult.genre || genre || 'House',
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

    const zipPath = zipFile.path;
    const zipFileName = path.basename(zipFile.originalname, '.zip');

    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    // Extract mother folder (first folder in ZIP)
    let motherFolderName = '';
    for (const entry of zipEntries) {
      const parts = entry.entryName.split('/').filter(p => p);
      if (parts.length > 0) {
        motherFolderName = parts[0];
        break;
      }
    }

    // Generate suggested collection name from mother folder
    const suggestedCollectionName = generateCollectionName(motherFolderName);

    // Extract folder structure
    const datePacks = new Map();
    let totalAlbums = 0;
    let totalTracks = 0;

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      const parts = entry.entryName.split('/').filter(p => p);
      if (parts.length === 0) continue;

      // Check if it's an MP3
      const isMP3 = parts[parts.length - 1].toLowerCase().endsWith('.mp3');

      if (parts.length >= 2) {
        const datePackName = parts[0];
        const albumName = parts[1];

        if (!datePacks.has(datePackName)) {
          datePacks.set(datePackName, { name: datePackName, albums: new Map() });
        }

        const datePack = datePacks.get(datePackName);

        if (!datePack.albums.has(albumName)) {
          datePack.albums.set(albumName, { name: albumName, trackCount: 0 });
        }

        if (isMP3) {
          const album = datePack.albums.get(albumName);
          album.trackCount++;
          totalTracks++;
        }
      }
    }

    // Convert maps to arrays for response
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

    // Detect genres from album names
    const detectedGenres = detectGenres(datePackList);

    // Extract date from mother folder or first date pack
    const extractedDate = extractDateFromFolderName(motherFolderName) || 
                         (datePackList.length > 0 ? extractDateFromFolderName(datePackList[0].name) : null);

    // Clean up temp file
    fs.unlinkSync(zipPath);

    res.status(200).json({
      success: true,
      data: {
        collectionName: zipFileName,
        suggestedCollectionName,
        motherFolderName,
        detectedGenres,
        extractedDate,
        datePacks: datePackList,
        totalDatePacks: datePackList.length,
        totalAlbums,
        totalTracks,
        fileSize: zipFile.size
      }
    });
  } catch (error) {
    console.error('Preview ZIP structure error:', error);
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
        updatedAt: collection.updatedAt
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
