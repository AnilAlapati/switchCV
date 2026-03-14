#!/usr/bin/env node
/**
 * Ensures production Firestore has explicit userApproval config.
 *
 * IMPORTANT: This must be run BEFORE deploying the code change that
 * flips the default from enabled:true → enabled:false.
 *
 * Usage:
 *   GOOGLE_CLOUD_PROJECT=switchcv-e5136 node scripts/ensure-prod-approval-config.js
 *
 * What it does:
 *   - Reads config/system.userApproval from prod Firestore
 *   - If the 'enabled' field is missing, sets it to true (preserving existing behavior)
 *   - If already set, prints current value and exits
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const project = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;

async function main() {
  console.log(`Project: ${project || "(default from ADC)"}`);
  console.log();

  const ref = db.collection("config").doc("system");
  const doc = await ref.get();

  if (!doc.exists) {
    console.log("config/system document does NOT exist — creating with approval enabled.");
    await ref.set({
      userApproval: {
        enabled: true,
        adminEmail: "support@switchcv.com",
        autoApproveDomains: [],
      },
    });
    console.log("Done. Created config/system with userApproval.enabled = true");
    return;
  }

  const data = doc.data();
  const approval = data?.userApproval;

  if (!approval) {
    console.log("config/system exists but userApproval field is MISSING.");
    console.log("Adding userApproval.enabled = true to preserve current behavior.");
    await ref.update({
      "userApproval.enabled": true,
      "userApproval.adminEmail": "support@switchcv.com",
      "userApproval.autoApproveDomains": [],
    });
    console.log("Done.");
    return;
  }

  if (approval.enabled === undefined || approval.enabled === null) {
    console.log("userApproval exists but 'enabled' field is missing/null.");
    console.log("Setting userApproval.enabled = true to preserve current behavior.");
    await ref.update({ "userApproval.enabled": true });
    console.log("Done.");
    return;
  }

  console.log("Current userApproval config:");
  console.log(JSON.stringify(approval, null, 2));
  console.log();
  console.log(`userApproval.enabled is already explicitly set to: ${approval.enabled}`);
  console.log("No changes needed.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
