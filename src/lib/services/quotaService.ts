import admin, { adminDb } from "@/lib/firebase-admin";

export type QuotaPeriod = "daily" | "monthly";

export interface QuotaRequest {
  subjectId: string;
  scope: string;
  limit: number;
  period: QuotaPeriod;
}

export interface QuotaResult {
  remaining: number;
  limit: number;
  resetTime: number;
  count: number;
}

export class QuotaExceededError extends Error {
  constructor(message: string, public readonly resetTime?: number) {
    super(message);
    this.name = "QuotaExceededError";
  }
}

const COLLECTION_NAME = "usageQuotas";

const pad = (value: number) => value.toString().padStart(2, "0");

const getPeriodMetadata = (period: QuotaPeriod, now: Date) => {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  if (period === "daily") {
    return {
      key: `${year}-${pad(month + 1)}-${pad(day)}`,
      resetTime: Date.UTC(year, month, day + 1),
    };
  }

  return {
    key: `${year}-${pad(month + 1)}`,
    resetTime: Date.UTC(year, month + 1, 1),
  };
};

export async function consumeQuota(
  request: QuotaRequest
): Promise<QuotaResult> {
  const { subjectId, scope, limit, period } = request;

  if (!Number.isFinite(limit) || limit <= 0) {
    throw new QuotaExceededError("Quota unavailable for this operation");
  }

  const now = new Date();
  const { key, resetTime } = getPeriodMetadata(period, now);
  const docId = `${scope}_${subjectId}_${key}`;
  const docRef = adminDb.collection(COLLECTION_NAME).doc(docId);

  const count = await adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(docRef);
    const data = snapshot.exists ? snapshot.data() : null;
    const storedKey = data?.periodKey;
    const currentCount = storedKey === key ? Number(data?.count || 0) : 0;

    if (currentCount >= limit) {
      throw new QuotaExceededError("Quota exceeded for this period", resetTime);
    }

    const nextCount = currentCount + 1;
    tx.set(
      docRef,
      {
        subjectId,
        scope,
        period,
        periodKey: key,
        count: nextCount,
        limit,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(resetTime),
      },
      { merge: true }
    );

    return nextCount;
  });

  return {
    remaining: Math.max(0, limit - count),
    limit,
    resetTime,
    count,
  };
}

/**
 * Refund a previously consumed quota unit.
 *
 * Use this when an operation fails after quota was consumed (e.g., AI generation failure).
 * The refund is performed atomically and will only decrement if count > 0.
 *
 * @param request - The same quota request parameters used for consumption
 * @returns RefundResult with the updated count or false if refund wasn't possible
 *
 * @example
 * ```typescript
 * const quota = await consumeQuota({ subjectId: userId, scope: 'ai_generate', limit: 10, period: 'monthly' });
 * try {
 *   await generateAIContent();
 * } catch (error) {
 *   // Refund the quota since the operation failed
 *   await refundQuota({ subjectId: userId, scope: 'ai_generate', limit: 10, period: 'monthly' });
 *   throw error;
 * }
 * ```
 */
export interface RefundResult {
  refunded: boolean;
  currentCount: number;
  reason?: string;
}

export async function refundQuota(
  request: Omit<QuotaRequest, "limit">
): Promise<RefundResult> {
  const { subjectId, scope, period } = request;

  const now = new Date();
  const { key } = getPeriodMetadata(period, now);
  const docId = `${scope}_${subjectId}_${key}`;
  const docRef = adminDb.collection(COLLECTION_NAME).doc(docId);

  return adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(docRef);

    if (!snapshot.exists) {
      return {
        refunded: false,
        currentCount: 0,
        reason: "No quota record found for this period",
      };
    }

    const data = snapshot.data();
    const storedKey = data?.periodKey;

    // Only refund if we're in the same period
    if (storedKey !== key) {
      return {
        refunded: false,
        currentCount: 0,
        reason: "Quota period has changed, refund not applicable",
      };
    }

    const currentCount = Number(data?.count || 0);

    if (currentCount <= 0) {
      return {
        refunded: false,
        currentCount: 0,
        reason: "No quota to refund",
      };
    }

    const newCount = currentCount - 1;
    tx.update(docRef, {
      count: newCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastRefundAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      refunded: true,
      currentCount: newCount,
    };
  });
}
