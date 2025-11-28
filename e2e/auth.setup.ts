/**
 * Global E2E Test Setup - Authentication
 *
 * This setup runs once before all tests to authenticate a test user
 * and save the session state for reuse across tests.
 *
 * The authenticated state is saved to .auth/user.json and reused
 * by the main test projects.
 *
 * IMPORTANT: Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD env vars to run
 * authenticated tests. Without them, only unauthenticated tests will run.
 */

import { test as setup, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

// Test user credentials - must be set via environment variables
const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

const authFile = ".auth/user.json";

setup("authenticate", async ({ page }) => {
  // Skip if no credentials configured
  if (!E2E_TEST_EMAIL || !E2E_TEST_PASSWORD) {
    console.log("⚠️  E2E_TEST_EMAIL and E2E_TEST_PASSWORD not set.");
    console.log(
      "   Skipping authenticated tests. Only unauthenticated tests will run."
    );
    console.log("   To run authenticated tests, set these env vars:");
    console.log("   export E2E_TEST_EMAIL=your-test@email.com");
    console.log("   export E2E_TEST_PASSWORD=your-test-password");

    // Create empty auth file so dependent tests are skipped gracefully
    const authDir = path.dirname(authFile);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    fs.writeFileSync(
      authFile,
      JSON.stringify({ cookies: [], origins: [] }, null, 2)
    );

    // Mark test as skipped
    setup.skip();
    return;
  }

  console.log(`🔐 Authenticating as ${E2E_TEST_EMAIL}...`);

  // Navigate to auth page
  await page.goto("/auth");

  // Wait for auth page to load
  await page.waitForLoadState("networkidle");
  await expect(
    page.locator("text=Welcome Back").or(page.locator("text=Join the Future"))
  ).toBeVisible({
    timeout: 15000,
  });

  // Fill in credentials using more robust selectors
  const emailInput = page
    .locator('input[type="email"], input[placeholder*="mail" i]')
    .first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill(E2E_TEST_EMAIL);
  await passwordInput.fill(E2E_TEST_PASSWORD);

  // Click sign in button
  const signInButton = page.locator(
    'button[type="submit"]:has-text("Sign In")'
  );
  await signInButton.click();

  // Wait for either:
  // 1. Redirect to dashboard/select-role (success)
  // 2. Error message (invalid credentials)
  // 3. Email verification notice
  try {
    await expect(page).toHaveURL(
      /\/(dashboard|select-role|auth\/choose-username)/,
      {
        timeout: 15000,
      }
    );
    console.log("✅ Authentication successful!");
  } catch {
    // Check if there's an error message
    const errorVisible = await page
      .locator(".text-red-400, .text-red-500, [class*='error']")
      .first()
      .isVisible()
      .catch(() => false);

    if (errorVisible) {
      const errorText = await page
        .locator(".text-red-400, .text-red-500")
        .first()
        .textContent()
        .catch(() => "Unknown error");
      console.log(`❌ Authentication failed: ${errorText}`);
      console.log(
        "   Make sure E2E_TEST_EMAIL and E2E_TEST_PASSWORD are correct."
      );
    }

    // Check for email verification notice
    const verificationNotice = await page
      .locator("text=verify your email, text=verification")
      .first()
      .isVisible()
      .catch(() => false);

    if (verificationNotice) {
      console.log("⚠️  Account requires email verification.");
      console.log("   Please verify the test account email first.");
    }

    // Create empty auth file
    const authDir = path.dirname(authFile);
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true });
    }
    fs.writeFileSync(
      authFile,
      JSON.stringify({ cookies: [], origins: [] }, null, 2)
    );

    setup.skip();
    return;
  }

  // Save auth state
  await page.context().storageState({ path: authFile });
  console.log(`💾 Auth state saved to ${authFile}`);
});
