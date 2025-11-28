#!/usr/bin/env node
/**
 * Manual script to update global stats in Firestore
 * Run from project root: node scripts/update-global-stats.js
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin with project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "switchcv-e5136",
  });
}

const db = admin.firestore();

async function updateStats() {
  console.log("🔄 Fetching counts from Firestore...\n");

  try {
    const usersRef = db.collection("users");

    const [allUsers, jobSeekers, recruiters, resumes] = await Promise.all([
      usersRef.count().get(),
      usersRef.where("role", "==", "jobseeker").count().get(),
      usersRef.where("role", "==", "recruiter").count().get(),
      db
        .collection("resumeProfiles")
        .where("published", "==", true)
        .count()
        .get(),
    ]);

    const stats = {
      userCount: allUsers.data().count,
      jobSeekerCount: jobSeekers.data().count,
      recruiterCount: recruiters.data().count,
      resumeCount: resumes.data().count,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastRunManual: true,
    };

    console.log("📊 Stats to write:");
    console.log(`   - Total Users: ${stats.userCount}`);
    console.log(`   - Job Seekers: ${stats.jobSeekerCount}`);
    console.log(`   - Recruiters:  ${stats.recruiterCount}`);
    console.log(`   - Resumes:     ${stats.resumeCount}`);
    console.log("");

    await db.collection("analytics").doc("globalStats").set(stats, { merge: true });

    console.log("✅ Global stats updated successfully!");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

updateStats().then(() => process.exit(0));
