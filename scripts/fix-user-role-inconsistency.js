#!/usr/bin/env node
/**
 * Fix user role inconsistencies
 * 
 * Usage:
 * node scripts/fix-user-role-inconsistency.js <uid> <role> [--project <projectId>]
 * node scripts/fix-user-role-inconsistency.js Zrt1puxDGCfzsxttZxiDrDGJUpv2 recruiter --project switchcv-dev
 */

const admin = require("firebase-admin");

// Parse command line arguments
const args = process.argv.slice(2);
const projectArgIndex = args.indexOf('--project');
const projectId = projectArgIndex !== -1 ? args[projectArgIndex + 1] : "switchcv-e5136";
const uid = args[0];
const newRole = args[1];

if (!uid || !newRole) {
  console.log("Usage: node scripts/fix-user-role-inconsistency.js <uid> <role> [--project <projectId>]");
  console.log("Roles: jobseeker, recruiter");
  process.exit(1);
}

if (!["jobseeker", "recruiter"].includes(newRole)) {
  console.log("❌ Invalid role. Must be 'jobseeker' or 'recruiter'");
  process.exit(1);
}

console.log(`📍 Using project: ${projectId}`);
console.log(`🔧 Fixing role for UID: ${uid}`);
console.log(`📝 Setting role to: ${newRole}`);

admin.initializeApp({ projectId });
const db = admin.firestore();
const auth = admin.auth();

async function fixUserRole() {
  try {
    // Get current user data
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      console.log("❌ User not found");
      return;
    }

    const userData = userDoc.data();
    console.log("\n📋 Current user data:");
    console.log(`   Role: ${userData.role}`);
    console.log(`   isRecruiter: ${userData.isRecruiter}`);
    console.log(`   Email: ${userData.email}`);

    const now = new Date().toISOString();
    const updateData = {
      role: newRole,
      isRecruiter: newRole === "recruiter",
      updatedAt: now,
      roleUpdatedAt: now,
    };

    // Update Firestore
    await db.collection("users").doc(uid).update(updateData);
    console.log("\n✅ Firestore updated successfully");

    // Update Auth custom claims
    try {
      await auth.setCustomUserClaims(uid, { role: newRole });
      console.log("✅ Auth custom claims updated");
    } catch (claimsError) {
      console.log("⚠️  Failed to update custom claims (non-critical):", claimsError.message);
    }

    // Verify changes
    const updatedDoc = await db.collection("users").doc(uid).get();
    const updatedData = updatedDoc.data();
    console.log("\n📋 Updated user data:");
    console.log(`   Role: ${updatedData.role}`);
    console.log(`   isRecruiter: ${updatedData.isRecruiter}`);
    console.log(`   Email: ${updatedData.email}`);
    console.log("\n✅ User role fixed successfully!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

fixUserRole();
