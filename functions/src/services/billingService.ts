/**
 * REPLICA of BillingService for Cloud Functions
 * Standardized across Next.js and Cloud Functions
 * Source of truth: src/lib/billing/shared.ts
 */
import { adminDb, admin } from "../lib/firebase";
import * as functions from "firebase-functions";
import {
  BUDGET_CAPS,
  BILLING_CONFIG,
  calculateAicost,
} from "../lib/billing/shared";

/**
 * Service for managing system-wide and user-specific billing/cost tracking.
 */
export class BillingService {
  /**
   * Calculate exact cost for a request
   */
  static calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    return calculateAicost(model, inputTokens, outputTokens);
  }

  /**
   * Tracks the cost of an operation using sharded counters to avoid write contention.
   *
   * @param userId The user who incurred the cost
   * @param cost The cost in USD
   * @param operation The operation type (e.g., 'agentic_workflow', 'agent_analyze')
   */
  static async trackCost(
    userId: string,
    cost: number,
    operation: string = "agentic_workflow",
  ): Promise<void> {
    const shardId = Math.floor(Math.random() * BILLING_CONFIG.NUM_SHARDS);
    const shardRef = adminDb.collection(BILLING_CONFIG.SHARD_COLLECTION).doc(`shard_${shardId}`);

    const date = new Date();
    const billingKey = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;

    try {
      const batch = adminDb.batch();

      // 1. Sharded System Cost
      batch.set(
        shardRef,
        {
          monthCost: admin.firestore.FieldValue.increment(cost),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          totalRequests: admin.firestore.FieldValue.increment(1),
        },
        { merge: true },
      );

      // 2. User Cost
      const userBillingRef = adminDb
        .collection(BILLING_CONFIG.COLLECTION)
        .doc(userId)
        .collection("monthly")
        .doc(billingKey);

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
    }
  }

  /**
   * Checks if the total system spend is within the specified budget cap.
   * Reads from shards directly (not the aggregate doc) to get accurate totals.
   *
   * @param cap The budget cap in USD.
   * @returns True if current spend is LESS than the cap.
   */
  static async checkSystemBudget(cap: number): Promise<boolean> {
    try {
      const shardsSnapshot = await adminDb
        .collection(BILLING_CONFIG.SHARD_COLLECTION)
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
   */
  static async checkBudget(
    userId: string,
    tier: keyof typeof BUDGET_CAPS = "basic",
  ): Promise<boolean> {
    const date = new Date();
    const billingKey = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;

    try {
      const userBillingRef = await adminDb
        .collection(BILLING_CONFIG.COLLECTION)
        .doc(userId)
        .collection("monthly")
        .doc(billingKey)
        .get();

      const currentCost = userBillingRef.exists ? userBillingRef.data()?.totalCost || 0 : 0;
      const budgetLimit = BUDGET_CAPS[tier] || BUDGET_CAPS.basic;

      return currentCost < budgetLimit;
    } catch (error) {
      functions.logger.error("Failed to check user budget:", error);
      return false;
    }
  }

  /**
   * Track usage and cost in Firestore.
   */
  static async trackUsage(
    userId: string,
    model: string,
    usage: { input: number; output: number },
  ): Promise<void> {
    const cost = this.calculateCost(model, usage.input, usage.output);
    const date = new Date();
    const billingKey = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
    const dayKey = `${billingKey}-${date
      .getDate()
      .toString()
      .padStart(2, "0")}`;

    try {
      const batch = adminDb.batch();

      // 1. User Monthly Record
      const monthlyRef = adminDb
        .collection(BILLING_CONFIG.COLLECTION)
        .doc(userId)
        .collection("monthly")
        .doc(billingKey);

      batch.set(
        monthlyRef,
        {
          totalCost: admin.firestore.FieldValue.increment(cost),
          totalTokens: admin.firestore.FieldValue.increment(
            usage.input + usage.output,
          ),
          requestCount: admin.firestore.FieldValue.increment(1),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // 2. Daily granular log
      const dailyRef = monthlyRef.collection("daily").doc(dayKey);
      batch.set(
        dailyRef,
        {
          cost: admin.firestore.FieldValue.increment(cost),
          tokens: admin.firestore.FieldValue.increment(
            usage.input + usage.output,
          ),
          requests: admin.firestore.FieldValue.increment(1),
        },
        { merge: true },
      );

      // 3. System-wide ledger
      const shardId = Math.floor(Math.random() * BILLING_CONFIG.NUM_SHARDS);
      const shardRef = adminDb
        .collection(BILLING_CONFIG.SHARD_COLLECTION)
        .doc(`shard_${shardId}`);

      batch.set(
        shardRef,
        {
          monthCost: admin.firestore.FieldValue.increment(cost),
          totalRequests: admin.firestore.FieldValue.increment(1),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      await batch.commit();
    } catch (error) {
      functions.logger.error("Failed to track usage cost:", error);
    }
  }
}

