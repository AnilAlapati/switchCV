#!/usr/bin/env node
/**
 * Google Sign-In Diagnostic Script
 * Run: node scripts/diagnose-google-signin.js
 *
 * Checks all prerequisites for Google Sign-In to work in dev:
 * 1. Environment variables
 * 2. Firebase Auth handler endpoint
 * 3. OAuth provider configuration
 * 4. ADC credentials
 * 5. .next cache
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const NC = "\x1b[0m";

let passCount = 0;
let failCount = 0;
let warnCount = 0;

function pass(msg) {
  passCount++;
  console.log(`${GREEN}✓ PASS${NC}: ${msg}`);
}
function fail(msg) {
  failCount++;
  console.log(`${RED}✗ FAIL${NC}: ${msg}`);
}
function warn(msg) {
  warnCount++;
  console.log(`${YELLOW}⚠ WARN${NC}: ${msg}`);
}
function info(msg) {
  console.log(`${BLUE}ℹ INFO${NC}: ${msg}`);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
  });
}

function fetchHead(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.request(url, { method: "HEAD", timeout: 10000 }, (res) => {
      resolve({ status: res.statusCode, headers: res.headers });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
    req.end();
  });
}

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === "https:" ? https : http;
    const postData = JSON.stringify(body);
    const req = client.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
        timeout: 10000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, data: null, raw: data });
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log("\n" + "=".repeat(70));
  console.log("  Google Sign-In Diagnostic Report");
  console.log("=".repeat(70) + "\n");

  // 1. Check .env.local
  console.log(`${BLUE}--- 1. Environment Variables ---${NC}`);
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    fail(".env.local file not found");
  } else {
    const envContent = fs.readFileSync(envPath, "utf8");
    const envVars = {};
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) envVars[match[1].trim()] = match[2].trim();
    });

    const required = [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    ];
    for (const key of required) {
      if (envVars[key]) {
        pass(`${key} = ${envVars[key]}`);
      } else {
        fail(`${key} is missing or empty`);
      }
    }

    const authDomain = envVars["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"];
    if (authDomain && authDomain.endsWith(".firebaseapp.com")) {
      pass(`Auth domain format correct: ${authDomain}`);
    } else {
      warn(`Auth domain "${authDomain}" may not be standard .firebaseapp.com`);
    }

    // Check server-side vars
    if (envVars["GCLOUD_PROJECT"] || envVars["GOOGLE_CLOUD_PROJECT"]) {
      pass(
        `Server project ID: ${envVars["GCLOUD_PROJECT"] || envVars["GOOGLE_CLOUD_PROJECT"]}`
      );
    } else {
      warn(
        "GCLOUD_PROJECT and GOOGLE_CLOUD_PROJECT are empty — admin SDK relies on NEXT_PUBLIC fallback"
      );
    }
  }

  // 2. Check ADC
  console.log(`\n${BLUE}--- 2. Application Default Credentials ---${NC}`);
  const adcPath = path.join(
    process.env.HOME || "~",
    ".config/gcloud/application_default_credentials.json"
  );
  if (fs.existsSync(adcPath)) {
    try {
      const adc = JSON.parse(fs.readFileSync(adcPath, "utf8"));
      pass(`ADC file exists: ${adcPath}`);
      info(`  Type: ${adc.type}`);
      info(`  Project: ${adc.quota_project_id || adc.project_id || "unknown"}`);
    } catch {
      warn("ADC file exists but could not be parsed");
    }
  } else {
    warn(
      `ADC file not found at ${adcPath} — run: gcloud auth application-default login`
    );
  }

  // 3. Check Firebase auth handler
  console.log(`\n${BLUE}--- 3. Firebase Auth Handler ---${NC}`);
  const envContent = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "";
  const authDomainMatch = envContent.match(
    /NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=(.+)/
  );
  const authDomain = authDomainMatch
    ? authDomainMatch[1].trim()
    : "switchcv-dev.firebaseapp.com";
  try {
    const res = await fetchHead(
      `https://${authDomain}/__/auth/handler`
    );
    if (res.status === 200) {
      pass(`Auth handler at https://${authDomain}/__/auth/handler → 200 OK`);
    } else {
      fail(
        `Auth handler returned ${res.status} (expected 200)`
      );
    }
  } catch (err) {
    fail(`Auth handler unreachable: ${err.message}`);
  }

  // 4. Check Google provider via REST API
  console.log(`\n${BLUE}--- 4. Google Sign-In Provider ---${NC}`);
  const apiKeyMatch = envContent.match(
    /NEXT_PUBLIC_FIREBASE_API_KEY=(.+)/
  );
  const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;
  if (apiKey) {
    try {
      const res = await postJson(
        `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${apiKey}`,
        {
          continueUri: "http://localhost:3000",
          providerId: "google.com",
        }
      );
      if (res.data && res.data.authUri) {
        pass("Google Sign-In provider is ENABLED");
        // Extract client ID from authUri
        const clientIdMatch = res.data.authUri.match(/client_id=([^&]+)/);
        if (clientIdMatch) {
          info(`  OAuth Client ID: ${clientIdMatch[1]}`);
        }
      } else if (res.data && res.data.error) {
        fail(
          `Google provider check failed: ${res.data.error.message}`
        );
      } else {
        warn("Unexpected response from createAuthUri");
      }
    } catch (err) {
      fail(`Could not verify Google provider: ${err.message}`);
    }
  } else {
    fail("Cannot check Google provider — API key not found");
  }

  // 5. Check dev server
  console.log(`\n${BLUE}--- 5. Dev Server ---${NC}`);
  try {
    const res = await fetchJson("http://localhost:3000/api/system-config");
    if (res.status === 200) {
      pass("Dev server is running at http://localhost:3000");
      if (res.data && res.data.config) {
        const auth = res.data.config.auth || {};
        if (auth.loginDisabled) {
          fail("loginDisabled is TRUE — login is blocked");
        } else {
          pass("loginDisabled is false");
        }
        if (auth.registrationClosed) {
          warn("registrationClosed is true — new signups blocked");
        } else {
          pass("registrationClosed is false");
        }
      }
    } else {
      fail(`Dev server returned ${res.status}`);
    }
  } catch {
    warn(
      "Dev server not running — start with: npm run dev"
    );
  }

  // 6. Check COOP/COEP headers (critical for popup flow)
  console.log(`\n${BLUE}--- 6. Security Headers (COOP/COEP) ---${NC}`);
  try {
    const res = await fetchHead("http://localhost:3000/auth");
    const coop = res.headers["cross-origin-opener-policy"];
    const coep = res.headers["cross-origin-embedder-policy"];

    if (coop === "same-origin-allow-popups") {
      pass(`COOP: ${coop} (correct for popup auth)`);
    } else if (coop === "same-origin") {
      fail(
        `COOP: ${coop} — this BLOCKS popup communication! Must be "same-origin-allow-popups"`
      );
    } else {
      warn(`COOP: ${coop || "not set"}`);
    }

    if (coep === "unsafe-none" || !coep) {
      pass(`COEP: ${coep || "not set"} (OK)`);
    } else if (coep === "require-corp") {
      fail(
        `COEP: ${coep} — this may block cross-origin resources in the popup`
      );
    }
  } catch {
    info("Skipping header check — dev server not running");
  }

  // 7. Check .next cache
  console.log(`\n${BLUE}--- 7. Build Cache ---${NC}`);
  const nextDir = path.join(process.cwd(), ".next");
  if (fs.existsSync(nextDir)) {
    const buildId = path.join(nextDir, "BUILD_ID");
    if (fs.existsSync(buildId)) {
      info(
        `Build ID: ${fs.readFileSync(buildId, "utf8").trim()}`
      );
    }
    info(
      "If issues persist after all checks pass, try: rm -rf .next && npm run dev"
    );
  } else {
    info(".next directory not present — will be created on next build");
  }

  // Summary
  console.log("\n" + "=".repeat(70));
  console.log(
    `  Results: ${GREEN}${passCount} pass${NC}, ${RED}${failCount} fail${NC}, ${YELLOW}${warnCount} warn${NC}`
  );
  console.log("=".repeat(70));

  if (failCount === 0 && warnCount === 0) {
    console.log(
      `\n${GREEN}All checks passed!${NC} If Google Sign-In still fails, check:\n` +
        "  1. Google Cloud Console → OAuth consent screen → Is it in 'Testing' mode?\n" +
        "     → If yes, add your email to the test users list OR publish the app\n" +
        "  2. Browser popup blocker — try allowing popups for localhost\n" +
        "  3. Browser console (F12) — look for specific error codes\n"
    );
  } else if (failCount > 0) {
    console.log(
      `\n${RED}Fix the FAIL items above before testing Google Sign-In.${NC}\n`
    );
  } else {
    console.log(
      `\n${YELLOW}Warnings found — these may or may not cause issues.${NC}\n`
    );
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Diagnostic failed:", err);
  process.exit(1);
});
