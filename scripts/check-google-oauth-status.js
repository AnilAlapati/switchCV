#!/usr/bin/env node

/**
 * Quick test to check if Google OAuth configuration is working
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (value && !value.startsWith('#')) {
        process.env[key.trim()] = value;
      }
    }
  });
}

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

console.log('📋 Current Configuration:');
console.log('   Project ID:', projectId || '❌ MISSING');
console.log('   Auth Domain:', authDomain || '❌ MISSING');
console.log('   API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ MISSING');
console.log('');

if (!projectId || !authDomain) {
  console.log('❌ Configuration incomplete. Check .env.local file.');
  process.exit(1);
}

console.log('🔗 Testing Firebase Auth endpoints...');

// Test 1: Check if auth domain is reachable
console.log('1️⃣  Testing auth domain connectivity...');
https.get(`https://${authDomain}/__/auth/handler`, (res) => {
  console.log(`   Status: ${res.statusCode}`);
  if (res.statusCode === 200 || res.statusCode === 404) {
    console.log('   ✅ Auth domain is reachable');
  } else {
    console.log('   ⚠️  Unexpected status code');
  }

  // Test 2: Check Google OAuth configuration
  console.log('\n2️⃣  Testing Google OAuth configuration...');
  const testUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`;

  const postData = JSON.stringify({
    postBody: 'providerId=google.com',
    requestUri: `http://localhost:3000`,
    returnIdpCredential: true,
    returnSecureToken: true
  });

  const options = {
    hostname: 'identitytoolkit.googleapis.com',
    port: 443,
    path: `/v1/accounts:signInWithIdp?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    console.log(`   Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.error) {
          if (response.error.message.includes('INVALID_OAUTH_CLIENT_ID')) {
            console.log('   ❌ OAuth client ID not configured or invalid');
            console.log('   💡 Fix: Configure OAuth client in Google Cloud Console');
          } else if (response.error.message.includes('MISSING_OAUTH_CLIENT')) {
            console.log('   ❌ OAuth client missing');
            console.log('   💡 Fix: Create OAuth client ID in Google Cloud Console');
          } else if (response.error.message.includes('UNAUTHORIZED_DOMAIN')) {
            console.log('   ❌ Domain not authorized');
            console.log('   💡 Fix: Add domain to authorized domains in Firebase Console');
          } else {
            console.log('   ❌ Configuration error:', response.error.message);
          }
        } else {
          console.log('   ✅ OAuth configuration appears valid');
        }
      } catch (parseError) {
        console.log('   ⚠️  Could not parse response');
      }

      console.log('\n📝 Next Steps:');
      console.log('1. Open http://localhost:3000/auth');
      console.log('2. Click the 🔍 Debug button (bottom-right)');
      console.log('3. Click "🧪 Test Google Sign-In"');
      console.log('4. Check if you get a success message or error');
      console.log('');
      console.log('If still failing, follow: docs/FIX_GOOGLE_SIGNIN_INTERNAL_ERROR.md');
    });
  });

  req.on('error', (e) => {
    console.log('   ❌ Network error:', e.message);
    console.log('   💡 Check your internet connection');
  });

  req.write(postData);
  req.end();

}).on('error', (err) => {
  console.log('   ❌ Cannot reach auth domain:', err.message);
  console.log('   💡 Check your internet connection or DNS');
});