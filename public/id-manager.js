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
  const {
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    collection,
    writeBatch,
  } = window.firebase.firestore;
  const { db } = await import("@/lib/firebase");

  const COUNTER_DOC = "system/resumeIdCounter";
  const SHARDS_COLLECTION = `${COUNTER_DOC}/shards`;
  const POOL_DOC = "system/deletedIdsPool";
  const SHARD_COUNT = 16;

  const shardStatePayload = (shardId, startValue = 0) => ({
    shardId,
    nextId: startValue + shardId + 1,
    lastIssued: startValue,
    updatedAt: new Date().toISOString(),
  });

  async function getShardStats() {
    const snap = await getDocs(collection(db, SHARDS_COLLECTION));
    if (snap.empty) {
      return [];
    }
    return snap.docs.map((shardDoc) => shardDoc.data());
  }

  async function resetShards(startValue = 0) {
    const batch = writeBatch(db);
    for (let shardId = 0; shardId < SHARD_COUNT; shardId += 1) {
      const shardRef = doc(db, `${SHARDS_COLLECTION}/${shardId}`);
      batch.set(shardRef, shardStatePayload(shardId, startValue), {
        merge: true,
      });
    }
    await batch.commit();
  }

  window.switchCVIdManager = {
    async checkStatus() {
      console.log("\n📊 === Resume ID System Status ===\n");

      try {
        const counterSnap = await getDoc(doc(db, COUNTER_DOC));
        if (counterSnap.exists()) {
          const data = counterSnap.data();
          console.log("✅ Counter Metadata:");
          console.log(`   Created: ${data.createdAt || "n/a"}`);
          console.log(`   Last Reset: ${data.lastResetAt || "n/a"}`);
          console.log(`   Description: ${data.description || "(none)"}`);
        } else {
          console.log("❌ Counter doesn't exist");
        }

        const shards = await getShardStats();
        console.log("\n📦 Shards:");
        if (shards.length === 0) {
          console.log("   No shards found. Run resetCounter().");
        } else {
          const highestIssued = Math.max(
            ...shards.map((shard) => shard.lastIssued || 0)
          );
          console.log(`   Total shards: ${shards.length}`);
          console.log(`   Highest issued ID: ${highestIssued}`);
          console.log(
            "   Sample shards:",
            shards.slice(0, 3).map((shard) => ({
              shardId: shard.shardId,
              nextId: shard.nextId,
              lastIssued: shard.lastIssued,
            }))
          );
        }

        const poolSnap = await getDoc(doc(db, POOL_DOC));
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
        await setDoc(
          doc(db, COUNTER_DOC),
          {
            lastResetAt: new Date().toISOString(),
            resetTo: 0,
          },
          { merge: true }
        );
        await resetShards(0);
        console.log("✅ Counter reset successfully!");
        console.log("Shards ready for allocation\n");
      } catch (error) {
        console.error("❌ Error resetting counter:", error);
      }
    },

    async clearPool() {
      console.log("♻️  Clearing ID pool...");
      try {
        const poolSnap = await getDoc(doc(db, POOL_DOC));
        if (poolSnap.exists()) {
          await updateDoc(doc(db, POOL_DOC), {
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
        console.log("   Resetting counter and shards...");
        await this.resetCounter();

        console.log("   Clearing pool...");
        await updateDoc(doc(db, POOL_DOC), {
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
  → Resets sharded counter metadata to 0
  → Reinitializes all shard documents

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
