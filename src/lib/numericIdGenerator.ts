/**
 * Numeric ID Generator Service
 *
 * Generates numeric-only IDs (1-8 digits) for resumes using Firestore atomic operations.
 * Designed to handle concurrent requests from millions of users without collisions.
 *
 * Architecture:
 * - Uses Firestore's atomic increment operation for guaranteed uniqueness
 * - Counter stored in a dedicated document in Firestore
 * - Supports IDs from 1 to 99,999,999 (8 digits max)
 * - No collisions even with simultaneous requests
 *
 * Why this approach:
 * - Firestore atomic operations are guaranteed to be consistent
 * - Each increment is atomic, preventing race conditions
 * - Scales horizontally without additional coordination
 * - Simple, fast, and reliable
 *
 * SECURITY NOTE: This service NEVER falls back to random IDs to prevent collisions.
 * If Firestore is unavailable, operations will fail fast with clear errors.
 */

import { adminDb } from "@/lib/firebase-admin";
import { getRecycledIdFromPool } from "@/lib/resumeIdRecycler";
import { logger } from "@/lib/logger";
import { ID_GENERATION } from "@/config/constants";

const { COUNTER_DOC_PATH: ID_COUNTER_DOC, MAX_NUMERIC_ID } = ID_GENERATION;

interface IdCounterDoc {
  currentId: number;
  lastResetAt?: string;
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

/**
 * Initialize the ID counter if it doesn't exist
 * Safe to call multiple times (idempotent)
 */
export const initializeIdCounter = async (): Promise<void> => {
  try {
    const counterRef = adminDb.doc(ID_COUNTER_DOC);
    const counterSnap = await counterRef.get();

    if (!counterSnap.exists) {
      logger.info("Initializing resume ID counter...");
      await counterRef.set({
        currentId: 1, // Start at 1 so next ID is 2
        lastResetAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      logger.info("Resume ID counter initialized");
    }
  } catch (error) {
    logger.error({ err: error }, "Error initializing ID counter");
    throw new IdGenerationError("Failed to initialize ID counter", error, true);
  }
};

/**
 * Generate the next numeric resume ID
 *
 * Strategy:
 * 1. First tries to get a recycled ID from the deleted IDs pool
 * 2. If pool is empty, generates a new ID from the counter
 * 3. Uses Firestore atomic increment to ensure no collisions
 *
 * SECURITY FIX: No longer falls back to random IDs on error.
 * This prevents potential data collisions and integrity issues.
 * Callers should handle errors and implement their own retry logic.
 *
 * Benefits:
 * - Reuses IDs efficiently when resumes are deleted
 * - Maximizes utilization of numeric ID space
 * - Maintains collision-free generation
 * - Fails fast on errors for proper error handling
 *
 * @returns Promise<number> - Next available numeric ID (1-99999999)
 * @throws IdGenerationError if unable to generate ID
 */
export const generateNumericResumeId = async (): Promise<number> => {
  // Step 1: Try to get a recycled ID from the pool first
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
    // Log but continue - pool is optional optimization
    logger.warn(
      { err: poolError },
      "Error checking recycled ID pool, continuing to counter"
    );
  }

  // Step 2: Generate a new ID from the counter
  try {
    const counterRef = adminDb.doc(ID_COUNTER_DOC);

    // Use a transaction to ensure atomic increment and retrieval
    // This prevents race conditions where two requests might get the same ID
    const nextId = await adminDb.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      if (!counterDoc.exists) {
        // Initialize if missing (should be rare as we check above, but good for safety)
        transaction.set(counterRef, {
          currentId: 1,
          lastResetAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        return 1;
      }

      const currentId = counterDoc.data()?.currentId || 0;
      // Skip ID 1 as it is reserved for system/demo use
      const newId = currentId === 0 ? 2 : currentId + 1;

      if (newId > MAX_NUMERIC_ID) {
        throw new IdGenerationError(
          `Maximum numeric ID limit reached: ${MAX_NUMERIC_ID}`,
          undefined,
          false // Not retryable - limit reached
        );
      }

      transaction.update(counterRef, {
        currentId: newId,
      });

      return newId;
    });

    logger.info(
      { resumeId: nextId, source: "counter" },
      "Generated numeric resume ID"
    );
    return nextId;
  } catch (error) {
    // SECURITY FIX: No longer falling back to random IDs
    // Random IDs could cause collisions and data integrity issues
    if (error instanceof IdGenerationError) {
      throw error;
    }

    logger.error({ err: error }, "Failed to generate numeric ID from counter");
    throw new IdGenerationError(
      "Failed to generate numeric ID. Please try again.",
      error,
      true // Retryable - temporary Firestore issue
    );
  }
};

/**
 * Get the current ID counter value (for debugging/monitoring)
 * @returns Promise<number> - Current counter value
 */
export const getCurrentIdCounter = async (): Promise<number> => {
  try {
    const counterRef = adminDb.doc(ID_COUNTER_DOC);
    const counterSnap = await counterRef.get();

    if (!counterSnap.exists) {
      return 0;
    }

    return (counterSnap.data() as IdCounterDoc).currentId;
  } catch (error) {
    logger.error({ err: error }, "Error getting current ID counter");
    throw new IdGenerationError(
      "Failed to get current ID counter",
      error,
      true
    );
  }
};

/**
 * Reset the ID counter (ADMIN ONLY - for testing/reset scenarios)
 * WARNING: This should only be used in development or after data migration
 *
 * @param startValue - Starting value for the new counter (default: 0)
 */
export const resetIdCounter = async (startValue: number = 0): Promise<void> => {
  try {
    const counterRef = adminDb.doc(ID_COUNTER_DOC);
    await counterRef.set({
      currentId: startValue,
      lastResetAt: new Date().toISOString(),
    });
    logger.info({ startValue }, "ID counter reset");
  } catch (error) {
    logger.error({ err: error, startValue }, "Error resetting ID counter");
    throw new IdGenerationError("Failed to reset ID counter", error, true);
  }
};
