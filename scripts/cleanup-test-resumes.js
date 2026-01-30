/**
 * Cleanup script for removing test resumes
 * 
 * Usage: node scripts/cleanup-test-resumes.js
 */

const admin = require('firebase-admin');

admin.initializeApp({
    projectId: 'switchcv-dev'
});

const db = admin.firestore();

async function cleanupTestResumes() {
    console.log('🧹 Cleaning up test resumes...\n');

    try {
        let deleted = 0;
        const BATCH_SIZE = 20;

        for (let i = 0; i < 100; i += BATCH_SIZE) {
            const batch = db.batch();

            for (let j = i; j < Math.min(i + BATCH_SIZE, 100); j++) {
                const docId = `test-resume-${String(j).padStart(3, '0')}`;
                const docRef = db.collection('resumes').doc(docId);
                batch.delete(docRef);
            }

            await batch.commit();
            deleted += Math.min(BATCH_SIZE, 100 - i);
            console.log(`🗑️  Deleted ${deleted}/100 test resumes`);
        }

        console.log(`\n✨ Successfully cleaned up all test resumes!`);

    } catch (error) {
        console.error('❌ Error cleaning up:', error);
    } finally {
        admin.app().delete();
    }
}

cleanupTestResumes();
