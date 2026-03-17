#!/usr/bin/env node

/**
 * verify-prod-env.js — Build-time guard against .env.local leaking into production builds.
 *
 * This script runs BEFORE `next build` during prod deployments.
 * It checks that the Firebase config actually comes from .env.production (the prod project)
 * and NOT from .env.local (the dev project).
 *
 * Called from:
 *   - next.config.ts (build-time phase check)
 *   - scripts/deploy.sh (explicit pre-deploy step)
 *   - Can be run manually: node scripts/verify-prod-env.js
 *
 * Exit codes:
 *   0 = OK (either not a prod build, or prod config is correct)
 *   1 = FATAL: dev config detected in a prod build
 */

const fs = require("fs");
const path = require("path");

const PROD_PROJECT_ID = "switchcv-e5136";
const DEV_PROJECT_ID = "switchcv-dev";
const PROD_AUTH_DOMAIN = "switchcv.com";

function main() {
  const deployTarget = process.env.NEXT_PUBLIC_DEPLOY_TARGET;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

  // Only enforce for production builds
  if (deployTarget !== "prod") {
    console.log("✅ verify-prod-env: Not a prod build — skipping.");
    process.exit(0);
  }

  const errors = [];

  // Check 1: .env.local should NOT exist during a prod build
  const envLocalPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envLocalPath)) {
    // Read it to check if it contains dev project
    const content = fs.readFileSync(envLocalPath, "utf-8");
    if (content.includes(DEV_PROJECT_ID)) {
      errors.push(
        `.env.local exists and contains dev project (${DEV_PROJECT_ID}). ` +
          "Next.js loads .env.local with higher priority than .env.production, " +
          "so the prod build will get dev Firebase config.\n" +
          "   Fix: Remove or rename .env.local before building for prod, " +
          "or use `npm run deploy:prod` which handles this automatically."
      );
    }
  }

  // Check 2: Project ID must be the prod project
  if (projectId === DEV_PROJECT_ID) {
    errors.push(
      `NEXT_PUBLIC_FIREBASE_PROJECT_ID is "${DEV_PROJECT_ID}" — this is the DEV project.\n` +
        `   Expected: "${PROD_PROJECT_ID}" for a prod build.`
    );
  } else if (projectId !== PROD_PROJECT_ID) {
    errors.push(
      `NEXT_PUBLIC_FIREBASE_PROJECT_ID is "${projectId}" — unrecognized project.\n` +
        `   Expected: "${PROD_PROJECT_ID}" for a prod build.`
    );
  }

  // Check 3: Auth domain must be the custom domain (not the default Firebase domain)
  if (authDomain && authDomain.includes(DEV_PROJECT_ID)) {
    errors.push(
      `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is "${authDomain}" — this is the DEV auth domain.\n` +
        `   Expected: "${PROD_AUTH_DOMAIN}" for a prod build.`
    );
  }

  if (errors.length > 0) {
    console.error("");
    console.error("╔══════════════════════════════════════════════════════════════╗");
    console.error("║  ❌ FATAL: Dev Firebase config detected in PROD build!      ║");
    console.error("╚══════════════════════════════════════════════════════════════╝");
    console.error("");
    errors.forEach((err, i) => {
      console.error(`  ${i + 1}. ${err}`);
      console.error("");
    });
    console.error("  This would deploy switchcv.com with dev credentials, breaking");
    console.error("  Google Sign-In and all Firebase operations.");
    console.error("");
    console.error("  To fix: run `npm run deploy:prod` (which handles .env.local safely)");
    console.error("  or manually: mv .env.local .env.local.bak && npm run build");
    console.error("");
    process.exit(1);
  }

  console.log("✅ verify-prod-env: Prod config verified — project=" + projectId + ", authDomain=" + authDomain);
  process.exit(0);
}

main();
