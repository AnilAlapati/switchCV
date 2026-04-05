/**
 * Resume Quota Service
 *
 * Single source of truth for resume creation limits across all tiers.
 *
 * ## Design Decision — Lifetime Count, Not Active Count
 *
 * PROBLEM (Bug discovered Apr 2026):
 *   The previous implementation counted *active* resumes in Firestore.
 *   A hard delete set the count back to 0, allowing a basic user to create
 *   unlimited resumes by deleting and re-creating indefinitely.
 *
 * FIX:
 *   Track `lifetimeResumeCreations` — an atomic counter on the user document
 *   that increments on every successful create and NEVER decrements.
 *   Quota checks read this field, not the active-document count.
 *
 * BACKWARD COMPATIBILITY:
 *   For users who existed before this field was introduced, their
 *   `lifetimeResumeCreations` will be undefined (0).  We fall back to counting
 *   active resumes as a baseline so existing quota is respected.
 *   Specifically: `effectiveCount = max(lifetimeField, activeCount)`.
 *
 * REUSABILITY:
 *   The same logic works for every tier — only the limit value changes:
 *     basic     → 1
 *     premium   → 50
 *     enterprise → 9 999 (effectively unlimited)
 *
 * See docs/LESSONS_LEARNED.md → "Resume Quota: Count Lifetime Not Active"
 */

import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { logger } from "@/lib/logger";
import type { SubscriptionTier } from "@/lib/config";
import { getResumeCreationLimits } from "@/lib/config.server";

export interface ResumeQuotaStatus {
  /** Whether creating another resume is allowed */
  allowed: boolean;
  /** Effective lifetime count (max of stored field and active docs) */
  current: number;
  /** Tier limit (9999 for enterprise = unlimited) */
  limit: number;
  /** Remaining slots before the limit is hit */
  remaining: number;
  /** User's subscription tier */
  tier: SubscriptionTier;
}

/**
 * Returns the effective lifetime resume creation count for a user.
 *
 * Uses `max(lifetimeResumeCreations field, active doc count)` to handle:
 *   - New feature roll-out (field doesn't exist yet on old accounts)
 *   - Users who had resumes before this field was introduced
 */
export async function getLifetimeResumeCount(userId: string): Promise<number> {
  const [userDoc, activeSnapshot] = await Promise.all([
    adminDb.collection("users").doc(userId).get(),
    adminDb.collection("resumes").where("userId", "==", userId).count().get(),
  ]);

  const lifetimeField: number = userDoc.data()?.lifetimeResumeCreations ?? 0;
  const activeCount: number = activeSnapshot.data()?.count ?? 0;

  // Take the maximum so existing quotas are respected regardless of which
  // value was set first, and so that legacy users aren't accidentally given
  // a free pass after deleting their only resume.
  return Math.max(lifetimeField, activeCount);
}

/**
 * Atomically increments `lifetimeResumeCreations` on the user document.
 *
 * Call this AFTER a resume document has been successfully written to Firestore
 * so the counter stays consistent even if the increment fails (the resume
 * will simply appear as an "active" resume and be counted via the max logic).
 */
export async function incrementLifetimeResumeCount(
  userId: string,
): Promise<void> {
  try {
    await adminDb
      .collection("users")
      .doc(userId)
      .update({ lifetimeResumeCreations: FieldValue.increment(1) });
  } catch (err) {
    // Non-fatal: the active-count fallback in getLifetimeResumeCount will
    // keep the quota correct even if this update fails.
    logger.error(
      { err, userId },
      "Failed to increment lifetimeResumeCreations — quota will still be correct via active-count fallback",
    );
  }
}

/**
 * Checks whether a user is allowed to create another resume.
 *
 * Works identically for all tiers — the tier determines the limit:
 *   basic → 1, premium → 50, enterprise → 9999
 *
 * @example
 * const quota = await checkResumeCreationQuota(userId, "basic");
 * if (!quota.allowed) return quotaErrorResponse(quota);
 */
export async function checkResumeCreationQuota(
  userId: string,
  tier: SubscriptionTier,
): Promise<ResumeQuotaStatus> {
  const limits = await getResumeCreationLimits();
  const limit = limits[tier];

  // Enterprise is effectively unlimited — skip the Firestore read for performance
  if (limit >= 9999) {
    return { allowed: true, current: 0, limit, remaining: 9999, tier };
  }

  const current = await getLifetimeResumeCount(userId);
  const remaining = Math.max(0, limit - current);

  return {
    allowed: current < limit,
    current,
    limit,
    remaining,
    tier,
  };
}
