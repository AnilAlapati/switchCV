#!/usr/bin/env node

/**
 * Count resumes in Firestore (dev environment)
 * Checks both 'resumes' and 'resumeProfiles' collections (legacy support)
 */

// Set project ID for dev environment
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'switchcv-dev';

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using Application Default Credentials
admin.initializeApp({
  projectId: 'switchcv-dev'
});

const db = admin.firestore();

async function countResumes() {
  try {
    console.log('🔍 Counting resumes in dev Firestore...\n');

    // Count resumes collection
    const resumesSnapshot = await db.collection('resumes').get();
    const resumesCount = resumesSnapshot.size;

    // Count legacy resumeProfiles collection
    const profilesSnapshot = await db.collection('resumeProfiles').get();
    const profilesCount = profilesSnapshot.size;

    console.log('📊 Results:');
    console.log('─'.repeat(50));
    console.log(`  resumes collection:        ${resumesCount} documents`);
    console.log(`  resumeProfiles collection: ${profilesCount} documents`);
    console.log('─'.repeat(50));
    console.log(`  Total:                     ${resumesCount + profilesCount} resumes\n`);

    // Get sample resume IDs from each collection
    if (resumesCount > 0) {
      console.log('📝 Sample resume IDs (first 5 from resumes):');
      resumesSnapshot.docs.slice(0, 5).forEach((doc, idx) => {
        const data = doc.data();
        console.log(`  ${idx + 1}. ${doc.id} (user: ${data.userId || 'unknown'})`);
      });
      console.log('');
    }

    if (profilesCount > 0) {
      console.log('📝 Sample resume IDs (first 5 from resumeProfiles):');
      profilesSnapshot.docs.slice(0, 5).forEach((doc, idx) => {
        const data = doc.data();
        console.log(`  ${idx + 1}. ${doc.id} (user: ${data.userId || 'unknown'})`);
      });
      console.log('');
    }

    // Count by visibility
    const publicResumes = resumesSnapshot.docs.filter(doc => doc.data().isPublic === true).length;
    const privateResumes = resumesCount - publicResumes;

    console.log('👁️  Visibility breakdown (resumes collection):');
    console.log(`  Public:  ${publicResumes}`);
    console.log(`  Private: ${privateResumes}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error counting resumes:', error);
    process.exit(1);
  }
}

countResumes();
