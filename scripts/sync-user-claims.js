const admin = require("firebase-admin");

const projectId = process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
    console.error("❌ FIREBASE_PROJECT_ID required (switchcv-e5136 or switchcv-dev)");
    process.exit(1);
}

if (!admin.apps.length) {
    admin.initializeApp({ projectId });
}

const auth = admin.auth();

async function syncClaims(email) {
    const user = await auth.getUserByEmail(email);
    console.log(`🔍 Checking user ${email} (${user.uid})`);
    
    // We update claims to include the tier for edge-side checks
    // Get doc from firestore
    const db = admin.firestore();
    const doc = await db.collection("users").doc(user.uid).get();
    
    if (!doc.exists) {
        console.error("❌ Firestore document not found for user.");
        return;
    }
    
    const tier = doc.data().subscriptionTier || "basic";
    const role = doc.data().role || "jobseeker";
    
    console.log(`✨ Setting custom claims: { tier: "${tier}", role: "${role}" }`);
    
    await auth.setCustomUserClaims(user.uid, { tier, role });
    console.log("✅ Claims successfully updated.");
    console.log("💡 You MUST sign out and back in on the website for the browser to see the new token.");
}

const email = process.argv[2];
if (!email) {
    console.log("Usage: node scripts/sync-user-claims.js <email>");
    process.exit(1);
}

syncClaims(email).catch(console.error);
