/**
 * Cleanup script for development data
 * Deletes all users and their associated data from Firestore
 * 
 * Usage: node scripts/cleanup-dev-users.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'switchcv-dev';
console.log(`🔄 Initializing Firebase Admin for project: ${projectId}`);

// Check if service account is available
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId,
    });
} else {
    admin.initializeApp({
        projectId,
    });
}

const auth = admin.auth();
const db = admin.firestore();

async function cleanupDevData() {
    try {
        console.log('\n⚠️  Starting cleanup of all development users and data...\n');

        // Step 1: Delete all users from Firebase Auth
        console.log('Step 1: Deleting users from Firebase Authentication...');
        let deleteCount = 0;
        let userIds = [];

        try {
            // Get all users
            let userList = await auth.listUsers(1000);
            
            do {
                for (const user of userList.users) {
                    userIds.push(user.uid);
                }
                if (userList.pageToken) {
                    userList = await auth.listUsers(1000, userList.pageToken);
                } else {
                    break;
                }
            } while (true);

            console.log(`  Found ${userIds.length} users to delete`);

            // Delete users in batches
            for (const uid of userIds) {
                try {
                    await auth.deleteUser(uid);
                    deleteCount++;
                    console.log(`  ✓ Deleted user: ${uid}`);
                } catch (error) {
                    console.log(`  ⚠ Failed to delete ${uid}: ${error.message}`);
                }
            }
            console.log(`✅ Deleted ${deleteCount} users from Firebase Auth\n`);
        } catch (error) {
            console.log(`⚠️  Error deleting users: ${error.message}\n`);
        }

        // Step 2: Delete Firestore collections
        console.log('Step 2: Deleting Firestore collections...');
        
        const collections = [
            'users',
            'userProfiles',
            'resumes',
            'resumeProfiles',
            'verificationTokens',
            'accessRequests',
            'recruiterRequests',
            'auditLogs',
            'systemConfig',
            'mail',
            'mailDeliveryLog',
            'subscriptions',
            'billingHistory'
        ];

        for (const collection of collections) {
            try {
                const collectionRef = db.collection(collection);
                const snapshot = await collectionRef.get();
                
                if (!snapshot.empty) {
                    const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
                    await Promise.all(deletePromises);
                    console.log(`  ✓ Deleted ${snapshot.docs.length} documents from ${collection}`);
                } else {
                    console.log(`  ℹ ${collection} was already empty`);
                }
            } catch (error) {
                console.log(`  ⚠ Error deleting collection ${collection}: ${error.message}`);
            }
        }
        console.log('✅ Firestore collections cleaned\n');

        // Step 3: Verify cleanup
        console.log('Step 3: Verification...');
        
        try {
            const userList = await auth.listUsers(10);
            console.log(`  Remaining Auth users: ${userList.users.length}`);
        } catch (error) {
            console.log(`  Unable to verify user count: ${error.message}`);
        }

        console.log('\n✅ Cleanup complete!\n');
        console.log('Next steps:');
        console.log('  1. Restart dev server: npm run dev');
        console.log('  2. Create new test account to test email verification');
        console.log('  3. Check Gmail for verification email with custom token link\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Cleanup failed:', error);
        process.exit(1);
    }
}

// Run cleanup
cleanupDevData();
