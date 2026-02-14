import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

// Test script to verify upload endpoint connectivity
async function testUploadEndpoint() {
  console.log('🧪 Testing Collection Upload Endpoint\n');

  // Test 1: Check if backend is running
  console.log('1️⃣ Testing backend health...');
  try {
    const healthResponse = await fetch('http://localhost:5000/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Backend is running:', healthData.message);
  } catch (error) {
    console.error('❌ Backend not reachable:', error.message);
    return;
  }

  // Test 2: Check authentication
  console.log('\n2️⃣ Testing authentication...');
  const token = 'YOUR_TOKEN_HERE'; // Replace with actual token from localStorage
  
  if (!token || token === 'YOUR_TOKEN_HERE') {
    console.log('⚠️  No token provided. Get token from browser localStorage and update this script.');
    console.log('   In browser console: localStorage.getItem("token")');
    return;
  }

  // Test 3: Create small test file
  console.log('\n3️⃣ Creating test ZIP file...');
  const testContent = Buffer.from('Test ZIP content');
  const testFilePath = './test-collection.zip';
  fs.writeFileSync(testFilePath, testContent);
  console.log('✅ Test file created:', testFilePath);

  // Test 4: Test upload endpoint
  console.log('\n4️⃣ Testing upload endpoint...');
  try {
    const formData = new FormData();
    formData.append('zipFile', fs.createReadStream(testFilePath));
    formData.append('platform', 'TestPlatform');
    formData.append('name', 'Test Collection');
    formData.append('year', '2026');
    formData.append('month', 'February');

    console.log('Sending POST request to http://localhost:5000/api/collections');
    console.log('Headers:', {
      'Authorization': `Bearer ${token.substring(0, 20)}...`,
      'Content-Type': 'multipart/form-data'
    });

    const response = await fetch('http://localhost:5000/api/collections', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    console.log('\n📊 Response Status:', response.status, response.statusText);
    
    const responseText = await response.text();
    console.log('📄 Response Body:', responseText);

    if (response.ok) {
      console.log('\n✅ Upload endpoint is working correctly!');
    } else {
      console.log('\n❌ Upload failed with status:', response.status);
    }

  } catch (error) {
    console.error('\n❌ Upload test failed:', error.message);
    console.error('Error details:', error);
  } finally {
    // Cleanup
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('\n🧹 Cleaned up test file');
    }
  }
}

// Run the test
testUploadEndpoint().catch(console.error);
