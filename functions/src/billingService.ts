import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";

const SHARD_COLLECTION = "system/billing/shards";
const AGGREGATE_DOC = "system/billing";

/**
 * Aggregates cost from sharded counters to a central document.
 * Triggered hourly via PubSub schedule.
 *
 * Key fix (Feb 2026): Resets shards at the start of each new month
 * to prevent cumulative totals from permanently blocking AI requests
 * when lifetime spend exceeds the monthly cap.
 */
export const aggregateBillingHandler = async (context: functions.EventContext) => {
    const db = admin.firestore();

    try {
        const date = new Date();
        const billingKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

        // Check if we need to reset shards for a new month
        const dashboardRef = db.doc(`${AGGREGATE_DOC}/dashboard/meta`);
        const metaSnap = await dashboardRef.get();
        const metaData = metaSnap.exists ? metaSnap.data() : undefined;
        const lastBillingKey = metaData?.lastBillingKey;

        if (lastBillingKey && lastBillingKey !== billingKey) {
            // New month detected — archive old shards and reset
            functions.logger.info(
                `New billing month detected: ${lastBillingKey} → ${billingKey}. Resetting shards.`
            );

            const shardsSnapshot = await db.collection(SHARD_COLLECTION).get();

            // Archive the previous month's total before reset
            let previousTotal = 0;
            for (const shard of shardsSnapshot.docs) {
                previousTotal += shard.data()?.monthCost || 0;
            }

            // Write the archived total
            await db.doc(`${AGGREGATE_DOC}/dashboard/${lastBillingKey}`).set({
                totalCost: previousTotal,
                finalizedAt: admin.firestore.FieldValue.serverTimestamp(),
                finalized: true,
            }, { merge: true });

            // Reset all shards to zero for the new month
            const resetBatch = db.batch();
            for (const shard of shardsSnapshot.docs) {
                resetBatch.set(shard.ref, {
                    monthCost: 0,
                    totalRequests: 0,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                    resetForMonth: billingKey,
                }, { merge: false });
            }
            await resetBatch.commit();

            functions.logger.info(
                `Reset ${shardsSnapshot.size} shards for month ${billingKey}. Archived ${lastBillingKey}: $${previousTotal}`
            );
        }

        // Now aggregate current shards
        const shardsSnapshot = await db.collection(SHARD_COLLECTION).get();
        let totalCost = 0;

        shardsSnapshot.forEach((doc) => {
            const data = doc.data();
            totalCost += (data.monthCost || 0);
        });

        // Write aggregated total to a central dashboard doc
        await db.doc(`${AGGREGATE_DOC}/dashboard/${billingKey}`).set({
            totalCost: totalCost,
            lastAggregated: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        // Update meta with current billing key
        await dashboardRef.set({
            lastBillingKey: billingKey,
            lastAggregated: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        functions.logger.info(`Aggregated total cost for ${billingKey}: $${totalCost}`);
    } catch (error) {
        functions.logger.error("Error aggregating billing:", error);
        throw error;
    }
};
