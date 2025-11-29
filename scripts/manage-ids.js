#!/usr/bin/env node

/**
 * Script to manage resume ID system for development
 * 
 * Usage:
 *   node scripts/manage-ids.js check    - Check counter and pool status
 *   node scripts/manage-ids.js reset    - Reset counter to 0 and clear pool
 *   node scripts/manage-ids.js clear-pool - Just clear the ID pool
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin SDK
const app = initializeApp({
  credential: cert(
    path.join(__dirname, "../path-to-serviceAccountKey.json")
  ),
});

const db = getFirestore(app);

const ID_COUNTER_DOC = "system/resumeIdCounter";
const ID_SHARDS_COLLECTION = `${ID_COUNTER_DOC}/shards`;
const ID_POOL_DOC = "system/deletedIdsPool";
const SHARD_COUNT = 16;

const shardStatePayload = (shardId, startValue = 0) => ({
  shardId,
  nextId: startValue + shardId + 1,
  lastIssued: startValue,
  updatedAt: new Date().toISOString(),
});

async function checkStatus() {
  console.log("\n📊 === Checking ID System Status ===\n");

  try {
    const counterRef = db.doc(ID_COUNTER_DOC);
    const counterSnap = await counterRef.get();

    if (counterSnap.exists) {
      const data = counterSnap.data();
      console.log("✅ Counter Metadata:");
      console.log(`   Created: ${data.createdAt || "n/a"}`);
      console.log(`   Last Reset: ${data.lastResetAt || "n/a"}`);
      console.log(`   Description: ${data.description || "(none)"}`);
    } else {
      console.log("❌ Counter document doesn't exist");
    }

    const shardSnap = await db.collection(ID_SHARDS_COLLECTION).get();
    console.log("\n📦 Shard Details:");
    if (shardSnap.empty) {
      console.log("   No shards found. Run reset or init script.");
    } else {
      const shardData = shardSnap.docs.map((doc) => doc.data());
      const highestIssued = Math.max(
        ...shardData.map((shard) => shard.lastIssued || 0)
      );
      console.log(`   Total shards: ${shardData.length}`);
      console.log(`   Highest issued ID: ${highestIssued}`);
      console.log(
        "   Sample shard:",
        shardData.slice(0, 3).map((shard) => ({
          shardId: shard.shardId,
          lastIssued: shard.lastIssued,
          nextId: shard.nextId,
        }))
      );
    }

    const poolRef = db.doc(ID_POOL_DOC);
    const poolSnap = await poolRef.get();

    console.log("\n♻️  Recycled IDs Pool:");
    if (poolSnap.exists) {
      const poolData = poolSnap.data();
      console.log(`   Pool Size: ${poolData.deletedIds?.length || 0}`);
      console.log(`   Total Recycled: ${poolData.totalRecycled || 0}`);
      if (poolData.deletedIds?.length > 0) {
        console.log(
          `   First 10 IDs: ${poolData.deletedIds.slice(0, 10).join(", ")}`
        );
      }
    } else {
      console.log("   Pool doesn't exist");
    }

    console.log("\n");
  } catch (error) {
    console.error("❌ Error checking status:", error.message);
  }
}

async function resetIds() {
  console.log("\n⚠️  === Resetting ID System ===\n");

  try {
    console.log("Resetting metadata and shards to 0...");
    await db.doc(ID_COUNTER_DOC).set(
      {
        lastResetAt: new Date().toISOString(),
        resetTo: 0,
      },
      { merge: true }
    );

    const batch = db.batch();
    for (let shardId = 0; shardId < SHARD_COUNT; shardId += 1) {
      const shardRef = db.collection(ID_SHARDS_COLLECTION).doc(String(shardId));
      batch.set(shardRef, shardStatePayload(shardId), { merge: true });
    }
    await batch.commit();
    console.log("✅ Shards reset");

    // Clear pool
    console.log("Clearing ID pool...");
    await db.doc(ID_POOL_DOC).set({
      deletedIds: [],
      totalRecycled: 0,
      lastUpdatedAt: new Date().toISOString(),
    });
    console.log("✅ Pool cleared");

    console.log("\n🎉 ID System reset complete!\n");
  } catch (error) {
    console.error("❌ Error resetting IDs:", error.message);
  }
}

async function clearPool() {
  console.log("\n♻️  === Clearing ID Pool ===\n");

  try {
    const poolRef = db.doc(ID_POOL_DOC);
    const poolSnap = await poolRef.get();

    if (poolSnap.exists) {
      const poolData = poolSnap.data();
      console.log(`Clearing ${poolData.deletedIds?.length || 0} IDs...`);

      await poolRef.update({
        deletedIds: [],
        lastUpdatedAt: new Date().toISOString(),
      });
      console.log("✅ Pool cleared\n");
    } else {
      console.log("Pool doesn't exist\n");
    }
  } catch (error) {
    console.error("❌ Error clearing pool:", error.message);
  }
}

// Main
const command = process.argv[2] || "check";

switch (command) {
  case "check":
    await checkStatus();
    break;
  case "reset":
    await resetIds();
    break;
  case "clear-pool":
    await clearPool();
    break;
  default:
    console.log("Unknown command:", command);
    console.log("Available commands: check, reset, clear-pool");
}

process.exit(0);
