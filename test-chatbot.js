#!/usr/bin/env node

const http = require('http');

// Test 1: Check if web server is running
function testWebServer() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000', (res) => {
      console.log('✓ Web Server Status:', res.statusCode);
      res.on('data', () => {});
      res.on('end', () => resolve(res.statusCode === 200));
    });
    
    req.on('error', (err) => {
      console.log('✗ Web Server Error:', err.message);
      resolve(false);
    });
    
    req.setTimeout(5000);
  });
}

// Test 2: Check if chat API endpoint exists
function testChatApi() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      message: 'Hello, are you working?',
      conversationId: 'test'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat/stream-sse',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      console.log('✓ Chat API Endpoint Status:', res.statusCode);
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('  Response:', data.substring(0, 100));
        resolve(res.statusCode < 400);
      });
    });

    req.on('error', (err) => {
      console.log('✗ Chat API Error:', err.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
    req.setTimeout(5000);
  });
}

// Run tests
async function runTests() {
  console.log('\n🤖 Aegis AI Chatbot Test Suite\n');
  console.log('Testing chatbot endpoints...\n');
  
  const webTest = await testWebServer();
  console.log('');
  
  if (webTest) {
    const chatTest = await testChatApi();
    
    console.log('\n📊 Test Summary:');
    console.log('  Web Server:', webTest ? '✓ Working' : '✗ Failed');
    console.log('  Chat API:', chatTest ? '✓ Working' : '✗ Failed');
    console.log('\nResult:', (webTest && chatTest) ? '✅ Chatbot is WORKING!' : '❌ Chatbot has issues');
  } else {
    console.log('\n❌ Web server is not responding. Start it with: npm run dev');
  }
  
  process.exit(0);
}

runTests();
