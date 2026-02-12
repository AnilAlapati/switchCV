import { adminDb, admin } from "./firebase";
import * as functions from "firebase-functions/v1";

const NUM_SHARDS = 10;
const SHARD_COLLECTION = "system/billing/shards";

/**
 * Tracks the cost of an agentic operation using sharded counters to avoid contention.
 *
 * @param cost The cost in USD to track.
 */
export async function trackCost(cost: number): Promise<void> {
  const shardId = Math.floor(Math.random() * NUM_SHARDS);
  const shardRef = adminDb.doc(`${SHARD_COLLECTION}/${shardId}`);

  try {
    await shardRef.set(
      {
        monthCost: admin.firestore.FieldValue.increment(cost),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    functions.logger.error("Failed to track cost:", error);
  }
}

/**
 * Checks if the total spend is within the specified budget cap.
 * Reads from shards directly (not the aggregate doc) to get accurate totals.
 *
 * @param cap The budget cap in USD.
 * @returns True if current spend is LESS than the cap.
 */
export async function checkBudget(cap: number): Promise<boolean> {
  try {
    // Read all shards and sum their costs — the aggregate doc is not
    // guaranteed to be up-to-date since there is no aggregation job.
    const shardsSnapshot = await adminDb.collection(SHARD_COLLECTION).get();

    if (shardsSnapshot.empty) {
      // No shards exist — no spend recorded yet, safe to proceed
      return true;
    }

    let totalCost = 0;
    for (const shard of shardsSnapshot.docs) {
      const data = shard.data();
      totalCost += data?.monthCost || 0;
    }

    if (totalCost >= cap) {
      functions.logger.warn(
        `Global budget cap reached — blocking AI requests. totalCost=${totalCost}, cap=${cap}`,
      );
    }

    return totalCost < cap;
  } catch (error) {
    // Fail CLOSED: if we can't verify budget, block the request
    // to prevent runaway costs if Firestore is having issues.
    functions.logger.error("Failed to check global budget — failing closed:", error);
    return false;
  }
}
