import { logger } from "@/lib/logger";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  collection,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ID_GENERATION } from "@/config/constants";

const ID_COUNTER_DOC = "system/resumeIdCounter";
const ID_SHARDS_COLLECTION = `${ID_COUNTER_DOC}/shards`;
const ID_POOL_DOC = "system/deletedIdsPool";

const shardStatePayload = (shardId: number, startValue = 0) => ({
  shardId,
  nextId: startValue + shardId + 1,
  lastIssued: startValue,
  updatedAt: new Date().toISOString(),
});

/**
 * Check the current state of the ID counter and pool
 */
export async function checkIdStatus() {
  try {
    const counterRef = doc(db, ID_COUNTER_DOC);
    const counterSnap = await getDoc(counterRef);

    logger.info("📊 === ID Counter Status ===");
    if (counterSnap.exists()) {
      const counterData = counterSnap.data();
      logger.info("✅ Counter exists:");
      logger.info({ createdAt: counterData.createdAt }, "   Created At:");
      logger.info({ lastResetAt: counterData.lastResetAt }, "   Last Reset:");
      logger.info({ description: counterData.description }, "   Description:");
    } else {
      logger.info("❌ Counter doesn't exist");
    }

    const shardSnapshot = await getDocs(collection(db, ID_SHARDS_COLLECTION));
    if (!shardSnapshot.empty) {
      const shardData = shardSnapshot.docs.map((docSnap) => docSnap.data());
      const highestIssued = Math.max(
        ...shardData.map((shard) => shard.lastIssued || 0)
      );
      logger.info("📦 Shard Overview:");
      logger.info({ totalShards: shardData.length }, "   Total shards:");
      logger.info({ highestIssued }, "   Highest issued ID:");
      logger.info({ sampleShard: shardData[0] }, "   Sample shard:");
    } else {
      logger.info("⚠️  No shard documents found");
    }

    const poolRef = doc(db, ID_POOL_DOC);
    const poolSnap = await getDoc(poolRef);

    logger.info("\n♻️ === Deleted IDs Pool Status ===");
    if (poolSnap.exists()) {
      const poolData = poolSnap.data();
      logger.info("✅ Pool exists:");
      logger.info({ count: poolData.deletedIds?.length || 0 }, "   Recycled IDs count:");
      logger.info({ total: poolData.totalRecycled || 0 }, "   Total recycled:");
      if (poolData.deletedIds && poolData.deletedIds.length > 0) {
        logger.info({ ids: poolData.deletedIds.slice(0, 10) }, "   First 10 IDs:");
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
    await setDoc(
      counterRef,
      {
        lastResetAt: new Date().toISOString(),
        resetTo: 0,
      },
      { merge: true }
    );

    const batch = writeBatch(db);
    for (let shardId = 0; shardId < ID_GENERATION.SHARD_COUNT; shardId += 1) {
      const shardRef = doc(db, `${ID_SHARDS_COLLECTION}/${shardId}`);
      batch.set(shardRef, shardStatePayload(shardId), { merge: true });
    }
    await batch.commit();
    logger.info("✅ Counter reset to 0");
  } catch (error) {
    logger.error({ err: error }, "❌ Error resetting counter:");
  }
}

// Run check on import if in Node environment
if (typeof window === "undefined") {
  checkIdStatus();
}
