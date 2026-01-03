
import { adminDb } from "../src/lib/firebase-admin";
import * as admin from "firebase-admin";

const NUM_SHARDS = 10;
const SHARD_COLLECTION = "system/billing/shards";

async function initShards() {
    console.log("Initializing billing shards...");
    const batch = adminDb.batch();

    for (let i = 0; i < NUM_SHARDS; i++) {
        const shardRef = adminDb.doc(`${SHARD_COLLECTION}/${i}`);
        // Only create if it doesn't exist to avoid overwriting existing data
        // tailored for a run-once script, but `set` with merge: true is safer generally
        // However, we want to ensure 0 start if we are resetting.
        // For safety, let's just ensure they exist.
        batch.set(shardRef, {
            shardId: i,
            initializedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    await batch.commit();
    console.log(`Successfully initialized ${NUM_SHARDS} shards.`);
}

initShards().catch(console.error);
