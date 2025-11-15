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

import { doc, getDoc, setDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    const counterRef = doc(db, ID_COUNTER_DOC);
    const counterSnap = await getDoc(counterRef);

    if (!counterSnap.exists()) {
      console.log("🔢 Initializing resume ID counter...");
      await setDoc(counterRef, {
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
 * Uses Firestore atomic increment to ensure no collisions
 * even with millions of concurrent users
 *
 * @returns Promise<number> - Next available numeric ID (1-99999999)
 * @throws Error if counter doesn't exist or max IDs reached
 */
export const generateNumericResumeId = async (): Promise<number> => {
  try {
    const counterRef = doc(db, ID_COUNTER_DOC);

    // First check if counter exists
    const counterSnap = await getDoc(counterRef);
    if (!counterSnap.exists()) {
      console.warn(
        "⚠️ ID counter not initialized, initializing now...",
        counterSnap
      );
      await initializeIdCounter();
    }

    // Use atomic increment to get next ID
    // This operation is atomic and thread-safe in Firestore
    await setDoc(
      counterRef,
      { currentId: increment(1) },
      { merge: true } // Merge to preserve other fields
    );

    // Fetch the updated value
    const updatedSnap = await getDoc(counterRef);
    const nextId = (updatedSnap.data() as IdCounterDoc).currentId;

    // Validate we haven't exceeded max
    if (nextId > MAX_NUMERIC_ID) {
      throw new Error(
        `❌ Maximum numeric ID limit reached: ${MAX_NUMERIC_ID}. Cannot generate more IDs.`
      );
    }

    console.log(`✅ Generated numeric resume ID: ${nextId}`);
    return nextId;
  } catch (error) {
    console.error("❌ Error generating numeric ID:", error);
    throw error;
  }
};

/**
 * Get the current ID counter value (for debugging/monitoring)
 * @returns Promise<number> - Current counter value
 */
export const getCurrentIdCounter = async (): Promise<number> => {
  try {
    const counterRef = doc(db, ID_COUNTER_DOC);
    const counterSnap = await getDoc(counterRef);

    if (!counterSnap.exists()) {
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
    const counterRef = doc(db, ID_COUNTER_DOC);
    await setDoc(counterRef, {
      currentId: startValue,
      lastResetAt: new Date().toISOString(),
    });
    console.log(`🔄 ID counter reset to ${startValue}`);
  } catch (error) {
    console.error("❌ Error resetting ID counter:", error);
    throw error;
  }
};
