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
        const updates: Promise<any>[] = [];

        shardsSnapshot.forEach((doc) => {
            const data = doc.data();
            totalCost += (data.monthCost || 0);
            // Optional: Reset shards to avoid double counting if determining delta, 
            // but for simple running total aggregation we might just read.
            // However, "monthCost" in shard implies it accumulates. 
            // If we want a global "current month total", we just sum them up.
        });

        const date = new Date();
        const billingKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

        // Write aggregated total to a central dashboard doc
        await db.doc(`${AGGREGATE_DOC}/dashboard/${billingKey}`).set({
            totalCost: totalCost,
            lastAggregated: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        console.log(`Aggregated total cost for ${billingKey}: $${totalCost}`);
    } catch (error) {
        console.error("Error aggregating billing:", error);
        throw error;
    }
};
