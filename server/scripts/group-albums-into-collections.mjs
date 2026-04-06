/**
 * group-albums-into-collections.mjs
 *
 * Groups existing albums into Collection documents by stripping date/volume
 * suffixes from album names to produce a series base name, then grouping by
 * (baseName, year). Creates a Collection per group, links each album via
 * collectionId, and sets the collection thumbnail from the album's cover art.
 *
 * Usage:  node server/scripts/group-albums-into-collections.mjs
 * Flags:
 *   --dry-run   Preview what will be created without writing to DB
 *   --force     Re-group albums that already have a collectionId
 */

import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import mongoose from 'mongoose';
import Album      from '../models/Album.js';
import Collection from '../models/Collection.js';
import User       from '../models/User.js';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE   = process.argv.includes('--force');

// ── Series name detection (must match RecordPoolPage.jsx getSeriesName) ──────
// 1. Strip trailing vol / part / episode numbers
const VOL_RE   = /[\s_\-]+(?:vol(?:ume)?\.?\s*\d+|ep\.?\s*\d+|n[o°]\.?\s*\d+|#\s*\d+|(?:part|pt)\.?\s*\d+|\b\d{1,2}(?:st|nd|rd|th)?\b)[\s.,:\-]*$/i;
// 2. Strip trailing date patterns (month names, mm/dd/yyyy, yyyy)
const DATE_RE  = /[\s_\-]+(?:(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b.*|(?:\d{1,2}[\s/.\-]\d{1,2}[\s/.\-]\d{2,4}).*|\b20\d{2}\b.*)$/i;

function getSeriesName(name) {
  return name
    .replace(VOL_RE,  '')
    .replace(DATE_RE, '')
    .replace(VOL_RE,  '')   // second pass in case date strip revealed a vol suffix
    .trim() || name;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');
  if (DRY_RUN) console.log('⚠️  DRY RUN — no writes will happen\n');

  const albumFilter = { isActive: true };
  if (!FORCE) albumFilter.collectionId = { $in: [null, undefined] };

  const albums = await Album.find(albumFilter)
    .select('_id name year coverArt coverArtKey trackCount sourceId collectionId')
    .lean();

  console.log(`📦 Found ${albums.length} albums to process\n`);

  // Group by (seriesName.toLowerCase(), year)
  const groups = new Map();
  for (const album of albums) {
    const seriesName = getSeriesName(album.name);
    const year       = album.year || new Date().getFullYear();
    const key        = `${seriesName.toLowerCase()}::${year}`;
    if (!groups.has(key)) {
      groups.set(key, { seriesName, year, albums: [], sourceId: null, thumbnail: null, thumbnailKey: null });
    }
    const g = groups.get(key);
    g.albums.push(album);
    // Prefer the first album's sourceId and cover art for the group
    if (!g.sourceId  && album.sourceId)    g.sourceId     = album.sourceId;
    if (!g.thumbnailKey && album.coverArtKey) g.thumbnailKey = album.coverArtKey;
    if (!g.thumbnail    && album.coverArt)    g.thumbnail    = album.coverArt;
  }

  console.log(`🗂️  Detected ${groups.size} series groups\n`);

  let created = 0, updated = 0, skipped = 0;

  for (const [key, group] of groups) {
    const { seriesName, year, albums: groupAlbums, sourceId, thumbnail, thumbnailKey } = group;

    // Skip singleton albums that have no siblings (likely already standalone)
    if (groupAlbums.length === 1) {
      const solo = groupAlbums[0];
      // Only skip if the name is already unique (no vol-stripping changed it)
      const originalName = solo.name;
      if (getSeriesName(originalName) === originalName) {
        // no suffix was stripped — treat as its own series
      }
    }

    console.log(`\n📂 "${seriesName}" (${year}) — ${groupAlbums.length} album(s)`);
    groupAlbums.forEach(a => console.log(`   • ${a.name}`));

    if (DRY_RUN) { skipped++; continue; }

    // Find or create Collection
    let collection = await Collection.findOne({
      seriesName,
      year,
    });

    const thumb = thumbnailKey || thumbnail || null;
    const totalAlbums = groupAlbums.length;
    const totalTracks = groupAlbums.reduce((s, a) => s + (a.trackCount || 0), 0);

    if (!collection) {
      collection = await Collection.create({
        name:       seriesName,
        seriesName: seriesName,
        platform:   'PlayList Pro',
        year,
        sourceId:   sourceId || undefined,
        thumbnail:  thumb,
        status:     'completed',
        totalAlbums,
        totalTracks,
        uploadedBy: (await User.findOne({ role: 'admin' }).select('_id').lean())?._id,
      });
      console.log(`   ✅ Created collection ${collection._id}`);
      created++;
    } else {
      // Update counts and thumbnail if missing
      const update = { totalAlbums, totalTracks, status: 'completed' };
      if (!collection.thumbnail && thumb) update.thumbnail = thumb;
      await Collection.findByIdAndUpdate(collection._id, update);
      console.log(`   ♻️  Updated existing collection ${collection._id}`);
      updated++;
    }

    // Link all albums to this collection
    const albumIds = groupAlbums.map(a => a._id);
    await Album.updateMany(
      { _id: { $in: albumIds } },
      { $set: { collectionId: collection._id } }
    );
    console.log(`   🔗 Linked ${albumIds.length} albums`);
  }

  console.log(`\n${'─'.repeat(50)}`);
  if (DRY_RUN) {
    console.log(`DRY RUN complete. Would create ${groups.size} collection groups.`);
  } else {
    console.log(`Done! Created: ${created}  Updated: ${updated}  Skipped: ${skipped}`);
  }

  await mongoose.disconnect();
  console.log('✅ Disconnected');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  mongoose.disconnect();
  process.exit(1);
});
