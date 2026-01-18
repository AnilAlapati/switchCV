#!/usr/bin/env node
/**
 * Initialize Resume ID Counter Shards
 * 
 * This script initializes the sharded counter structure for resume ID generation.
 * Run this on any environment that's missing the shards subcollection.
 * 
 * Usage:
 *   # For prod
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/prod-key.json node scripts/init-resume-shards.js
 *   
 *   # Or use firebase-admin auto-discovery
 *   FIREBASE_PROJECT_ID=switchcv-e5136 node scripts/init-resume-shards.js
 * 
 * Prerequisites:
 *   - Firebase Admin SDK credentials configured
 *   - Node.js 18+
 */

const admin = require('firebase-admin');

// Configuration
const SHARD_COUNT = 16;
const COUNTER_DOC_PATH = 'system/resumeIdCounter';
const SHARD_COLLECTION_PATH = `${COUNTER_DOC_PATH}/shards`;

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || undefined,
    });
}

const db = admin.firestore();

async function getExistingResumeCount() {
    try {
        const snapshot = await db.collection('resumes').count().get();
        return snapshot.data().count;
    } catch (error) {
        console.warn('Could not count existing resumes:', error.message);
        return 0;
    }
}

async function getExistingCounterState() {
    try {
        const doc = await db.doc(COUNTER_DOC_PATH).get();
        if (doc.exists) {
            const data = doc.data();
            console.log('Existing counter state:', JSON.stringify(data, null, 2));
            return data;
        }
        return null;
    } catch (error) {
        console.warn('Could not read existing counter:', error.message);
        return null;
    }
}

async function getExistingShards() {
    try {
        const snapshot = await db.collection(SHARD_COLLECTION_PATH).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.warn('Could not read existing shards:', error.message);
        return [];
    }
}

async function initializeShards(startValue = 0) {
    const timestamp = new Date().toISOString();
    const batch = db.batch();

    // Update root counter document
    const counterRef = db.doc(COUNTER_DOC_PATH);
    batch.set(counterRef, {
        createdAt: timestamp,
        lastResetAt: timestamp,
        currentId: startValue,
        description: 'Global counter for numeric resume IDs. Do not modify directly.',
        migratedAt: timestamp,
        migrationNote: 'Shards initialized by init-resume-shards.js script',
    }, { merge: true });

    // Create all shards
    for (let shardId = 0; shardId < SHARD_COUNT; shardId++) {
        const shardRef = db.collection(SHARD_COLLECTION_PATH).doc(String(shardId));
        batch.set(shardRef, {
            shardId,
            nextId: startValue + shardId + 1, // Each shard starts at different offset
            lastIssued: startValue,
            createdAt: timestamp,
            updatedAt: timestamp,
        });
    }

    await batch.commit();
    console.log(`✓ Created ${SHARD_COUNT} shards starting from offset ${startValue}`);
}

async function main() {
    console.log('=== Resume ID Shards Initialization ===\n');

    // Check project
    const projectId = process.env.FIREBASE_PROJECT_ID || admin.app().options.projectId || 'unknown';
    console.log(`Target project: ${projectId}`);
    console.log(`Timestamp: ${new Date().toISOString()}\n`);

    // Get current state
    console.log('--- Current State ---');
    const existingCounter = await getExistingCounterState();
    const existingShards = await getExistingShards();
    const resumeCount = await getExistingResumeCount();

    console.log(`Existing resumes: ${resumeCount}`);
    console.log(`Existing shards: ${existingShards.length}`);

    if (existingShards.length === SHARD_COUNT) {
        console.log('\n✓ Shards already exist. No action needed.');
        console.log('Shard details:');
        existingShards.forEach(shard => {
            console.log(`  Shard ${shard.id}: nextId=${shard.nextId}, lastIssued=${shard.lastIssued}`);
        });
        process.exit(0);
    }

    // Determine starting value
    // Use the highest of: existing currentId, nextId, or resume count
    let startValue = 0;
    if (existingCounter) {
        startValue = Math.max(
            startValue,
            existingCounter.currentId || 0,
            existingCounter.nextId || 0
        );
    }
    startValue = Math.max(startValue, resumeCount);

    console.log(`\n--- Action Required ---`);
    console.log(`Will initialize ${SHARD_COUNT} shards starting from offset: ${startValue}`);
    console.log(`Next ID generated will be: ${startValue + 1}`);

    // Prompt for confirmation in interactive mode
    if (process.stdin.isTTY) {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise(resolve => {
            rl.question('\nProceed? (yes/no): ', resolve);
        });
        rl.close();

        if (answer.toLowerCase() !== 'yes') {
            console.log('Aborted.');
            process.exit(1);
        }
    } else {
        console.log('\nNon-interactive mode. Auto-proceeding in 3 seconds...');
        await new Promise(r => setTimeout(r, 3000));
    }

    // Initialize
    console.log('\n--- Initializing ---');
    await initializeShards(startValue);

    // Verify
    console.log('\n--- Verification ---');
    const newShards = await getExistingShards();
    console.log(`Shards created: ${newShards.length}/${SHARD_COUNT}`);

    if (newShards.length === SHARD_COUNT) {
        console.log('\n✅ SUCCESS: Shards initialized successfully!');
        console.log('You can now generate resume IDs using the sharded counter.');
    } else {
        console.log('\n❌ ERROR: Shard count mismatch. Please check Firebase Console.');
        process.exit(1);
    }
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
