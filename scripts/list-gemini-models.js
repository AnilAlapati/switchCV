#!/usr/bin/env node
/**
 * List available Gemini models
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
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
  console.error('❌ GEMINI_API_KEY not found');
  process.exit(1);
}

console.log('📋 Listing available Gemini models...\n');

['v1', 'v1beta'].forEach(version => {
  const url = `https://generativelanguage.googleapis.com/${version}/models?key=${apiKey}`;
  
  https.get(url, (res) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; });
    res.on('end', () => {
      if (res.statusCode === 200) {
        const data = JSON.parse(body);
        console.log(`\n${version.toUpperCase()} Models:`);
        console.log('='.repeat(50));
        data.models?.forEach(model => {
          if (model.supportedGenerationMethods?.includes('generateContent')) {
            console.log(`✅ ${model.name}`);
            console.log(`   Display: ${model.displayName || 'N/A'}`);
            console.log(`   Methods: ${model.supportedGenerationMethods?.join(', ')}`);
          }
        });
      } else {
        console.log(`\n❌ ${version}: HTTP ${res.statusCode}`);
      }
    });
  }).on('error', (e) => {
    console.error(`❌ ${version}: ${e.message}`);
  });
});
