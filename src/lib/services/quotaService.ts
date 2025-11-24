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
