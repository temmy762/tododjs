import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Source from './models/Source.js';

dotenv.config();

async function activateNewHits() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const result = await Source.updateOne(
      { _id: '698378997b3ea78eebd54c64' },
      { $set: { isActive: true } }
    );

    console.log('✓ Activated NEW HITS source');
    console.log('Modified count:', result.modifiedCount);

    const source = await Source.findById('698378997b3ea78eebd54c64').select('name isActive');
    console.log('\nVerification:');
    console.log('Name:', source.name);
    console.log('Active:', source.isActive);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

activateNewHits();
