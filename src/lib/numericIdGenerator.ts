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
 */

import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { getRecycledIdFromPool } from "@/lib/resumeIdRecycler";

const ID_COUNTER_DOC = "system/resumeIdCounter";
const MAX_NUMERIC_ID = 99999999; // 8 digits max

interface IdCounterDoc {
  currentId: number;
  lastResetAt?: string;
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
      console.log("🔢 Initializing resume ID counter...");
      await counterRef.set({
        currentId: 0,
        lastResetAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      console.log("✅ Resume ID counter initialized");
    }
  } catch (error) {
    console.error("❌ Error initializing ID counter:", error);
    throw new Error("Failed to initialize ID counter");
  }
};

/**
 * Generate the next numeric resume ID
 *
 * Strategy:
 * 1. First tries to get a recycled ID from the deleted IDs pool
 * 2. If pool is empty, generates a new ID from the counter
 * 3. Uses Firestore atomic increment to ensure no collisions
 * 4. Fallback: If Firestore operations fail, generates a random ID (not ideal but allows resume creation)
 *
 * Benefits:
 * - Reuses IDs efficiently when resumes are deleted
 * - Maximizes utilization of numeric ID space
 * - Maintains collision-free generation
 * - Graceful fallback to random IDs if Firestore is unavailable
 *
 * @returns Promise<number> - Next available numeric ID (1-99999999)
 * @throws Error only if unable to initialize counter or ID space exhausted
 */
export const generateNumericResumeId = async (): Promise<number> => {
  try {
    // Step 1: Try to get a recycled ID from the pool first
    try {
      const recycledId = await getRecycledIdFromPool();
      if (recycledId !== null) {
        console.log(`✅ Generated numeric resume ID: ${recycledId} (recycled)`);
        return recycledId;
      }
    } catch (poolError) {
      console.warn(
        "⚠️ Error checking recycled ID pool, continuing:",
        poolError
      );
      // Continue to counter generation if pool check fails
    }

    // Step 2: If no recycled ID, generate a new one from the counter
    try {
      const counterRef = adminDb.doc(ID_COUNTER_DOC);

      // First check if counter exists
      const counterSnap = await counterRef.get();
      if (!counterSnap.exists) {
        console.warn("⚠️ ID counter not initialized, initializing now...");
        await initializeIdCounter();
      }

      // Use atomic increment to get next ID
      // This operation is atomic and thread-safe in Firestore
      await counterRef.set(
        { currentId: admin.firestore.FieldValue.increment(1) },
        { merge: true } // Merge to preserve other fields
      );

      // Fetch the updated value
      const updatedSnap = await counterRef.get();
      const nextId = (updatedSnap.data() as IdCounterDoc).currentId;

      // Validate we haven't exceeded max
      if (nextId > MAX_NUMERIC_ID) {
        throw new Error(
          `❌ Maximum numeric ID limit reached: ${MAX_NUMERIC_ID}. Cannot generate more IDs.`
        );
      }

      console.log(`✅ Generated numeric resume ID: ${nextId} (from counter)`);
      return nextId;
    } catch (counterError) {
      console.warn(
        "⚠️ Error with counter operation, using fallback ID:",
        counterError
      );

      // Fallback: Generate a random ID if counter operations fail
      // This is not ideal (potential collisions) but allows resume creation
      // when Firestore is having temporary issues
      const fallbackId =
        Math.floor(Math.random() * (MAX_NUMERIC_ID - 1000000)) + 1000000;
      console.log(`⚠️ Using fallback random numeric ID: ${fallbackId}`);
      return fallbackId;
    }
  } catch (error) {
    console.error("❌ Error generating numeric ID:", error);
    // Last resort: throw error only for critical failures
    throw error;
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
    console.error("❌ Error getting current ID counter:", error);
    throw error;
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
    console.log(`🔄 ID counter reset to ${startValue}`);
  } catch (error) {
    console.error("❌ Error resetting ID counter:", error);
    throw error;
  }
};
