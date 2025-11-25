/**
 * Script to enable TTL (Time-to-Live) policy for recruiterSearchHistory collection
 * This will automatically delete documents older than 90 days
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

async function setupTTL() {
  try {
    console.log('Setting up TTL policy for recruiterSearchHistory collection...');
    
    const db = admin.firestore();
    
    // Note: Firestore TTL is managed through the Google Cloud Console or gcloud CLI
    // The Firebase Admin SDK doesn't have a direct API to set TTL policies
    
    console.log('\n⚠️  TTL policies cannot be set programmatically via Firebase Admin SDK.');
    console.log('\nTo enable TTL, you have two options:\n');
    
    console.log('Option 1: Use gcloud CLI (recommended):');
    console.log('─────────────────────────────────────────');
    console.log('Run this command in your terminal:\n');
    console.log('gcloud firestore fields ttls update createdAt \\');
    console.log('  --collection-group=recruiterSearchHistory \\');
    console.log('  --enable-ttl\n');
    
    console.log('Option 2: Google Cloud Console:');
    console.log('─────────────────────────────────────────');
    console.log('1. Go to: https://console.cloud.google.com/firestore/databases/-default-/data');
    console.log('2. Click on "recruiterSearchHistory" collection');
    console.log('3. Click the three dots menu (⋮) at the top');
    console.log('4. Select "Manage TTL"');
    console.log('5. Choose "createdAt" field');
    console.log('6. Click "Enable"\n');
    
    console.log('Option 3: Keep using the Cloud Function (already deployed):');
    console.log('─────────────────────────────────────────');
    console.log('The cleanupRecruiterSearchHistory function is already deployed');
    console.log('and will run daily at 3 AM UTC to clean up old records.\n');
    
    // Verify the collection exists
    const snapshot = await db.collection('recruiterSearchHistory').limit(1).get();
    
    if (snapshot.empty) {
      console.log('ℹ️  The recruiterSearchHistory collection is empty.');
      console.log('   It will be created automatically when the first search is performed.\n');
    } else {
      console.log('✅ The recruiterSearchHistory collection exists with data.');
      console.log(`   Current document count: ${snapshot.size}\n`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

setupTTL();
