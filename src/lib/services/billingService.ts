import admin, { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";

export interface AIUsageRecord {
  userId: string;
  model: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Pricing per 1k tokens (Estimated/Standard rates — updated Feb 2026)
export const MODEL_PRICING: Record<string, { input: number; output: number }> =
  {
    // Gemini 2.5 (current active models)
    "gemini-2.5-flash": { input: 0.00015, output: 0.0006 },
    "gemini-2.5-flash-lite": { input: 0.000075, output: 0.0003 },
    "gemini-2.5-pro": { input: 0.00125, output: 0.005 },

    // Gemini 2.0
    "gemini-2.0-flash": { input: 0.0001, output: 0.0004 },

    // Gemini 1.5 (legacy — kept for historical cost tracking)
    "gemini-1.5-flash": { input: 0.00035, output: 0.00105 },
    "gemini-1.5-pro": { input: 0.0035, output: 0.0105 },

    // OpenAI
    "gpt-4o": { input: 0.005, output: 0.015 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },

    // Anthropic (Proxied via other providers or direct)
    "claude-3-5-sonnet": { input: 0.003, output: 0.015 },

    // Llama/Mistral (Groq/HF - usually cheap or free in some tiers, assigning low cost)
    "llama-3.1-70b": { input: 0.0007, output: 0.0009 },
    "mixtral-8x7b": { input: 0.00027, output: 0.00027 },

    // Default fallback
    default: { input: 0.001, output: 0.002 },
  };

export const BUDGET_CAPS = {
  basic: 0.1, // Minimal hard cap for free tier (prevents abuse)
  premium: 30.0,
  enterprise: 70.0,
} as const;

export class BillingService {
  private static COLLECTION = "billing";
  private static NUM_SHARDS = 10;
  private static SHARD_COLLECTION = "system/billing/shards";

  /**
   * Calculate exact cost for a request
   */
  static calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const pricing = MODEL_PRICING[model] || MODEL_PRICING["default"];
    return (
      (inputTokens / 1000) * pricing.input +
      (outputTokens / 1000) * pricing.output
    );
  }

  /**
   * Tracks the cost of an operation using sharded counters.
   * Simplified API for quick cost tracking (e.g., agentic workflows).
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
    const shardId = Math.floor(Math.random() * this.NUM_SHARDS);
    const shardRef = adminDb.doc(`${this.SHARD_COLLECTION}/${shardId}`);

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
      // Don't fail the user request just because billing tracking failed
      logger.error({ err, userId, cost, operation }, "Billing tracking failed");
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
        .collection(this.SHARD_COLLECTION)
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
        logger.warn(
          { totalCost, cap },
          "Global budget cap reached — blocking AI requests",
        );
      }

      return totalCost < cap;
    } catch (err) {
      // Fail CLOSED: if we can't verify budget, block the request
      logger.error(
        { err, cap },
        "Failed to check global budget — failing closed",
      );
      return false;
    }
  }

  /**
   * Check if user has exceeded their budget for the current month.
   * Returns true if allowed, false if blocked.
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
      const docRef = adminDb
        .collection(this.COLLECTION)
        .doc(userId)
        .collection("monthly")
        .doc(billingKey);
      const snapshot = await docRef.get();

      const currentCost = snapshot.exists ? snapshot.data()?.totalCost || 0 : 0;
      const budgetLimit = BUDGET_CAPS[tier] || BUDGET_CAPS.basic;

      if (currentCost >= budgetLimit) {
        logger.warn(
          { userId, currentCost, budgetLimit },
          "⛔ Budget cap exceeded",
        );
        return false;
      }

      return true;
    } catch (error) {
      logger.error({ err: error, userId }, "Failed to check budget");
      // Fail open or closed? Security blocker says "bankruptcy-level costs", so fail CLOSED.
      return false;
    }
  }

  /**
   * Track usage and cost in Firestore.
   * Increments the daily and monthly counters.
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
        .collection(this.COLLECTION)
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

      // 2. Daily granular log (optional, good for charts)
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

      // 3. System-wide ledger (for aggregateBilling cloud function to simplify)
      // "system/billing/shards/shard_X"
      const shardId = Math.floor(Math.random() * 10);
      const shardRef = adminDb
        .collection("system/billing/shards")
        .doc(`shard_${shardId}`);
      batch.set(
        shardRef,
        {
          monthCost: admin.firestore.FieldValue.increment(cost),
          totalRequests: admin.firestore.FieldValue.increment(1),
        },
        { merge: true },
      );

      await batch.commit();

      logger.info({ userId, cost, model }, "💰 Usage tracked");
    } catch (error) {
      // Don't fail the request if tracking fails, but log valid error
      logger.error({ err: error, userId }, "Failed to track usage cost");
    }
  }
}
