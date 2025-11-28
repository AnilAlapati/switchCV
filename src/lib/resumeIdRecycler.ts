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

import { adminDb } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { logger } from "@/lib/logger";

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
    const poolRef = adminDb.doc(ID_POOL_DOC);
    const poolSnap = await poolRef.get();

    if (!poolSnap.exists) {
      logger.info("Initializing deleted IDs pool");
      await poolRef.set({
        deletedIds: [],
        totalRecycled: 0,
        lastUpdatedAt: new Date().toISOString(),
      });
      logger.info("Deleted IDs pool initialized");
    }
  } catch (error) {
    logger.error({ err: error }, "Error initializing ID pool");
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
    const poolRef = adminDb.doc(ID_POOL_DOC);

    // First ensure pool exists
    const poolSnap = await poolRef.get();
    if (!poolSnap.exists) {
      await initializeIdPool();
    }

    // Add ID to pool
    await poolRef.update({
      deletedIds: admin.firestore.FieldValue.arrayUnion(numericId),
      lastUpdatedAt: new Date().toISOString(),
    });

    logger.info({ numericId }, "Resume ID added to recycling pool");

    // Trim pool if it exceeds max size (keep only the most recent IDs)
    const updated = await poolRef.get();
    const poolData = updated.data() as IdPoolDoc;

    if (poolData.deletedIds.length > MAX_POOL_SIZE) {
      // Keep only the last MAX_POOL_SIZE IDs (newest)
      const trimmed = poolData.deletedIds.slice(-MAX_POOL_SIZE);
      await poolRef.set({
        deletedIds: trimmed,
        totalRecycled: (poolData.totalRecycled || 0) + 1,
        lastUpdatedAt: new Date().toISOString(),
      });
      logger.warn(
        {
          maxSize: MAX_POOL_SIZE,
          discarded: poolData.deletedIds.length - MAX_POOL_SIZE,
        },
        "ID pool trimmed to max size"
      );
    }
  } catch (error) {
    logger.error({ err: error }, "Error adding deleted ID to pool");
    // Don't throw - this is cleanup, shouldn't block resume deletion
  }
};

/**
 * Get a recycled ID from the pool if available
 *
 * Attempts to reuse a deleted resume ID. If pool is empty, returns null
 * and a new ID should be generated from the counter instead.
 *
 * Uses a transaction to ensure that an ID is claimed by exactly one request.
 *
 * @returns Promise<number | null> - A recycled ID or null if pool is empty
 */
export const getRecycledIdFromPool = async (): Promise<number | null> => {
  try {
    const poolRef = adminDb.doc(ID_POOL_DOC);

    return await adminDb.runTransaction(async (transaction) => {
      const poolSnap = await transaction.get(poolRef);

      if (!poolSnap.exists) {
        return null;
      }

      const poolData = poolSnap.data() as IdPoolDoc;

      if (!poolData.deletedIds || poolData.deletedIds.length === 0) {
        return null;
      }

      // Get the first (oldest) ID from the pool
      const recycledId = poolData.deletedIds[0];

      // Remove it from the pool
      // We use the array filter to remove it from the local copy and write back
      // This is safer than arrayRemove inside a transaction when we want to be sure WE removed it
      const newDeletedIds = poolData.deletedIds.slice(1);

      transaction.update(poolRef, {
        deletedIds: newDeletedIds,
        lastUpdatedAt: new Date().toISOString(),
      });

      logger.info(
        { recycledId, remaining: newDeletedIds.length },
        "Reusing recycled ID from pool"
      );
      return recycledId;
    });
  } catch (error) {
    logger.error({ err: error }, "Error getting recycled ID from pool");
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
    const poolRef = adminDb.doc(ID_POOL_DOC);
    const poolSnap = await poolRef.get();

    if (!poolSnap.exists) {
      return null;
    }

    return poolSnap.data() as IdPoolDoc;
  } catch (error) {
    logger.error({ err: error }, "Error getting ID pool status");
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
    const poolRef = adminDb.doc(ID_POOL_DOC);
    await poolRef.set({
      deletedIds: [],
      totalRecycled: 0,
      lastUpdatedAt: new Date().toISOString(),
    });
    logger.warn("ID pool cleared (ADMIN ACTION)");
  } catch (error) {
    logger.error({ err: error }, "Error clearing ID pool");
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
    logger.error({ err: error }, "Error getting pool stats");
    return {
      poolSize: 0,
      maxSize: MAX_POOL_SIZE,
      utilizationRate: 0,
      totalRecycled: 0,
    };
  }
};
