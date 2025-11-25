/**
 * Browser Console Utility for managing Resume IDs
 * 
 * Paste this entire file's contents into the browser console on any page
 * Then call:
 *   switchCVIdManager.checkStatus()
 *   switchCVIdManager.resetCounter()
 *   switchCVIdManager.clearPool()
 *   switchCVIdManager.fullReset()
 */

(async function() {
  // Import Firebase functions
  const { doc, getDoc, setDoc, updateDoc } = window.firebase.firestore;
  const { db } = await import("@/lib/firebase");

  window.switchCVIdManager = {
    async checkStatus() {
      console.log("\n📊 === Resume ID System Status ===\n");

      try {
        // Check counter
        const counterSnap = await getDoc(doc(db, "system/resumeIdCounter"));
        if (counterSnap.exists()) {
          const data = counterSnap.data();
          console.log("✅ Counter Document:");
          console.log(`   Current ID: ${data.currentId}`);
          console.log(`   Created: ${data.createdAt}`);
          console.log(`   Last Reset: ${data.lastResetAt}`);
        } else {
          console.log("❌ Counter doesn't exist");
        }

        // Check pool
        const poolSnap = await getDoc(doc(db, "system/deletedIdsPool"));
        console.log("\n♻️  Recycled IDs Pool:");
        if (poolSnap.exists()) {
          const poolData = poolSnap.data();
          const poolSize = poolData.deletedIds?.length || 0;
          console.log(`   Pool Size: ${poolSize}`);
          console.log(`   Total Recycled: ${poolData.totalRecycled || 0}`);
          if (poolSize > 0) {
            console.log(
              `   First 10 IDs: ${poolData.deletedIds.slice(0, 10).join(", ")}`
            );
            console.log(
              `   Last 10 IDs: ${poolData.deletedIds
                .slice(-10)
                .join(", ")}`
            );
          }
        } else {
          console.log("   Pool doesn't exist (will be created on first ID deletion)");
        }

        console.log("\n");
      } catch (error) {
        console.error("❌ Error checking status:", error);
      }
    },

    async resetCounter() {
      console.log("⚠️  Resetting counter to 0...");
      try {
        await setDoc(doc(db, "system/resumeIdCounter"), {
          currentId: 0,
          lastResetAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        console.log("✅ Counter reset successfully!");
        console.log("Next resume will get ID: 1\n");
      } catch (error) {
        console.error("❌ Error resetting counter:", error);
      }
    },

    async clearPool() {
      console.log("♻️  Clearing ID pool...");
      try {
        const poolSnap = await getDoc(doc(db, "system/deletedIdsPool"));
        if (poolSnap.exists()) {
          await updateDoc(doc(db, "system/deletedIdsPool"), {
            deletedIds: [],
            lastUpdatedAt: new Date().toISOString(),
          });
          console.log("✅ ID pool cleared successfully!\n");
        } else {
          console.log("Pool doesn't exist yet\n");
        }
      } catch (error) {
        console.error("❌ Error clearing pool:", error);
      }
    },

    async fullReset() {
      console.log("🔄 Performing full ID system reset...\n");
      try {
        // Reset counter
        console.log("   Resetting counter...");
        await setDoc(doc(db, "system/resumeIdCounter"), {
          currentId: 0,
          lastResetAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });

        // Clear pool
        console.log("   Clearing pool...");
        await updateDoc(doc(db, "system/deletedIdsPool"), {
          deletedIds: [],
          lastUpdatedAt: new Date().toISOString(),
        });

        console.log("\n✅ Full reset complete!");
        console.log("Next resume will get ID: 1\n");
      } catch (error) {
        console.error("❌ Error during reset:", error);
      }
    },

    help() {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║         Resume ID Manager - Available Commands             ║
╚════════════════════════════════════════════════════════════╝

switchCVIdManager.checkStatus()
  → Shows current counter value and recycled IDs pool size

switchCVIdManager.resetCounter()
  → Resets the counter to 0
  → Next resume will get ID: 1

switchCVIdManager.clearPool()
  → Clears the recycled IDs pool
  → New resumes will generate sequentially

switchCVIdManager.fullReset()
  → Resets counter AND clears pool
  → Complete system reset

Example usage:
  switchCVIdManager.checkStatus()
  switchCVIdManager.fullReset()
      `);
    },
  };

  console.log("✅ Resume ID Manager loaded!");
  console.log("Type: switchCVIdManager.help() for commands\n");
})();
