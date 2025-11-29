/**
 * Numeric ID Generator Service
 *
 * Generates numeric-only IDs (1-8 digits) for resumes using Firestore distributed counters.
 * The counter is sharded to avoid the single-document write bottleneck (1 write/s limit).
 * Each shard issues IDs spaced by the shard count, guaranteeing global uniqueness while
 * supporting high write throughput.
 */

import { adminDb } from "@/lib/firebase-admin";
import { getRecycledIdFromPool } from "@/lib/resumeIdRecycler";
import { logger } from "@/lib/logger";
import { ID_GENERATION } from "@/config/constants";

const {
  COUNTER_DOC_PATH,
  SHARD_COLLECTION_PATH,
  SHARD_COUNT,
  MAX_NUMERIC_ID,
  MAX_RETRIES,
} = ID_GENERATION;

const shardCollection = adminDb.collection(SHARD_COLLECTION_PATH);

interface CounterShardDoc {
  shardId: number;
  nextId: number;
  lastIssued: number;
  updatedAt?: string;
  createdAt?: string;
}

/**
 * Custom error class for ID generation failures
 */
export class IdGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly isRetryable: boolean = true
  ) {
    super(message);
    this.name = "IdGenerationError";
  }
}

const nowIso = () => new Date().toISOString();

const shardDocRef = (shardId: number) => shardCollection.doc(String(shardId));

const initialShardState = (
  shardId: number,
  startValue: number = 0
): CounterShardDoc => ({
  shardId,
  nextId: startValue + shardId + 1,
  lastIssued: startValue,
  createdAt: nowIso(),
  updatedAt: nowIso(),
});

const ensureShardInitialized = async (
  shardId: number,
  startValue: number = 0
): Promise<void> => {
  const ref = shardDocRef(shardId);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set(initialShardState(shardId, startValue));
  }
};

/**
 * Initialize the counter root metadata and all shards.
 * Safe to call multiple times.
 */
export const initializeIdCounter = async (): Promise<void> => {
  try {
    const counterRef = adminDb.doc(COUNTER_DOC_PATH);
    const counterSnap = await counterRef.get();

    if (!counterSnap.exists) {
      logger.info("Initializing resume ID counter root...");
      await counterRef.set({
        createdAt: nowIso(),
        lastResetAt: nowIso(),
      });
    }

    await Promise.all(
      Array.from({ length: SHARD_COUNT }).map((_, shardId) =>
        ensureShardInitialized(shardId)
      )
    );
  } catch (error) {
    logger.error({ err: error }, "Error initializing sharded counter");
    throw new IdGenerationError("Failed to initialize ID counter", error, true);
  }
};

const allocateFromShard = async (shardId: number): Promise<number> => {
  const ref = shardDocRef(shardId);

  return adminDb.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const shardData = snap.data() as CounterShardDoc | undefined;

    const nextId = shardData?.nextId ?? shardId + 1;

    if (nextId > MAX_NUMERIC_ID) {
      throw new IdGenerationError(
        `Shard ${shardId} exhausted numeric ID space`,
        undefined,
        false
      );
    }

    const updatedState: Partial<CounterShardDoc> = {
      nextId: nextId + SHARD_COUNT,
      lastIssued: nextId,
      updatedAt: nowIso(),
    };

    if (snap.exists) {
      transaction.update(ref, updatedState);
    } else {
      transaction.set(ref, {
        ...initialShardState(shardId),
        ...updatedState,
      });
    }

    return nextId;
  });
};

/**
 * Generate the next numeric resume ID (recycled → sharded counter fallback).
 */
export const generateNumericResumeId = async (): Promise<number> => {
  try {
    const recycledId = await getRecycledIdFromPool();
    if (recycledId !== null) {
      logger.info(
        { resumeId: recycledId, source: "recycled" },
        "Generated numeric resume ID"
      );
      return recycledId;
    }
  } catch (poolError) {
    logger.warn(
      { err: poolError },
      "Failed to pull from recycle pool; falling back to shards"
    );
  }

  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const shardId = Math.floor(Math.random() * SHARD_COUNT);

    try {
      const allocated = await allocateFromShard(shardId);
      logger.info(
        { resumeId: allocated, source: "sharded-counter", shardId },
        "Generated numeric resume ID"
      );
      return allocated;
    } catch (error) {
      lastError = error;
      if (error instanceof IdGenerationError && !error.isRetryable) {
        throw error;
      }
      logger.warn(
        { shardId, attempt, err: error },
        "Shard allocation failed; retrying"
      );
    }
  }

  throw new IdGenerationError(
    "Failed to allocate numeric ID from any shard",
    lastError,
    true
  );
};

/**
 * Get the highest issued ID across shards (for monitoring/diagnostics).
 */
export const getCurrentIdCounter = async (): Promise<number> => {
  try {
    const snapshot = await shardCollection
      .orderBy("lastIssued", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const data = snapshot.docs[0].data() as CounterShardDoc;
    return data.lastIssued || 0;
  } catch (error) {
    logger.error({ err: error }, "Error computing current ID counter");
    throw new IdGenerationError(
      "Failed to get current ID counter",
      error,
      true
    );
  }
};

/**
 * Reset all shards to a given starting offset.
 */
export const resetIdCounter = async (startValue: number = 0): Promise<void> => {
  try {
    const counterRef = adminDb.doc(COUNTER_DOC_PATH);
    const timestamp = nowIso();

    await counterRef.set(
      {
        lastResetAt: timestamp,
        resetTo: startValue,
      },
      { merge: true }
    );

    await Promise.all(
      Array.from({ length: SHARD_COUNT }).map((_, shardId) =>
        shardDocRef(shardId).set(
          {
            shardId,
            nextId: startValue + shardId + 1,
            lastIssued: startValue,
            updatedAt: timestamp,
            createdAt: timestamp,
          },
          { merge: true }
        )
      )
    );

    logger.info({ startValue }, "Sharded ID counter reset");
  } catch (error) {
    logger.error({ err: error, startValue }, "Error resetting ID counter");
    throw new IdGenerationError("Failed to reset ID counter", error, true);
  }
};
