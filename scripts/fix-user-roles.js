#!/usr/bin/env node
/**
 * Set default role for users without a role
 * 
 * Usage:
 * node scripts/fix-user-roles.js                    # Uses default project (switchcv-e5136)
 * node scripts/fix-user-roles.js --project switchcv-dev  # Uses dev project
 */

const admin = require("firebase-admin");

// Parse command line arguments for --project
const args = process.argv.slice(2);
const projectArgIndex = args.indexOf('--project');
const projectId = projectArgIndex !== -1 ? args[projectArgIndex + 1] : "switchcv-e5136";

console.log(`📍 Using project: ${projectId}`);

admin.initializeApp({ projectId });
const db = admin.firestore();

async function fixRolesAndUpdateStats() {
  console.log("🔄 Checking users without roles...\n");

  // Get all users
  const allSnap = await db.collection("users").get();
  const batch = db.batch();
  let updated = 0;

  allSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (!data.role) {
      console.log(`  Setting role=jobseeker for: ${doc.id}`);
      batch.update(doc.ref, { role: "jobseeker" });
      updated++;
    }
  });

  if (updated > 0) {
    await batch.commit();
    console.log(`\n✅ Updated ${updated} users with default role\n`);
  } else {
    console.log("  All users already have roles\n");
  }

  // Now update stats
  console.log("📊 Updating global stats...\n");

  const usersRef = db.collection("users");
  const [allUsers, jobSeekers, recruiters, resumes] = await Promise.all([
    usersRef.count().get(),
    usersRef.where("role", "==", "jobseeker").count().get(),
    usersRef.where("role", "==", "recruiter").count().get(),
    db.collection("resumeProfiles").where("published", "==", true).count().get(),
  ]);

  const stats = {
    userCount: allUsers.data().count,
    jobSeekerCount: jobSeekers.data().count,
    recruiterCount: recruiters.data().count,
    resumeCount: resumes.data().count,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  console.log("   Stats:");
  console.log(`   - Total Users:  ${stats.userCount}`);
  console.log(`   - Job Seekers:  ${stats.jobSeekerCount}`);
  console.log(`   - Recruiters:   ${stats.recruiterCount}`);
  console.log(`   - Resumes:      ${stats.resumeCount}\n`);

  await db.collection("analytics").doc("globalStats").set(stats, { merge: true });
  console.log("✅ Global stats updated!");

  process.exit(0);
}

fixRolesAndUpdateStats().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
