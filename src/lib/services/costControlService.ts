import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";

const NUM_SHARDS = 10;
const SHARD_COLLECTION = "system/billing/shards";
const AGGREGATE_DOC = "system/billing";

/**
 * Tracks the cost of an agentic operation using sharded counters to avoid contention.
 * 
 * @param cost The cost in USD to track.
 */
export async function trackCost(cost: number): Promise<void> {
    const shardId = Math.floor(Math.random() * NUM_SHARDS);
    const shardRef = adminDb.doc(`${SHARD_COLLECTION}/${shardId}`);

    try {
        await shardRef.set({
            monthCost: admin.firestore.FieldValue.increment(cost),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error("Failed to track cost:", error);
        // Don't throw, we don't want to fail the user request just because billing tracking failed
        // but definitely log it for alerting
    }
}

/**
 * Checks if the total spend is within the specified budget cap.
 * 
 * @param cap The budget cap in USD.
 * @returns True if current spend is LESS than the cap.
 */
export async function checkBudget(cap: number): Promise<boolean> {
    try {
        const aggRef = await adminDb.doc(AGGREGATE_DOC).get();

        if (!aggRef.exists) {
            // If billing doc doesn't exist, we assume we're safe (start of month/system)
            return true;
        }

        const data = aggRef.data();
        const totalCost = data?.totalCost || 0;

        return totalCost < cap;
    } catch (error) {
        console.error("Failed to check budget:", error);
        // Fail safe: If we can't check budget, we should probably be conservative.
        // However, to avoid blocking legitimate usage on transient errors, 
        // we might want to return true or have a fallback mechanism.
        // For MVP safety, let's log and return TRUE (allow) but rely on 
        // alerting to catch connection issues.
        return true;
    }
}
