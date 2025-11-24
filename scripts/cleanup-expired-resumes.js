#!/usr/bin/env node

/**
 * Cleanup Expired Resumes
 * 
 * Usage:
 * node scripts/cleanup-expired-resumes.js
 * 
 * This script deletes resumes that have passed their expiration date (expiresAt).
 * It is intended to be run periodically (e.g., via cron).
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
  // Try to load service account
  try {
    serviceAccount = require(serviceAccountPath);
    projectId = serviceAccount.project_id;
    console.log("🔑 Found service account key file.");
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: projectId,
    });
  } catch {
    // Fallback to ADC
    console.log("⚠️ Service account key not found. Trying Application Default Credentials...");
    projectId = "switchcv-e5136"; // Default project ID
    
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: projectId,
    });
    console.log("✅ Initialized with Application Default Credentials.");
  }
} catch (error) {
  console.error("\n❌ Authentication Failed");
  console.error(error);
  process.exit(1);
}

const db = admin.firestore();

function resolveTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    return value.toDate();
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function cleanupExpiredResumes() {
  console.log("Starting cleanup of expired resumes...");
  const nowIso = new Date().toISOString();
  const docMap = new Map();

  try {
    const deletionSnapshot = await db
      .collection("resumes")
      .where("deletionScheduledAt", "<", nowIso)
      .get();

    deletionSnapshot.forEach((doc) => docMap.set(doc.id, doc));

    const legacySnapshot = await db
      .collection("resumes")
      .where("expiresAt", "<", nowIso)
      .get();

    legacySnapshot.forEach((doc) => docMap.set(doc.id, doc));

    if (docMap.size === 0) {
      console.log("No expired resumes found.");
      return;
    }

    console.log(`Reviewing ${docMap.size} potentially expired resumes...`);

    const batch = db.batch();
    let count = 0;
    let totalDeleted = 0;
    const now = new Date();

    for (const doc of docMap.values()) {
      const data = doc.data();
      const userId = data.userId;
      const resumeId = doc.id;
      const deletionDate =
        resolveTimestamp(data.deletionScheduledAt) ||
        resolveTimestamp(data.expiresAt);

      if (!deletionDate || deletionDate > now) {
        continue; // Still within grace window
      }

      // Delete from main collection
      batch.delete(doc.ref);

      // Delete from user subcollection
      if (userId) {
        const userResumeRef = db
          .collection("users")
          .doc(userId)
          .collection("resumes")
          .doc(resumeId);
        batch.delete(userResumeRef);
      }

      // Delete from global index
      const globalRef = db.collection("allResumes").doc(resumeId);
      batch.delete(globalRef);

      count++;
      totalDeleted++;

      // Batches are limited to 500 ops
      if (count >= 150) {
        await batch.commit();
        console.log(`Deleted batch of ${count} resumes.`);
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    if (totalDeleted === 0) {
      console.log("No resumes crossed the deletion threshold today.");
    } else {
      console.log(`Cleanup complete. Total deleted: ${totalDeleted}`);
    }
  } catch (error) {
    console.error("Error cleaning up resumes:", error);
    process.exit(1);
  }
}

// Execute
cleanupExpiredResumes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
