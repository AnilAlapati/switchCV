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
  operation: string = "agentic_workflow"
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
      { merge: true }
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
      { merge: true }
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
  } catch {
    // Fail safe: If we can't check budget, we should probably be conservative.
    // However, to avoid blocking legitimate usage on transient errors,
    // we allow the request but rely on Cloud Functions error reporting and alerting.
    return true;
  }
}
