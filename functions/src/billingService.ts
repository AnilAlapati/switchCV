import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";

const SHARD_COLLECTION = "system/billing/shards";
const AGGREGATE_DOC = "system/billing";

/**
 * Aggregates cost from sharded counters to a central document.
 * Triggered periodically (e.g., every minute or triggered by write).
 * For MVP, we'll try to trigger it via PubSub schedule (every few minutes)
 * or we can trigger it on write to shards (but that might be too frequent aka write multiplication).
 * 
 * Let's go with Scheduled for efficiency, e.g., every 5 minutes or 1 minute.
 * The plan said "Cloud Function aggregateBilling".
 */
export const aggregateBillingHandler = async (context: functions.EventContext) => {
    const db = admin.firestore();

    try {
        const shardsSnapshot = await db.collection(SHARD_COLLECTION).get();
        let totalCost = 0;

        shardsSnapshot.forEach((doc) => {
            const data = doc.data();
            totalCost += (data.monthCost || 0);
        });

        // Write aggregated total
        await db.doc(AGGREGATE_DOC).set({
            totalCost: totalCost,
            lastAggregated: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log(`Aggregated total cost: $${totalCost}`);
    } catch (error) {
        console.error("Error aggregating billing:", error);
        throw error;
    }
};
