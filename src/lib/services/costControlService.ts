/**
 * Cost Control Service — Agentic Pipeline Budget Enforcement
 *
 * Implements Firestore sharded counters for tracking agentic AI spend.
 * Hard-caps at $30/month (standard) and $70/month (enterprise) to prevent
 * runaway costs from the multi-agent pipeline.
 *
 * Separate from BillingService (which tracks individual model usage).
 * This service tracks the aggregate agentic budget enforced system-wide
 * and per-user, mirroring the billing plan from AGENTIC_MVP_PLAN.md.
 *
 * Usage:
 *   // Before running an agentic operation:
 *   const allowed = await costControlService.checkAgenticBudget("system");
 *   if (!allowed) throw new Error("Agentic budget cap reached");
 *
 *   // After the operation:
 *   await costControlService.trackAgenticCost(userId, estimatedCost, "agent_analyze");
 */

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Number of Firestore shards for write-throughput distribution */
const NUM_SHARDS = 10;

/** Firestore collection paths */
const COLLECTIONS = {
  /** System-wide sharded cost shards */
  SYSTEM_SHARDS: "agenticCosts/system/shards",
  /** Per-user monthly cost documents */
  USER_MONTHLY: "agenticCosts/users",
} as const;

/**
 * System-wide monthly budget caps (USD) for the agentic pipeline.
 * - standard: $30 covers the majority of agentic MVP usage
 * - enterprise: $70 for high-volume enterprise workflows
 */
export const AGENTIC_BUDGET_CAPS = {
  standard: 30.0,
  enterprise: 70.0,
} as const;

/** Per-user monthly soft limits (USD) to prevent single-user cost monopolisation */
export const PER_USER_MONTHLY_SOFT_CAP = {
  basic: 0.5,
  premium: 5.0,
  enterprise: 20.0,
} as const;

export type AgenticBudgetMode = keyof typeof AGENTIC_BUDGET_CAPS;
export type UserTierKey = keyof typeof PER_USER_MONTHLY_SOFT_CAP;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the YYYY-MM billing key for the current month */
function getCurrentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Lazily resolved Firestore instance (keeps firebase-admin out of client bundles) */
let _db: FirebaseFirestore.Firestore | null = null;
async function getDb(): Promise<FirebaseFirestore.Firestore> {
  if (_db) return _db;
  const admin = await import("firebase-admin");
  if (!admin.apps.length) admin.initializeApp();
  _db = admin.firestore();
  return _db;
}

// ---------------------------------------------------------------------------
// CostControlService
// ---------------------------------------------------------------------------

class CostControlService {
  // ── Track ────────────────────────────────────────────────────────────────

  /**
   * Increment the agentic cost counters.
   * Writes to:
   *   1. A random sharded system counter (for fast aggregation)
   *   2. The user's per-user monthly document (for per-user caps)
   *
   * Never throws — cost tracking failure must NOT block the user request.
   */
  async trackAgenticCost(
    userId: string,
    cost: number,
    operation: string = "agentic_workflow",
  ): Promise<void> {
    if (cost <= 0) return;

    const monthKey = getCurrentMonthKey();
    const shardId = Math.floor(Math.random() * NUM_SHARDS);

    try {
      const db = await getDb();
      const admin = await import("firebase-admin");

      const batch = db.batch();

      // 1. System shard increment
      const shardRef = db
        .collection(COLLECTIONS.SYSTEM_SHARDS)
        .doc(`shard_${shardId}`);
      batch.set(
        shardRef,
        {
          monthCost: admin.firestore.FieldValue.increment(cost),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          month: monthKey,
        },
        { merge: true },
      );

      // 2. User monthly document
      const userRef = db
        .collection(COLLECTIONS.USER_MONTHLY)
        .doc(userId)
        .collection("monthly")
        .doc(monthKey);
      batch.set(
        userRef,
        {
          totalCost: admin.firestore.FieldValue.increment(cost),
          [`operations.${operation}`]: admin.firestore.FieldValue.increment(1),
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      await batch.commit();

      logger.info(
        { userId, cost, operation, monthKey },
        "💰 Agentic cost tracked",
      );
    } catch (err) {
      // Fail open for tracking — cost tracking failure is non-blocking
      logger.error(
        { err, userId, cost, operation },
        "Agentic cost tracking failed — continuing",
      );
    }
  }

  // ── Check system budget ───────────────────────────────────────────────────

  /**
   * Check whether the system-wide agentic budget is still under the cap.
   *
   * Reads all shards and sums them. Returns true if spend is below the cap.
   * Fails CLOSED by default (returns false on Firestore error).
   */
  async checkAgenticBudget(
    mode: AgenticBudgetMode = "standard",
  ): Promise<boolean> {
    const cap = AGENTIC_BUDGET_CAPS[mode];
    const currentCost = await this.getSystemAgenticMonthlyCost();

    if (currentCost === null) {
      // Firestore unavailable — fail closed to protect budgets
      logger.error(
        { mode, cap },
        "Cannot verify agentic budget — failing closed",
      );
      return false;
    }

    if (currentCost >= cap) {
      logger.warn(
        { currentCost, cap, mode },
        "⛔ System agentic budget cap reached — blocking request",
      );
      return false;
    }

    return true;
  }

  // ── Check per-user budget ────────────────────────────────────────────────

  /**
   * Check whether the user is within their per-user monthly soft cap.
   * Returns true if allowed, false if the soft cap is exceeded.
   *
   * Fails OPEN (returns true) on Firestore error so a single user's
   * tracking outage doesn't block all users.
   */
  async checkUserAgenticBudget(
    userId: string,
    tier: UserTierKey = "basic",
  ): Promise<boolean> {
    const cap = PER_USER_MONTHLY_SOFT_CAP[tier];

    try {
      const userCost = await this.getUserMonthlyAgenticCost(userId);
      if (userCost >= cap) {
        logger.warn(
          { userId, userCost, cap, tier },
          "⛔ Per-user agentic budget cap reached",
        );
        return false;
      }
      return true;
    } catch (err) {
      // Fail OPEN for per-user check — avoid cascading outage
      logger.error(
        { err, userId, tier },
        "Per-user agentic budget check failed — allowing",
      );
      return true;
    }
  }

  // ── Read system cost ─────────────────────────────────────────────────────

  /**
   * Aggregate the current month's system-wide agentic cost by summing all shards.
   * Returns null if Firestore is unavailable.
   */
  async getSystemAgenticMonthlyCost(): Promise<number | null> {
    try {
      const db = await getDb();
      const snapshot = await db.collection(COLLECTIONS.SYSTEM_SHARDS).get();

      if (snapshot.empty) return 0;

      let total = 0;
      for (const doc of snapshot.docs) {
        total += (doc.data().monthCost as number) ?? 0;
      }
      return total;
    } catch (err) {
      logger.error({ err }, "Failed to aggregate system agentic cost");
      return null;
    }
  }

  // ── Read user cost ───────────────────────────────────────────────────────

  /**
   * Get the current month's agentic spend for a specific user (USD).
   * Returns 0 if the user has no recorded spend.
   */
  async getUserMonthlyAgenticCost(userId: string): Promise<number> {
    const monthKey = getCurrentMonthKey();
    try {
      const db = await getDb();
      const doc = await db
        .collection(COLLECTIONS.USER_MONTHLY)
        .doc(userId)
        .collection("monthly")
        .doc(monthKey)
        .get();

      return doc.exists ? ((doc.data()?.totalCost as number) ?? 0) : 0;
    } catch (err) {
      logger.error(
        { err, userId, monthKey },
        "Failed to read user agentic cost",
      );
      return 0;
    }
  }

  // ── Reset shards (testing / month rollover) ──────────────────────────────

  /**
   * Reset all system shards to zero.
   * Used in month-rollover Cloud Function and tests.
   */
  async resetSystemShards(): Promise<void> {
    try {
      const db = await getDb();
      const batch = db.batch();
      for (let i = 0; i < NUM_SHARDS; i++) {
        const shardRef = db
          .collection(COLLECTIONS.SYSTEM_SHARDS)
          .doc(`shard_${i}`);
        batch.set(shardRef, {
          monthCost: 0,
          lastUpdated: new Date().toISOString(),
        });
      }
      await batch.commit();
      logger.info("Agentic cost shards reset");
    } catch (err) {
      logger.error({ err }, "Failed to reset agentic cost shards");
      throw err;
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  /**
   * Returns a summary suitable for admin dashboard display.
   */
  async getStats(mode: AgenticBudgetMode = "standard"): Promise<{
    currentCost: number | null;
    cap: number;
    remainingBudget: number | null;
    utilizationPercent: string;
    isOverBudget: boolean;
  }> {
    const cap = AGENTIC_BUDGET_CAPS[mode];
    const currentCost = await this.getSystemAgenticMonthlyCost();
    const remaining =
      currentCost !== null ? Math.max(0, cap - currentCost) : null;
    const utilization =
      currentCost !== null
        ? `${((currentCost / cap) * 100).toFixed(1)}%`
        : "N/A";

    return {
      currentCost,
      cap,
      remainingBudget: remaining,
      utilizationPercent: utilization,
      isOverBudget: currentCost !== null && currentCost >= cap,
    };
  }
}

export const costControlService = new CostControlService();
