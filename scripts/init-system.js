#!/usr/bin/env node

/**
 * Initialize Firestore System Collection
 * 
 * Usage:
 * node scripts/init-system.js
 * 
 * This script initializes the system/resumeIdCounter document in Firestore
 * Required for the numeric ID generation system to work
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(
  __dirname,
  "../firebase-service-account.json"
);

let serviceAccount;
let projectId;

try {
  serviceAccount = require(serviceAccountPath);
  projectId = serviceAccount.project_id;
  console.log("🔑 Found service account key file.");
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: projectId,
  });
} catch {
  console.log("⚠️ Service account key not found. Trying Application Default Credentials...");
  projectId = "switchcv-e5136"; // Default project ID
  
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

async function initializeSystem() {
  try {
    console.log("🔧 Initializing System Collection...");
    console.log("📍 Project:", projectId);

    // Check if resumeIdCounter already exists
    const counterRef = db.doc("system/resumeIdCounter");
    const counterSnap = await counterRef.get();

    if (counterSnap.exists()) {
      console.log("✅ System already initialized!");
      console.log(
        "📊 Current counter:",
        counterSnap.data().currentId
      );
      console.log(
        "📌 Next resume ID will be:",
        counterSnap.data().currentId + 1
      );
    } else {
      // Initialize the counter
      await counterRef.set(
        {
          currentId: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastResetAt: admin.firestore.FieldValue.serverTimestamp(),
          description:
            "Global counter for numeric resume IDs. Do not modify directly.",
        },
        { merge: false }
      );

      console.log("✅ System initialized successfully!");
      console.log("📍 Location: system/resumeIdCounter");
      console.log("📊 Initial counter: 0");
      console.log("📌 Next resume ID will be: 1");
    }

    // Also create an index collection for tracking
    const indexRef = db.doc("system/idIndex");
    const indexSnap = await indexRef.get();

    if (!indexSnap.exists()) {
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
    console.log("🚀 Ready to generate resume IDs (1, 2, 3, ...)");
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
