#!/usr/bin/env node

/**
 * Initialize Firestore System Collection
 * 
 * Usage:
 * node scripts/init-system.js
 * 
 * This script initializes the sharded numeric ID counter. It creates the
 * system/resumeIdCounter metadata document along with a shards subcollection
 * so the distributed ID generator can fan out write load safely.
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(
  __dirname,
  "../firebase-service-account.json"
);

// Parse command line arguments for --project
const args = process.argv.slice(2);
const projectArgIndex = args.indexOf('--project');
const projectOverride = projectArgIndex !== -1 ? args[projectArgIndex + 1] : null;

let serviceAccount;
let projectId;

try {
  serviceAccount = require(serviceAccountPath);
  projectId = projectOverride || serviceAccount.project_id;
  console.log("🔑 Found service account key file.");
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: projectId,
  });
} catch {
  console.log("⚠️ Service account key not found. Trying Application Default Credentials...");
  projectId = projectOverride || "switchcv-e5136"; // Default project ID
  
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: projectId,
    });
    console.log("✅ Initialized with Application Default Credentials.");
  } catch {
    console.error("\n❌ Authentication Failed");
    console.error("Could not authenticate using either Service Account Key or Application Default Credentials.");
    console.error("\nPlease refer to: docs/setup/admin-scripts-authentication.md");
    console.error("\nQuick Fix (Recommended):");
    console.error("Run: gcloud auth application-default login");
    process.exit(1);
  }
}

const db = admin.firestore();
const SHARD_COUNT = 16;
const COUNTER_DOC_PATH = "system/resumeIdCounter";
const SHARDS_COLLECTION_PATH = `${COUNTER_DOC_PATH}/shards`;

const initialShardPayload = (shardId, startValue = 0) => ({
  shardId,
  nextId: startValue + shardId + 1,
  lastIssued: startValue,
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});

async function initializeSystem() {
  try {
    console.log("🔧 Initializing System Collection...");
    console.log("📍 Project:", projectId);

    const counterRef = db.doc(COUNTER_DOC_PATH);
    const counterSnap = await counterRef.get();

    if (counterSnap.exists) {
      console.log("✅ System metadata already exists!");
      const data = counterSnap.data();
      console.log("   Created:", data?.createdAt || "n/a");
      console.log("   Last Reset:", data?.lastResetAt || "n/a");
    } else {
      await counterRef.set(
        {
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastResetAt: admin.firestore.FieldValue.serverTimestamp(),
          description:
            "Global sharded counter for numeric resume IDs. Do not modify directly.",
        },
        { merge: false }
      );

      console.log("✅ Created system metadata at", COUNTER_DOC_PATH);
    }

    const shardsCollection = db.collection(SHARDS_COLLECTION_PATH);
    console.log(`⚙️  Ensuring ${SHARD_COUNT} counter shards exist...`);

    await Promise.all(
      Array.from({ length: SHARD_COUNT }).map(async (_, shardId) => {
        const shardRef = shardsCollection.doc(String(shardId));
        const shardSnap = await shardRef.get();

        if (!shardSnap.exists) {
          await shardRef.set(initialShardPayload(shardId));
        }
      })
    );

    const shardsSnapshot = await shardsCollection.get();
    const shardStats = shardsSnapshot.docs.map((doc) => doc.data());
    const highestIssued = shardStats.length
      ? Math.max(...shardStats.map((doc) => doc.lastIssued || 0))
      : 0;

    console.log("📦 Shard overview:");
    console.log("   Total shards:", shardStats.length);
    console.log("   Highest issued ID:", highestIssued);
    console.log("   Sample shard:", shardStats[0] || "n/a");

    // Also create an index collection for tracking
    const indexRef = db.doc("system/idIndex");
    const indexSnap = await indexRef.get();

    if (!indexSnap.exists) {
      await indexRef.set(
        {
          totalIds: 0,
          deletedIds: 0,
          activeIds: 0,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          description:
            "Tracks ID usage statistics. Updated whenever an ID is generated or deleted.",
        },
        { merge: false }
      );
      console.log("📊 Created idIndex collection");
    }

    console.log("\n✨ System initialization complete!");
    console.log(
      "🚀 Ready to generate resume IDs across",
      SHARD_COUNT,
      "shards"
    );
    console.log(
      "\n💡 To check status later, visit: http://localhost:3000/api/admin/init-system"
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing system:", error);
    process.exit(1);
  }
}

initializeSystem();
