#!/usr/bin/env node
/**
 * Reset a user's resume creation counter to 0.
 *
 * Usage (production — default):
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/prod-key.json \
 *     node scripts/reset-resume-counter.js <email>
 *
 * Usage (dev/staging):
 *   FIREBASE_PROJECT_ID=switchcv-dev \
 *     node scripts/reset-resume-counter.js <email>
 *
 * Environment variables:
 *   FIREBASE_PROJECT_ID            — override project (default: switchcv-e5136 / prod)
 *   GOOGLE_APPLICATION_CREDENTIALS — path to service-account JSON (ADC fallback)
 *
 * What it resets:
 *   users/{uid}.lifetimeResumeCreations → 0
 *
 * ⚠️  The quota service uses MAX(lifetimeResumeCreations, active_resume_count).
 *     If the user still has active resumes, the effective quota will equal the
 *     active count — not 0.  This is logged as a warning after the reset.
 */

const admin = require("firebase-admin");

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/reset-resume-counter.js <email>");
  process.exit(1);
}

const projectId = process.env.FIREBASE_PROJECT_ID || "switchcv-e5136";

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();
const auth = admin.auth();

async function main() {
  console.log(`Project  : ${projectId}`);
  console.log(`Email    : ${email}`);
  console.log("");

  // Resolve Firebase Auth UID from email
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (err) {
    console.error(`❌ Could not find Firebase Auth user for "${email}": ${err.message}`);
    process.exit(1);
  }
  const userId = userRecord.uid;
  console.log(`UID      : ${userId}`);

  // Read current state
  const userRef = db.collection("users").doc(userId);
  const userSnap = await userRef.get();
  const currentLifetime = userSnap.exists
    ? (userSnap.data().lifetimeResumeCreations ?? "not set")
    : "document missing";
  console.log(`Before   : lifetimeResumeCreations = ${currentLifetime}`);

  // Active resume count (used as fallback by quota service)
  const activeSnap = await db
    .collection("resumes")
    .where("userId", "==", userId)
    .count()
    .get();
  const activeCount = activeSnap.data().count;
  console.log(`Active resumes in Firestore: ${activeCount}`);
  console.log("");

  // Perform the reset
  await userRef.set(
    {
      lifetimeResumeCreations: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`✅ Reset lifetimeResumeCreations → 0 for ${email} (${userId})`);

  // Post-reset warning
  if (activeCount > 0) {
    console.log("");
    console.log(`⚠️  WARNING: User still has ${activeCount} active resume(s).`);
    console.log(`   Effective quota = MAX(0, ${activeCount}) = ${activeCount}.`);
    console.log(`   Delete those resumes too if you need the effective count to reach 0.`);
  } else {
    console.log("✅ No active resumes — effective quota is now 0.");
  }
}

main().catch((err) => {
  console.error("FATAL:", err.message);
  process.exit(1);
});
