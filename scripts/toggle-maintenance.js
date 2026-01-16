#!/usr/bin/env node

/**
 * Toggle the public maintenance banner via Firestore.
 *
 * Usage:
 *   node scripts/toggle-maintenance.js status
 *   node scripts/toggle-maintenance.js on "Message" [--blocking]
 *   node scripts/toggle-maintenance.js off
 *
 * The script updates the config/system document so the UI reflects changes instantly.
 */

const admin = require("firebase-admin");
const path = require("path");

const args = process.argv.slice(2);
const command = args[0];

if (!command || !["on", "off", "status"].includes(command)) {
  console.error("\nUsage:");
  console.error("  node scripts/toggle-maintenance.js status");
  console.error(
    "  node scripts/toggle-maintenance.js on \"Message\" [--blocking] [--project <id>]"
  );
  console.error("  node scripts/toggle-maintenance.js off [--project <id>]\n");
  process.exit(1);
}

const projectArgIndex = args.indexOf("--project");
const projectOverride =
  projectArgIndex !== -1 ? args[projectArgIndex + 1] : undefined;

const serviceAccountPath = path.join(
  __dirname,
  "../firebase-service-account.json"
);

let projectId;

try {
  const serviceAccount = require(serviceAccountPath);
  projectId = projectOverride || serviceAccount.project_id;
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId,
  });
  console.log("🔑 Initialized Firebase Admin with service account.");
} catch {
  projectId = projectOverride;
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
    console.log("✅ Initialized with Application Default Credentials.");
  } catch (initError) {
    console.error("\n❌ Failed to initialize Firebase Admin SDK");
    console.error(initError.message);
    console.error(
      "\nProvide firebase-service-account.json or run `gcloud auth application-default login`."
    );
    process.exit(1);
  }
}

const db = admin.firestore();
const CONFIG_DOC_PATH = "config/system";

const readCurrentConfig = async () => {
  const snapshot = await db.doc(CONFIG_DOC_PATH).get();
  return snapshot.exists ? snapshot.data() : null;
};

const ensureBaseline = async () => {
  const existing = await readCurrentConfig();
  if (existing) {
    return existing;
  }

  const baseline = {
    maintenance: { isActive: false, message: "", blocking: false },
    auth: { registrationClosed: false, loginDisabled: false },
    features: { enableAnalytics: true, enableMockData: false },
    createdAt: new Date().toISOString(),
  };
  await db.doc(CONFIG_DOC_PATH).set(baseline, { merge: true });
  return baseline;
};

const toggleOn = async ({ message, blocking }) => {
  if (!message) {
    console.error("❌ Please provide a maintenance message when turning ON.");
    process.exit(1);
  }

  await ensureBaseline();

  await db.doc(CONFIG_DOC_PATH).set(
    {
      maintenance: {
        isActive: true,
        message,
        blocking,
        updatedAt: new Date().toISOString(),
      },
    },
    { merge: true }
  );

  console.log(
    `\n🚧 Maintenance mode enabled (${blocking ? "blocking" : "informational"}).`
  );
  console.log(`📝 Message: ${message}`);
};

const toggleOff = async () => {
  await ensureBaseline();

  await db.doc(CONFIG_DOC_PATH).set(
    {
      maintenance: {
        isActive: false,
        message: "",
        blocking: false,
        updatedAt: new Date().toISOString(),
      },
    },
    { merge: true }
  );

  console.log("\n✅ Maintenance mode disabled.");
};

const printStatus = async () => {
  const config = await ensureBaseline();
  const maintenance = config.maintenance || {};
  console.log("\n📣 Current Maintenance State\n---------------------------");
  console.log(`Active : ${maintenance.isActive ? "Yes" : "No"}`);
  console.log(`Blocking : ${maintenance.blocking ? "Yes" : "No"}`);
  console.log(`Message : ${maintenance.message || "(none)"}`);
  console.log(`Updated : ${maintenance.updatedAt || "(unknown)"}`);
};

(async () => {
  try {
    if (command === "status") {
      await printStatus();
    } else if (command === "on") {
      const messageArg = args[1];
      const blocking = args.includes("--blocking");
      await toggleOn({ message: messageArg, blocking });
      await printStatus();
    } else if (command === "off") {
      await toggleOff();
      await printStatus();
    }
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Operation failed:", error.message);
    process.exit(1);
  }
})();
