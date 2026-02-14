import { S3Client, ListBucketsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const wasabiConfig = {
  endpoint: `https://${process.env.WASABI_ENDPOINT}`,
  region: process.env.WASABI_REGION,
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
    secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY
  },
  forcePathStyle: true
};

console.log('Testing Wasabi Configuration:');
console.log('Endpoint:', wasabiConfig.endpoint);
console.log('Region:', wasabiConfig.region);
console.log('Bucket:', process.env.WASABI_BUCKET_NAME);
console.log('Access Key ID:', process.env.WASABI_ACCESS_KEY_ID?.substring(0, 8) + '...');

const s3Client = new S3Client(wasabiConfig);

async function testWasabi() {
  try {
    console.log('\n1. Testing bucket access...');
    
    // Test upload
    const testKey = `test-${Date.now()}.txt`;
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.WASABI_BUCKET_NAME,
      Key: testKey,
      Body: 'Test upload from TodoDJS',
      ContentType: 'text/plain'
    });
    
    await s3Client.send(uploadCommand);
    console.log('✅ Successfully uploaded test file:', testKey);
    
    console.log('\n✅ Wasabi configuration is working correctly!');
    
  } catch (error) {
    console.error('\n❌ Wasabi Error:', error.message);
    console.error('Error Code:', error.Code);
    console.error('Error Name:', error.name);
    
    if (error.message.includes('credentials')) {
      console.error('\n🔧 Fix: Check your WASABI_ACCESS_KEY_ID and WASABI_SECRET_ACCESS_KEY');
    } else if (error.message.includes('bucket')) {
      console.error('\n🔧 Fix: Check your WASABI_BUCKET_NAME exists in the region');
    } else if (error.message.includes('region')) {
      console.error('\n🔧 Fix: Check your WASABI_REGION and WASABI_ENDPOINT match');
    }
  }
}

testWasabi();
