import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { logger } from "@/lib/logger";

const NUM_SHARDS = 10;
const SHARD_COLLECTION = "system/billing/shards";
const AGGREGATE_DOC = "system/billing";

/**
 * Tracks the cost of an agentic operation using sharded counters to avoid contention.
 *
 * @param cost The cost in USD to track.
 */
export async function trackCost(
  userId: string,
  cost: number,
  operation: string = "agentic_workflow",
): Promise<void> {
  const shardId = Math.floor(Math.random() * NUM_SHARDS);
  const shardRef = adminDb.doc(`${SHARD_COLLECTION}/${shardId}`);

  try {
    const batch = adminDb.batch();

    // 1. Sharded System Cost
    batch.set(
      shardRef,
      {
        monthCost: admin.firestore.FieldValue.increment(cost),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // 2. User Cost (Direct update, assumed lower contention per user)
    const userBillingRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("billing")
      .doc("current_month");

    batch.set(
      userBillingRef,
      {
        totalCost: admin.firestore.FieldValue.increment(cost),
        [`usage.${operation}`]: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    await batch.commit();
  } catch (err) {
    // Don't throw, we don't want to fail the user request just because billing tracking failed
    // Use logger for proper error tracking
    logger.error({ err, userId, cost, operation }, "Billing tracking failed");
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
      logger.warn(
        { totalCost, cap },
        "Global budget cap reached — blocking AI requests",
      );
    }

    return totalCost < cap;
  } catch (err) {
    // Fail CLOSED: if we can't verify budget, block the request
    // to prevent runaway costs if Firestore is having issues.
    logger.error(
      { err, cap },
      "Failed to check global budget — failing closed",
    );
    return false;
  }
}
