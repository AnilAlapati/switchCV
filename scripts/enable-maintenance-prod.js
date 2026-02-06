#!/usr/bin/env node
/**
 * Enable maintenance mode on production Firestore
 * Usage: node enable-maintenance-prod.js
 */

const admin = require("firebase-admin");

async function enableMaintenance() {
  try {
    // Initialize with production project
    if (!admin.apps.length) {
      // Use Application Default Credentials (gcloud auth)
      admin.initializeApp({
        projectId: "switchcv-e5136",
      });
    }

    const db = admin.firestore();

    // Enable maintenance mode
    await db.collection("config").doc("system").set(
      {
        maintenance: {
          isActive: true,
          message:
            "🔧 Under maintenance: Security patches in progress. Expected downtime: 30 minutes. We apologize for the inconvenience.",
          blocking: true,
        },
      },
      { merge: true }
    );

    console.log("✅ Maintenance mode ENABLED on production (switchcv-e5136)");
    console.log("   Blocking: true");
    console.log(
      "   Message: 🔧 Under maintenance - Security patches in progress"
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to enable maintenance mode:", error.message);
    process.exit(1);
  }
}

enableMaintenance();
