/**
 * One-off script to manually approve a pending user registration.
 *
 * Usage: node scripts/approve-user.js <userId>
 * Example: node scripts/approve-user.js pr2cdNhWizLmzehy6v6oVImRX6C3
 *
 * What it does (mirrors approve/route.ts):
 *  1. Finds the userApprovalRequests doc for this userId
 *  2. Sets its status → "approved"
 *  3. Sets users/{userId}.approvalStatus → "approved"
 *  4. Adds a verification email to the mail collection (skipped for OAuth/Google users
 *     since they are already email-verified in Firebase Auth)
 */

const admin = require("firebase-admin");

// ── Init ──────────────────────────────────────────────────────────────────────
// Default to production project. Pass --dev as second arg to target switchcv-dev.
const isDev = process.argv.includes("--dev");
const PROJECT_ID = isDev ? "switchcv-dev" : "switchcv-e5136";
console.log(`Using Firebase project: ${PROJECT_ID}`);

try {
  admin.initializeApp({ projectId: PROJECT_ID });
} catch {
  // Already initialized
}

const db = admin.firestore();
const auth = admin.auth();

// ── Target ────────────────────────────────────────────────────────────────────
const TARGET_USER_ID =
  process.argv[2] || "pr2cdNhWizLmzehy6v6oVImRX6C3";

async function approveUser(userId) {
  console.log(`\n🔍 Looking up user: ${userId}`);

  // 1. Fetch the Firebase Auth record to detect provider type
  let authUser;
  try {
    authUser = await auth.getUser(userId);
  } catch (err) {
    console.error("❌ Firebase Auth: user not found –", err.message);
    process.exit(1);
  }

  const email = authUser.email;
  const isOAuthUser = authUser.providerData.some(
    (p) => p.providerId !== "password",
  );
  console.log(
    `   email:    ${email}`,
    `\n   provider: ${authUser.providerData.map((p) => p.providerId).join(", ")}`,
    `\n   emailVerified (Auth): ${authUser.emailVerified}`,
  );

  // 2. Find the pending approval request
  const snapshot = await db
    .collection("userApprovalRequests")
    .where("userId", "==", userId)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (snapshot.empty) {
    // Maybe it's already approved or the doc doesn't exist – check anyway
    const allSnap = await db
      .collection("userApprovalRequests")
      .where("userId", "==", userId)
      .limit(1)
      .get();
    if (!allSnap.empty) {
      const existing = allSnap.docs[0].data();
      console.log(
        `\n⚠️  No *pending* approval request found. Existing status: "${existing.status}"`,
      );
    } else {
      console.log("\n⚠️  No approval request document found at all.");
    }
    console.log("   Proceeding to update the users doc directly.\n");
  }

  const now = admin.firestore.FieldValue.serverTimestamp();

  // 3. Update the approval request doc if found
  if (!snapshot.empty) {
    const reqDoc = snapshot.docs[0];
    console.log(`\n📄 Approval request doc: ${reqDoc.id}`);
    await reqDoc.ref.update({
      status: "approved",
      processedAt: now,
      processedBy: "manual-script",
      updatedAt: now,
    });
    console.log("   ✅ userApprovalRequests → status: approved");
  }

  // 4. Update the users doc
  await db.collection("users").doc(userId).update({
    approvalStatus: "approved",
    approvedAt: now,
    approvalNote: "Manually approved via approve-user.js",
    updatedAt: now,
  });
  console.log("   ✅ users doc       → approvalStatus: approved");

  // 5. Send verification email only if this is a password provider user
  //    (Google/OAuth users are already email-verified by Firebase Auth)
  if (isOAuthUser) {
    console.log(
      "\n   ℹ️  OAuth/Google user – skipping verification email (already email-verified).",
    );
    console.log("\n✅ Done! User is approved. They can now sign in and access the app.");
    return;
  }

  // Password user – generate and send verification email
  try {
    const websiteUrl = "https://switchcv.com";
    const verificationLink = await auth.generateEmailVerificationLink(email, {
      url: websiteUrl,
      handleCodeInApp: false,
    });

    await db.collection("mail").add({
      to: email,
      message: {
        subject: "Verify Your SwitchCV Account",
        html: `
          <p>Your registration has been approved!</p>
          <p><a href="${verificationLink}">Click here to verify your email</a></p>
          <p>This link expires in 24 hours.</p>
        `,
        text: `Your registration has been approved!\n\nVerify your email: ${verificationLink}\n\nThis link expires in 24 hours.`,
      },
      createdAt: now,
    });
    console.log("   ✅ Verification email queued in mail collection");
  } catch (err) {
    console.warn("   ⚠️  Could not generate verification link:", err.message);
    console.warn(
      "   User is approved but unverified. They can use 'Resend verification' on the auth page.",
    );
  }

  console.log("\n✅ Done! User approved and verification email sent.");
}

approveUser(TARGET_USER_ID).catch((err) => {
  console.error("\n❌ Unexpected error:", err);
  process.exit(1);
});
