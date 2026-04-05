import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

await mongoose.connect(process.env.MONGODB_URI);

const Track = mongoose.connection.db.collection('tracks');
const Album = mongoose.connection.db.collection('albums');
const Col = mongoose.connection.db.collection('collections');

console.log('=== COLLECTIONS ===');
const cols = await Col.find({}).project({ name:1, thumbnail:1, status:1 }).toArray();
for (const c of cols) {
  console.log(JSON.stringify({ name: c.name, thumbnail: c.thumbnail || 'EMPTY', status: c.status || 'NO_STATUS' }));
}

console.log('\n=== ALBUMS ===');
const albums = await Album.find({}).project({ name:1, coverArt:1 }).toArray();
for (const a of albums) {
  console.log(JSON.stringify({ name: a.name, coverArt: a.coverArt || 'EMPTY' }));
}

console.log('\n=== SAMPLE TRACKS (first 5) ===');
const sample = await Track.find({}).project({ title:1, coverArt:1 }).limit(5).toArray();
for (const t of sample) {
  console.log(JSON.stringify({ title: t.title, coverArt: t.coverArt || 'EMPTY' }));
}

const total = await Track.countDocuments();
const withCover = await Track.countDocuments({ coverArt: { $nin: [null, ''] } });
const albumsWithCover = await Album.countDocuments({ coverArt: { $nin: [null, ''] } });
const totalAlbums = await Album.countDocuments();
console.log(`\nTracks with coverArt: ${withCover}/${total}`);
console.log(`Albums with coverArt: ${albumsWithCover}/${totalAlbums}`);

await mongoose.disconnect();
