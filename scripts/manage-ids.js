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
const ID_POOL_DOC = "system/deletedIdsPool";

async function checkStatus() {
  console.log("\n📊 === Checking ID System Status ===\n");

  try {
    const counterRef = db.doc(ID_COUNTER_DOC);
    const counterSnap = await counterRef.get();

    if (counterSnap.exists) {
      const data = counterSnap.data();
      console.log("✅ Counter Document:");
      console.log(`   Current ID: ${data.currentId}`);
      console.log(`   Created: ${data.createdAt}`);
      console.log(`   Last Reset: ${data.lastResetAt}`);
    } else {
      console.log("❌ Counter document doesn't exist");
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
    // Reset counter
    console.log("Resetting counter to 0...");
    await db.doc(ID_COUNTER_DOC).set({
      currentId: 0,
      lastResetAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    console.log("✅ Counter reset");

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
    console.log(
      "Available commands: check, reset, clear-pool"
    );
}

process.exit(0);
