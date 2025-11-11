#!/usr/bin/env node
const https = require('https');
const fs = require('fs');

// Load env
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && !key.startsWith('#') && key.trim()) {
    process.env[key.trim()] = valueParts.join('=').trim();
  }
});

const apiKey = process.env.GEMINI_API_KEY;
console.log('🧪 Testing Gemini 2.0 Flash-Lite...\n');

const data = JSON.stringify({
  contents: [{ parts: [{ text: 'Say "Hello!" in a friendly way. Keep it short.' }] }],
  generationConfig: { temperature: 0.9, maxOutputTokens: 50 }
});

const req = https.request(
  `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
  },
  (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        const json = JSON.parse(body);
        const text = json.candidates[0].content.parts[0].text;
        console.log('✅ Gemini 2.0 Flash-Lite WORKS!');
        console.log('📝 Response:', text);
        console.log('\n🎉 Your API is ready! Refresh your browser page.');
      } else {
        console.log('❌ Error:', res.statusCode);
        console.log(body);
      }
    });
  }
);

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
});

req.write(data);
req.end();
