import { adminDb, initializeFirebaseAdmin } from "../src/lib/firebase-admin";
import { logger } from "../src/lib/logger";

async function migrateRoleTiers() {
    initializeFirebaseAdmin();

    logger.info("Starting tier migration...");

    const usersRef = adminDb.collection("users");
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
        logger.info("No users found to migrate.");
        return;
    }

    let migratedCount = 0;
    let batch = adminDb.batch();
    let countInBatch = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const legacyTier = data.subscriptionTier || "basic";

        // Skip if already migrated and consistent
        if (data.jobSeekerTier === legacyTier && data.recruiterTier === legacyTier) {
            continue;
        }

        batch.set(doc.ref, {
            jobSeekerTier: legacyTier,
            recruiterTier: legacyTier,
            tierMigratedAt: new Date().toISOString()
        }, { merge: true });

        migratedCount++;
        countInBatch++;

        // Firestore batch limit is 500
        if (countInBatch >= 400) {
            await batch.commit();
            batch = adminDb.batch();
            countInBatch = 0;
            logger.info(`Migrated ${migratedCount} users so far...`);
        }
    }

    if (countInBatch > 0) {
        await batch.commit();
    }

    logger.info(`Migration complete. Total users updated: ${migratedCount}`);
}

migrateRoleTiers().catch((err) => {
    logger.error({ err }, "Migration failed");
    process.exit(1);
});
