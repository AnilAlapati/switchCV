import { logger } from "@/lib/logger";
/**
 * Utility to check and manage the numeric ID counter
 * Run this from the terminal to debug ID generation issues
 */

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ID_COUNTER_DOC = "system/resumeIdCounter";
const ID_POOL_DOC = "system/deletedIdsPool";

/**
 * Check the current state of the ID counter and pool
 */
export async function checkIdStatus() {
  try {
    // Check counter
    const counterRef = doc(db, ID_COUNTER_DOC);
    const counterSnap = await getDoc(counterRef);

    logger.info("📊 === ID Counter Status ===");
    if (counterSnap.exists()) {
      const counterData = counterSnap.data();
      logger.info("✅ Counter exists:");
      logger.info("   Current ID:", counterData.currentId);
      logger.info("   Created At:", counterData.createdAt);
      logger.info("   Last Reset:", counterData.lastResetAt);
    } else {
      logger.info("❌ Counter doesn't exist");
    }

    // Check pool
    const poolRef = doc(db, ID_POOL_DOC);
    const poolSnap = await getDoc(poolRef);

    logger.info("\n♻️ === Deleted IDs Pool Status ===");
    if (poolSnap.exists()) {
      const poolData = poolSnap.data();
      logger.info("✅ Pool exists:");
      logger.info("   Recycled IDs count:", poolData.deletedIds?.length || 0);
      logger.info("   Total recycled:", poolData.totalRecycled || 0);
      if (poolData.deletedIds && poolData.deletedIds.length > 0) {
        logger.info("   First 10 IDs:", poolData.deletedIds.slice(0, 10));
      }
    } else {
      logger.info("❌ Pool doesn't exist");
    }
  } catch (error) {
    logger.error({ err: error }, "❌ Error checking ID status:");
  }
}

/**
 * Reset the counter to 0 (CAREFUL - only use if needed)
 */
export async function resetCounter() {
  try {
    logger.info("⚠️ Resetting counter to 0...");
    const counterRef = doc(db, ID_COUNTER_DOC);
    await setDoc(counterRef, {
      currentId: 0,
      lastResetAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    logger.info("✅ Counter reset to 0");
  } catch (error) {
    logger.error({ err: error }, "❌ Error resetting counter:");
  }
}

// Run check on import if in Node environment
if (typeof window === "undefined") {
  checkIdStatus();
}
