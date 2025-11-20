#!/usr/bin/env node

/**
 * Test script to verify AI API configuration
 * Run with: node test-ai-api.js
 */

const https = require('https');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Test Gemini API
async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    log('❌ GEMINI_API_KEY not found in environment', 'red');
    return false;
  }

  log('🔄 Testing Gemini API...', 'blue');

  const data = JSON.stringify({
    contents: [{
      parts: [{ text: 'Say "Hello from Gemini!" in a friendly way.' }]
    }],
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 50
    }
  });

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(body);
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              log('✅ Gemini API: Working!', 'green');
              log(`   Response: ${text.substring(0, 50)}...`, 'green');
              resolve(true);
            } else {
              log('❌ Gemini API: Unexpected response format', 'red');
              resolve(false);
            }
          } catch (e) {
            log(`❌ Gemini API: Parse error - ${e.message}`, 'red');
            resolve(false);
          }
        } else {
          log(`❌ Gemini API: HTTP ${res.statusCode}`, 'red');
          log(`   ${body.substring(0, 200)}`, 'red');
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      log(`❌ Gemini API: ${e.message}`, 'red');
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

// Test HuggingFace API
async function testHuggingFace() {
  const token = process.env.HUGGINGFACE_TOKEN;
  
  if (!token) {
    log('❌ HUGGINGFACE_TOKEN not found in environment', 'red');
    return false;
  }

  log('🔄 Testing HuggingFace API...', 'blue');

  const data = JSON.stringify({
    inputs: 'Say "Hello from HuggingFace!" in a friendly way.',
    parameters: {
      max_new_tokens: 50,
      temperature: 0.9,
      return_full_text: false
    }
  });

  const options = {
    hostname: 'router.huggingface.co',
    path: '/models/google/flan-t5-base',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(body);
            if (Array.isArray(json) && json[0]?.generated_text) {
              log('✅ HuggingFace API: Working!', 'green');
              log(`   Response: ${json[0].generated_text.substring(0, 50)}...`, 'green');
              resolve(true);
            } else if (json.error?.includes('loading')) {
              log('⚠️  HuggingFace API: Model is loading, try again in a minute', 'yellow');
              resolve(false);
            } else {
              log('❌ HuggingFace API: Unexpected response format', 'red');
              resolve(false);
            }
          } catch (e) {
            log(`❌ HuggingFace API: Parse error - ${e.message}`, 'red');
            resolve(false);
          }
        } else {
          log(`❌ HuggingFace API: HTTP ${res.statusCode}`, 'red');
          log(`   ${body.substring(0, 200)}`, 'red');
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      log(`❌ HuggingFace API: ${e.message}`, 'red');
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

// Main test function
async function runTests() {
  log('\n🧪 Testing AI API Configuration\n', 'blue');
  
  // Check for .env.local file
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '.env.local');
  
  if (!fs.existsSync(envPath)) {
    log('⚠️  Warning: .env.local file not found!', 'yellow');
    log('   Create it from .env.local.example', 'yellow');
    log('   Run: cp .env.local.example .env.local\n', 'yellow');
  }

  // Load environment variables
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && !key.startsWith('#')) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }

  const geminiWorks = await testGemini();
  log(''); // Empty line
  const hfWorks = await testHuggingFace();
  
  log('\n📊 Test Results:', 'blue');
  log(`   Gemini: ${geminiWorks ? '✅ Ready' : '❌ Not configured'}`, geminiWorks ? 'green' : 'red');
  log(`   HuggingFace: ${hfWorks ? '✅ Ready' : '❌ Not configured'}`, hfWorks ? 'green' : 'red');
  
  if (geminiWorks || hfWorks) {
    log('\n🎉 At least one AI provider is working! You\'re ready to go!', 'green');
    log('   Run: npm run dev', 'green');
  } else {
    log('\n❌ No AI providers are configured correctly', 'red');
    log('   See AI_SETUP.md for setup instructions', 'yellow');
  }
  
  log(''); // Empty line
}

// Run tests
runTests().catch(console.error);
