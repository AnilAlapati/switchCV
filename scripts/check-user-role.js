#!/usr/bin/env node
/**
 * Check user role by email
 *
 * Usage:
 * node scripts/check-user-role.js anilalapati.66+dev01
 * node scripts/check-user-role.js anilalapati.66+dev01 --project switchcv-dev
 */

const admin = require("firebase-admin");

// Parse command line arguments
const args = process.argv.slice(2);
const projectArgIndex = args.indexOf('--project');
const projectId = projectArgIndex !== -1 ? args[projectArgIndex + 1] : "switchcv-e5136";
const email = args[0];

if (!email) {
  console.log("Usage: node scripts/check-user-role.js <email> [--project <projectId>]");
  process.exit(1);
}

console.log(`📍 Using project: ${projectId}`);
console.log(`🔍 Checking role for: ${email}`);

admin.initializeApp({ projectId });
const db = admin.firestore();

async function checkUserRole() {
  try {
    const usersRef = db.collection("users");
    const query = usersRef.where("email", "==", email);
    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log("❌ User not found");
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log("\n✅ User found:");
      console.log(`   UID: ${doc.id}`);
      console.log(`   Email: ${data.email}`);
      console.log(`   Display Name: ${data.displayName || 'n/a'}`);
      console.log(`   Role: ${data.role || 'n/a'}`);
      console.log(`   isRecruiter: ${data.isRecruiter}`);
      console.log(`   Subscription Tier: ${data.subscriptionTier || 'n/a'}`);
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

checkUserRole();