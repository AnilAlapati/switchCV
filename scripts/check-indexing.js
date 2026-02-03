
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'switchcv-dev';

// Support for local emulator
if (process.env.FIRESTORE_EMULATOR_HOST) {
    console.log(`Using Firestore Emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
}

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: projectId
    });
}

const db = admin.firestore();

async function checkIndexing() {
    console.log(`Checking indexing status for project: ${projectId}...`);
    const resumesRef = db.collection('resumes');
    const snapshot = await resumesRef.get();

    console.log(`Total resumes found in Firestore: ${snapshot.size}`);

    if (snapshot.size === 0) {
        console.log('No resumes found in the collection.');
        return;
    }

    let indexedCount = 0;
    let beingEditedCount = 0;
    let noEmbeddingCount = 0;

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.isBeingEdited) {
            beingEditedCount++;
        }
        if (!data.embedding || !Array.isArray(data.embedding)) {
            noEmbeddingCount++;
        } else {
            indexedCount++;
        }
    });

    console.log(`Indexed (has embedding): ${indexedCount}`);
    console.log(`Being edited (skipped by search): ${beingEditedCount}`);
    console.log(`No embedding or invalid: ${noEmbeddingCount}`);

    if (noEmbeddingCount > 0) {
        console.log('\nSample IDs missing embeddings (first 5):');
        snapshot.docs
            .filter(doc => {
                const data = doc.data();
                return !data.embedding || !Array.isArray(data.embedding);
            })
            .slice(0, 5)
            .forEach(doc => {
                const data = doc.data();
                console.log(`- ${doc.id} (isBeingEdited: ${data.isBeingEdited})`);
            });
    }
}

checkIndexing().catch(err => {
    console.error('Error checking indexing:', err);
    process.exit(1);
});
