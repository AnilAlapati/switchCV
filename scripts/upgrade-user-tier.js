#!/usr/bin/env node

/**
 * Script to upgrade a user's subscription tier
 * Usage: node scripts/upgrade-user-tier.js <email> <tier>
 * Example: node scripts/upgrade-user-tier.js user@example.com premium
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin
const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
    console.error("❌ FIREBASE_PROJECT_ID env var is required.");
    console.error("   Production: FIREBASE_PROJECT_ID=switchcv-e5136 node scripts/upgrade-user-tier.js ...");
    console.error("   Dev:        FIREBASE_PROJECT_ID=switchcv-dev node scripts/upgrade-user-tier.js ...");
    process.exit(1);
}
if (!admin.apps.length) {
    admin.initializeApp({ projectId });
}
console.log(`🔧 Using Firebase project: ${projectId}`);

const db = admin.firestore();

async function upgradeUserTier(email, tier) {
    const validTiers = ["basic", "premium", "enterprise"];

    if (!validTiers.includes(tier)) {
        console.error(`❌ Invalid tier: ${tier}. Must be one of: ${validTiers.join(", ")}`);
        process.exit(1);
    }

    console.log(`🔍 Looking for user with email: ${email}`);

    // Find user by email
    const snapshot = await db.collection("users").where("email", "==", email).get();

    if (snapshot.empty) {
        console.error(`❌ No user found with email: ${email}`);
        process.exit(1);
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;

    console.log(`✅ Found user: ${userId}`);
    console.log(`   Current subscriptionTier: ${userData.subscriptionTier || "basic"}`);
    console.log(`   Current jobSeekerTier:    ${userData.jobSeekerTier || "basic"}`);
    console.log(`   Current recruiterTier:    ${userData.recruiterTier || "basic"}`);
    console.log(`   Upgrading all tiers to: ${tier}`);

    // Update all tier fields so the frontend hook (which checks jobSeekerTier first)
    // always sees the correct value regardless of field precedence.
    await db.collection("users").doc(userId).update({
        subscriptionTier: tier,
        jobSeekerTier: tier,
        recruiterTier: tier,
        tierUpdatedAt: new Date().toISOString(),
        tierUpdatedBy: "admin-script",
    });

    console.log(`🎉 Successfully upgraded ${email} to ${tier}!`);
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log("Usage: node scripts/upgrade-user-tier.js <email> <tier>");
    console.log("Tiers: basic, premium, enterprise");
    console.log("Example: node scripts/upgrade-user-tier.js user@example.com premium");
    process.exit(1);
}

const [email, tier] = args;
upgradeUserTier(email, tier).catch(console.error);
