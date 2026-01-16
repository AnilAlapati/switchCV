#!/usr/bin/env node

/**
 * Script to upgrade a user's subscription tier
 * Usage: node scripts/upgrade-user-tier.js <email> <tier>
 * Example: node scripts/upgrade-user-tier.js user@example.com premium
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "switchcv-dev",
    });
}

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
    console.log(`   Current tier: ${userData.subscriptionTier || "basic"}`);
    console.log(`   Upgrading to: ${tier}`);

    // Update the tier
    await db.collection("users").doc(userId).update({
        subscriptionTier: tier,
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
