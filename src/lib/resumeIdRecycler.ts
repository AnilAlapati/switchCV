/**
 * Resume ID Recycler Service
 *
 * Manages the reuse of numeric resume IDs when resumes are deleted.
 * Instead of losing IDs after deletion, they go into a pool and can be reassigned
 * to new users. This allows efficient ID space utilization.
 *
 * Architecture:
 * - Maintains a "deletedIds" pool in Firestore
 * - When a resume is deleted, its numeric ID is added to the pool
 * - When a new resume is created, it first tries to use an ID from the pool
 * - If pool is empty, generates a new ID from the counter
 *
 * Benefits:
 * - Maximizes utilization of numeric ID space
 * - Recycles IDs efficiently
 * - No performance penalty
 * - Maintains sequential generation when pool is empty
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const ID_POOL_DOC = "system/deletedIdsPool";
const MAX_POOL_SIZE = 10000; // Maximum number of recycled IDs to keep

interface IdPoolDoc {
  deletedIds: number[];
  totalRecycled: number;
  lastUpdatedAt: string;
}

/**
 * Initialize the deleted IDs pool if it doesn't exist
 * Safe to call multiple times (idempotent)
 */
export const initializeIdPool = async (): Promise<void> => {
  try {
    const poolRef = doc(db, ID_POOL_DOC);
    const poolSnap = await getDoc(poolRef);

    if (!poolSnap.exists()) {
      console.log("♻️ Initializing deleted IDs pool...");
      await setDoc(poolRef, {
        deletedIds: [],
        totalRecycled: 0,
        lastUpdatedAt: new Date().toISOString(),
      });
      console.log("✅ Deleted IDs pool initialized");
    }
  } catch (error) {
    console.error("❌ Error initializing ID pool:", error);
    throw new Error("Failed to initialize ID pool");
  }
};

/**
 * Add a deleted resume ID to the recycling pool
 *
 * Called when a resume is deleted to make its numeric ID available for reuse.
 * If pool exceeds max size, oldest IDs are discarded.
 *
 * @param numericId - The numeric ID of the deleted resume
 * @returns Promise<void>
 */
export const addDeletedIdToPool = async (numericId: number): Promise<void> => {
  try {
    const poolRef = doc(db, ID_POOL_DOC);

    // First ensure pool exists
    const poolSnap = await getDoc(poolRef);
    if (!poolSnap.exists()) {
      await initializeIdPool();
    }

    // Add ID to pool
    await updateDoc(poolRef, {
      deletedIds: arrayUnion(numericId),
      lastUpdatedAt: new Date().toISOString(),
    });

    console.log(`♻️ Resume ID ${numericId} added to recycling pool`);

    // Trim pool if it exceeds max size (keep only the most recent IDs)
    const updated = await getDoc(poolRef);
    const poolData = updated.data() as IdPoolDoc;

    if (poolData.deletedIds.length > MAX_POOL_SIZE) {
      // Keep only the last MAX_POOL_SIZE IDs (newest)
      const trimmed = poolData.deletedIds.slice(-MAX_POOL_SIZE);
      await setDoc(poolRef, {
        deletedIds: trimmed,
        totalRecycled: (poolData.totalRecycled || 0) + 1,
        lastUpdatedAt: new Date().toISOString(),
      });
      console.log(
        `⚠️ ID pool trimmed to ${MAX_POOL_SIZE} IDs (discarded ${
          poolData.deletedIds.length - MAX_POOL_SIZE
        } oldest)`
      );
    }
  } catch (error) {
    console.error("❌ Error adding deleted ID to pool:", error);
    // Don't throw - this is cleanup, shouldn't block resume deletion
  }
};

/**
 * Get a recycled ID from the pool if available
 *
 * Attempts to reuse a deleted resume ID. If pool is empty, returns null
 * and a new ID should be generated from the counter instead.
 *
 * @returns Promise<number | null> - A recycled ID or null if pool is empty
 */
export const getRecycledIdFromPool = async (): Promise<number | null> => {
  try {
    const poolRef = doc(db, ID_POOL_DOC);
    const poolSnap = await getDoc(poolRef);

    if (!poolSnap.exists()) {
      console.log("📦 ID pool doesn't exist, will generate new ID");
      return null;
    }

    const poolData = poolSnap.data() as IdPoolDoc;

    if (!poolData.deletedIds || poolData.deletedIds.length === 0) {
      console.log("📦 ID pool is empty, will generate new ID");
      return null;
    }

    // Get the first (oldest) ID from the pool
    const recycledId = poolData.deletedIds[0];

    // Remove it from the pool
    await updateDoc(poolRef, {
      deletedIds: arrayRemove(recycledId),
      lastUpdatedAt: new Date().toISOString(),
    });

    console.log(
      `♻️ Reusing recycled ID: ${recycledId} (${
        poolData.deletedIds.length - 1
      } IDs remaining in pool)`
    );
    return recycledId;
  } catch (error) {
    console.error("❌ Error getting recycled ID from pool:", error);
    return null; // Return null so caller generates new ID
  }
};

/**
 * Get the current state of the ID pool (for monitoring/debugging)
 *
 * @returns Promise<IdPoolDoc | null> - Pool data or null if doesn't exist
 */
export const getIdPoolStatus = async (): Promise<IdPoolDoc | null> => {
  try {
    const poolRef = doc(db, ID_POOL_DOC);
    const poolSnap = await getDoc(poolRef);

    if (!poolSnap.exists()) {
      return null;
    }

    return poolSnap.data() as IdPoolDoc;
  } catch (error) {
    console.error("❌ Error getting ID pool status:", error);
    return null;
  }
};

/**
 * Clear the entire ID pool (ADMIN ONLY - for reset scenarios)
 *
 * WARNING: This should only be used in development or special cases
 */
export const clearIdPool = async (): Promise<void> => {
  try {
    const poolRef = doc(db, ID_POOL_DOC);
    await setDoc(poolRef, {
      deletedIds: [],
      totalRecycled: 0,
      lastUpdatedAt: new Date().toISOString(),
    });
    console.log("🗑️ ID pool cleared (ADMIN ACTION)");
  } catch (error) {
    console.error("❌ Error clearing ID pool:", error);
    throw error;
  }
};

/**
 * Get pool statistics (for analytics/monitoring)
 *
 * @returns Promise<{ poolSize: number; maxSize: number; utilizationRate: number }>
 */
export const getIdPoolStats = async (): Promise<{
  poolSize: number;
  maxSize: number;
  utilizationRate: number;
  totalRecycled: number;
}> => {
  try {
    const poolData = await getIdPoolStatus();

    if (!poolData) {
      return {
        poolSize: 0,
        maxSize: MAX_POOL_SIZE,
        utilizationRate: 0,
        totalRecycled: 0,
      };
    }

    return {
      poolSize: poolData.deletedIds?.length || 0,
      maxSize: MAX_POOL_SIZE,
      utilizationRate:
        ((poolData.deletedIds?.length || 0) / MAX_POOL_SIZE) * 100,
      totalRecycled: poolData.totalRecycled || 0,
    };
  } catch (error) {
    console.error("❌ Error getting pool stats:", error);
    return {
      poolSize: 0,
      maxSize: MAX_POOL_SIZE,
      utilizationRate: 0,
      totalRecycled: 0,
    };
  }
};
