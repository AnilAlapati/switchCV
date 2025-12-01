#!/usr/bin/env node

/**
 * Import Firebase Config to DEV Environment
 * Uses Firebase CLI authentication (no service account needed!)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function importConfig() {
  console.log('🔥 Importing config to switchcv-dev...\n');

  try {
    // Initialize with application default credentials (uses Firebase CLI auth)
    admin.initializeApp({
      projectId: 'switchcv-dev'
    });

    const db = admin.firestore();
    const configPath = path.join(__dirname, '..', 'config-dev.json');
    
    if (!fs.existsSync(configPath)) {
      console.error('❌ config-dev.json not found');
      process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    console.log('📝 Writing config to Firestore...');
    await db.collection('config').doc('system').set(config);
    
    console.log('✅ Successfully imported config to switchcv-dev!');
    console.log('\n📋 Configuration Summary:');
    console.log(`   Analytics: ${config.features.enableAnalytics ? 'Enabled' : 'Disabled'}`);
    console.log(`   Mock Data: ${config.features.enableMockData ? 'Enabled' : 'Disabled'}`);
    console.log(`   Basic Tier Resume Limit: ${config.tiers.basic.resumeLimit}`);
    console.log(`   AI Model: ${config.ai.defaultModel}`);
    console.log(`   Config Cache TTL: ${config.cache.systemConfigTtlMs / 1000}s`);
    
    console.log('\n🎉 Done! You can now:');
    console.log('   1. View in Firebase Console');
    console.log('   2. Test: curl http://localhost:3000/api/system-config');
    console.log('   3. Edit values directly in Firestore\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing config:', error.message);
    
    if (error.message.includes('default credentials')) {
      console.log('\n💡 Run this first:');
      console.log('   export GOOGLE_APPLICATION_CREDENTIALS=""');
      console.log('   firebase login');
    }
    
    process.exit(1);
  }
}

importConfig();
