/* eslint-disable no-console */
/**
 * Global Setup for Playwright Tests
 *
 * This runs once before all tests to warm up the Next.js server.
 * It pre-compiles the key routes so tests don't timeout waiting for compilation.
 */

import { chromium, type FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:3000";

  console.log("🔥 Warming up Next.js server...");

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Routes to warm up (pre-compile)
  const routesToWarm = [
    "/",
    "/auth",
    "/dashboard",
    "/create-resume",
    "/recruiter/search",
    "/select-role",
  ];

  for (const route of routesToWarm) {
    try {
      console.log(`  → Warming ${route}...`);
      await page.goto(`${baseURL}${route}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    } catch {
      // Some routes may redirect (e.g., protected routes), that's OK
      console.log(`  ⚠ ${route} (redirect or timeout - expected)`);
    }
  }

  await browser.close();
  console.log("✅ Server warmed up, starting tests...\n");
}

export default globalSetup;
