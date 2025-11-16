/**
 * Reset ID System to Start Fresh
 *
 * This script resets the counter to 0 and clears the recycled ID pool
 * so that new resumes will get IDs: 1, 2, 3, 4... in sequential order
 *
 * Run this once to clean up old test data
 */

import { doc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ID_COUNTER_DOC = "system/resumeIdCounter";
const ID_POOL_DOC = "system/deletedIdsPool";

export async function resetIdSystemToSequential() {
  console.log("🔄 === Resetting ID System for Sequential Generation ===\n");

  try {
    // Step 1: Reset counter to 0
    console.log("Step 1: Resetting counter to 0...");
    const counterRef = doc(db, ID_COUNTER_DOC);
    await setDoc(counterRef, {
      currentId: 0,
      lastResetAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    console.log("✅ Counter reset: currentId = 0");
    console.log("   (First resume will get ID: 1)\n");

    // Step 2: Clear the recycled ID pool
    console.log("Step 2: Clearing recycled ID pool...");
    const poolRef = doc(db, ID_POOL_DOC);
    try {
      await updateDoc(poolRef, {
        deletedIds: [],
        lastUpdatedAt: new Date().toISOString(),
      });
      console.log("✅ Pool cleared: deletedIds = []\n");
    } catch (error) {
      // Pool might not exist yet, try creating it
      if ((error as any).code === "not-found") {
        console.log(
          "   (Pool doesn't exist yet, will be created on first deletion)\n"
        );
      } else {
        throw error;
      }
    }

    console.log("🎉 === ID System Reset Complete ===");
    console.log("\n📊 Expected behavior:");
    console.log("   Resume 1: Gets ID 1");
    console.log("   Resume 2: Gets ID 2");
    console.log("   Resume 3: Gets ID 3");
    console.log("   ...");
    console.log("   Delete Resume 2: ID 2 goes to pool");
    console.log("   Resume 4: Gets ID 4 (not 2, because pool is empty)");
    console.log("   Delete Resume 1: ID 1 goes to pool");
    console.log("   Resume 5: Gets ID 1 (FIFO reuse from pool)\n");

    return true;
  } catch (error) {
    console.error("❌ Error resetting ID system:", error);
    throw error;
  }
}

// Export for use in browser
if (typeof window !== "undefined") {
  (window as any).resetIdSystem = resetIdSystemToSequential;
  console.log("✅ resetIdSystem available in window");
  console.log("   Run: await window.resetIdSystem()");
}
