#!/usr/bin/env node
/**
 * ONE-TIME SCRIPT: Add anilalapati.66@gmail.com to the admin whitelist
 * in BOTH dev and prod Firebase projects.
 *
 * The syncAdminWhitelistHandler Cloud Function watches
 * system/admins/whitelist/{email} and automatically grants the admin
 * Firebase Auth custom claim when the document is created.
 *
 * Usage:
 *   node scripts/set-admin-whitelist.js           # both projects (default)
 *   node scripts/set-admin-whitelist.js --dev     # dev only
 *   node scripts/set-admin-whitelist.js --prod    # prod only
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or firebase CLI login credentials.
 */

const admin = require("firebase-admin");

const EMAIL = "anilalapati.66@gmail.com";

const PROJECTS = {
  dev: "switchcv-dev",
  prod: "switchcv-e5136",
};

// Determine which projects to target from CLI args
const args = process.argv.slice(2);
let targets;
if (args.includes("--dev")) {
  targets = [{ label: "dev", projectId: PROJECTS.dev }];
} else if (args.includes("--prod")) {
  targets = [{ label: "prod", projectId: PROJECTS.prod }];
} else {
  targets = [
    { label: "dev", projectId: PROJECTS.dev },
    { label: "prod", projectId: PROJECTS.prod },
  ];
}

async function addToWhitelist(label, projectId) {
  console.log(`\n▶  [${label.toUpperCase()}] Connecting to project: ${projectId}`);

  const app = admin.initializeApp({ projectId }, `app-${label}`);
  const db = admin.firestore(app);

  const ref = db
    .collection("system")
    .doc("admins")
    .collection("whitelist")
    .doc(EMAIL);

  await ref.set(
    {
      addedAt: admin.firestore.FieldValue.serverTimestamp(),
      addedBy: "set-admin-whitelist.js",
    },
    { merge: true }
  );

  console.log(`✅ [${label.toUpperCase()}] ${EMAIL} added to whitelist in ${projectId}`);
  console.log(
    `   The syncAdminWhitelistHandler Cloud Function will grant the admin claim automatically.`
  );

  await app.delete();
}

async function run() {
  console.log(`\n🔑 Setting admin whitelist for: ${EMAIL}`);
  console.log(`   Targets: ${targets.map((t) => t.label).join(", ")}`);

  for (const { label, projectId } of targets) {
    await addToWhitelist(label, projectId);
  }

  console.log(`\n✅ Done.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  });
