#!/usr/bin/env node
/**
 * Quick test script for Gemini API
 * Tests both v1 and v1beta endpoints to find which works
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#')) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

console.log('✅ API Key found (starts with:', apiKey.substring(0, 10) + '...)');
console.log('\n🧪 Testing Gemini API endpoints...\n');

async function testEndpoint(version) {
  const url = `https://generativelanguage.googleapis.com/${version}/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  const data = JSON.stringify({
    contents: [{ parts: [{ text: 'Say "Hello!" in a friendly way.' }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 50 }
  });

  return new Promise((resolve) => {
    console.log(`🔄 Testing ${version}...`);
    
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(body);
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log(`✅ ${version} WORKS!`);
            console.log(`   Response: ${text}\n`);
            resolve({ success: true, version });
          } catch (e) {
            const parseMessage =
              e instanceof Error ? e.message : String(e ?? "unknown error");
            console.log(`❌ ${version} - Parse error: ${parseMessage}\n`);
            resolve({ success: false, version });
          }
        } else {
          const error = JSON.parse(body);
          console.log(`❌ ${version} - HTTP ${res.statusCode}`);
          console.log(`   Error: ${error.error?.message || body.substring(0, 100)}\n`);
          resolve({ success: false, version });
        }
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ${version} - ${e.message}\n`);
      resolve({ success: false, version });
    });

    req.write(data);
    req.end();
  });
}

(async () => {
  const v1 = await testEndpoint('v1');
  const v1beta = await testEndpoint('v1beta');

  console.log('📊 Results:');
  console.log(`   v1:     ${v1.success ? '✅ Working' : '❌ Failed'}`);
  console.log(`   v1beta: ${v1beta.success ? '✅ Working' : '❌ Failed'}`);
  
  if (v1.success) {
    console.log('\n✨ Use v1 endpoint (currently configured)');
  } else if (v1beta.success) {
    console.log('\n✨ Use v1beta endpoint');
  } else {
    console.log('\n❌ Both endpoints failed. Check your API key at:');
    console.log('   https://aistudio.google.com/app/apikey');
  }
})();
