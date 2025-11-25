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

    console.log("📊 === ID Counter Status ===");
    if (counterSnap.exists()) {
      const counterData = counterSnap.data();
      console.log("✅ Counter exists:");
      console.log("   Current ID:", counterData.currentId);
      console.log("   Created At:", counterData.createdAt);
      console.log("   Last Reset:", counterData.lastResetAt);
    } else {
      console.log("❌ Counter doesn't exist");
    }

    // Check pool
    const poolRef = doc(db, ID_POOL_DOC);
    const poolSnap = await getDoc(poolRef);

    console.log("\n♻️ === Deleted IDs Pool Status ===");
    if (poolSnap.exists()) {
      const poolData = poolSnap.data();
      console.log("✅ Pool exists:");
      console.log("   Recycled IDs count:", poolData.deletedIds?.length || 0);
      console.log("   Total recycled:", poolData.totalRecycled || 0);
      if (poolData.deletedIds && poolData.deletedIds.length > 0) {
        console.log("   First 10 IDs:", poolData.deletedIds.slice(0, 10));
      }
    } else {
      console.log("❌ Pool doesn't exist");
    }
  } catch (error) {
    console.error("❌ Error checking ID status:", error);
  }
}

/**
 * Reset the counter to 0 (CAREFUL - only use if needed)
 */
export async function resetCounter() {
  try {
    console.log("⚠️ Resetting counter to 0...");
    const counterRef = doc(db, ID_COUNTER_DOC);
    await setDoc(counterRef, {
      currentId: 0,
      lastResetAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    console.log("✅ Counter reset to 0");
  } catch (error) {
    console.error("❌ Error resetting counter:", error);
  }
}

// Run check on import if in Node environment
if (typeof window === "undefined") {
  checkIdStatus();
}
