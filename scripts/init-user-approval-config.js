#!/usr/bin/env node
/**
 * Initialize User Approval Config in Firestore
 * 
 * Usage:
 *   node scripts/init-user-approval-config.js dev   # For dev environment
 *   node scripts/init-user-approval-config.js prod  # For production environment
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const env = process.argv[2] || 'dev';

// Load the appropriate service account
const configPath = env === 'prod' 
  ? path.join(__dirname, '..', 'firebase_config_prod_backup.json')
  : path.join(__dirname, '..', 'config-dev.json');

if (!fs.existsSync(configPath)) {
  console.error(`❌ Config file not found: ${configPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(configPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function initUserApprovalConfig() {
  console.log(`\n🔧 Initializing User Approval Config for ${env} environment...\n`);
  
  const configRef = db.collection('config').doc('system');
  const configDoc = await configRef.get();
  
  const userApprovalConfig = {
    enabled: true,
    adminEmail: 'support@switchcv.com',
    declineReason: 'We appreciate your interest in SwitchCV. Unfortunately, we are unable to approve your registration at this time. Please contact support@switchcv.com for more information.',
    autoApproveDomains: []
  };
  
  try {
    if (configDoc.exists) {
      // Merge with existing config
      await configRef.update({
        userApproval: userApprovalConfig,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Updated existing config with userApproval settings');
    } else {
      // Create new config document
      await configRef.set({
        userApproval: userApprovalConfig,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✅ Created new config document with userApproval settings');
    }
    
    console.log('\n📋 User Approval Config:');
    console.log(JSON.stringify(userApprovalConfig, null, 2));
    console.log('\n✅ Done! User approval system is now enabled.');
    console.log('\nTo disable, set userApproval.enabled to false in Firestore console:');
    console.log(`  https://console.firebase.google.com/project/${serviceAccount.project_id}/firestore/data/config/system\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating config:', error);
    process.exit(1);
  }
}

initUserApprovalConfig();
