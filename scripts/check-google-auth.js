#!/usr/bin/env node

/**
 * Diagnostic script to check Google Sign-In configuration
 * 
 * This script checks:
 * 1. Firebase configuration completeness
 * 2. Google Auth Provider setup
 * 3. Network connectivity
 */

const https = require('https');

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

console.log('🔍 Checking Google Sign-In Configuration\n');

// 1. Check environment variables
console.log('1️⃣  Firebase Configuration:');
console.log('   Project ID:', projectId || '❌ MISSING');
console.log('   Auth Domain:', authDomain || '❌ MISSING');
console.log('   API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ MISSING');
console.log('');

// 2. Check if auth domain is reachable
if (authDomain) {
  console.log('2️⃣  Testing Firebase Auth Domain connectivity...');
  
  https.get(`https://${authDomain}/__/auth/handler`, (res) => {
    console.log(`   Status: ${res.statusCode}`);
    if (res.statusCode === 200 || res.statusCode === 404) {
      console.log('   ✅ Auth domain is reachable');
    } else {
      console.log('   ⚠️  Unexpected status code');
    }
    console.log('');
    printNextSteps();
  }).on('error', (err) => {
    console.log('   ❌ Cannot reach auth domain:', err.message);
    console.log('');
    printNextSteps();
  });
} else {
  console.log('2️⃣  Cannot test connectivity - auth domain not set\n');
  printNextSteps();
}

function printNextSteps() {
  console.log('📋 Next Steps to Fix Google Sign-In:\n');
  console.log('1. Enable Google Authentication in Firebase Console:');
  console.log('   • Go to: https://console.firebase.google.com/');
  console.log(`   • Select project: ${projectId || 'your-project'}`);
  console.log('   • Navigate to: Authentication > Sign-in method');
  console.log('   • Enable "Google" provider');
  console.log('   • Save changes\n');
  
  console.log('2. Add Authorized Domains:');
  console.log('   • In Firebase Console: Authentication > Settings > Authorized domains');
  console.log('   • Add: localhost');
  console.log('   • Add your production domain if deploying\n');
  
  console.log('3. Check Browser Console:');
  console.log('   • Open http://localhost:3000/auth');
  console.log('   • Click "Continue with Google"');
  console.log('   • Open Developer Tools (F12) > Console');
  console.log('   • Look for error messages\n');
  
  console.log('4. Common Issues:');
  console.log('   • ❌ Popup blocked by browser - allow popups for localhost');
  console.log('   • ❌ Google provider not enabled - see step 1');
  console.log('   • ❌ Unauthorized domain - see step 2');
  console.log('   • ❌ API key restrictions - check in Google Cloud Console\n');
}
