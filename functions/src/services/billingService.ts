import { adminDb, admin } from "../lib/firebase";
import * as functions from "firebase-functions";

const NUM_SHARDS = 10;
const SHARD_COLLECTION = "system/billing/shards";

/**
 * Service for managing system-wide and user-specific billing/cost tracking.
 */
export class BillingService {
  /**
   * Tracks the cost of an operation using sharded counters to avoid write contention.
   *
   * @param userId The user ID (for future per-user tracking).
   * @param cost The cost in USD to track.
   * @param operation The operation type (e.g., 'resume_generation', 'agentic_flow').
   */
  async trackUsage(
    userId: string,
    cost: number,
    operation: string,
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
    } catch (error) {
      functions.logger.error("Failed to track billing usage:", error);
      // Critical: Tracking failures should be alerted, but we don't want to crash the request?
      // For now, logging error.
    }
  }

  /**
   * Checks if the total system spend is within the specified budget cap.
   * Reads from shards directly (not the aggregate doc) to get accurate totals.
   *
   * @param cap The budget cap in USD.
   * @returns True if current spend is LESS than the cap.
   */
  async checkSystemBudget(cap: number): Promise<boolean> {
    try {
      const shardsSnapshot = await adminDb
        .collection(SHARD_COLLECTION)
        .limit(20)
        .get();

      if (shardsSnapshot.empty) {
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
      functions.logger.error("Failed to check system budget:", error);
      // Critical: Fail CLOSED to prevent unauthorized spending during outages
      return false;
    }
  }

  /**
   * Checks if a specific user has exceeded a monthly spending limit.
   * Unused for Free Tier (usage counts used instead), but useful for API/Enterprise.
   */
  async checkUserBudget(userId: string, cap: number): Promise<boolean> {
    try {
      const userBillingRef = await adminDb
        .collection("users")
        .doc(userId)
        .collection("billing")
        .doc("current_month")
        .get();
      if (!userBillingRef.exists) return true;

      const totalCost = userBillingRef.data()?.totalCost || 0;
      return totalCost < cap;
    } catch (error) {
      functions.logger.error("Failed to check user budget:", error);
      return false;
    }
  }
}

export const billingService = new BillingService();
