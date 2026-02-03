
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Use project ID from env
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'switchcv-dev';

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: projectId
    });
}

const db = admin.firestore();

// Import the logic from the function if possible, or replicate it
// Given we can't easily import from TS Cloud Functions in a simple JS script,
// we will just recommend the user to call the reindex endpoint OR 
// we will trigger a dummy update to each document to fire the 'onWrite' trigger.

async function triggerReindexing() {
    console.log(`Triggering re-indexing for resumes in: ${projectId}...`);
    const snapshot = await db.collection('resumes').get();

    console.log(`Found ${snapshot.size} resumes.`);

    let count = 0;
    for (const doc of snapshot.docs) {
        // Adding a dummy timestamp to trigger the 'onWrite' function
        await doc.ref.update({
            _triggerUpdate: new Date().toISOString()
        });
        count++;
        if (count % 5 === 0) console.log(`Triggered ${count}/${snapshot.size}...`);
    }

    console.log(`\nSuccessfully triggered re-indexing for ${count} resumes.`);
    console.log('NOTE: It may take a few minutes for the Cloud Functions to generate all embeddings.');
}

triggerReindexing().catch(console.error);
