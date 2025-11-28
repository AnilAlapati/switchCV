/**
 * Global E2E Test Setup - Authentication
 *
 * This setup runs once before all tests to authenticate a test user
 * and save the session state for reuse across tests.
 *
 * The authenticated state is saved to .auth/user.json and reused
 * by the main test projects.
 */

import { test as setup, expect } from "@playwright/test";

// Test user credentials - use dedicated E2E test accounts
const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL || "e2e-test@switchcv.dev";
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "TestPassword123!";

const authFile = ".auth/user.json";

setup("authenticate", async ({ page }) => {
  // Navigate to auth page
  await page.goto("/auth");

  // Wait for auth page to load
  await expect(page.locator("h2")).toContainText(
    /Welcome Back|Join the Future/i
  );

  // Check if we're on sign-in mode (not sign-up)
  const signInButton = page.getByRole("button", { name: /Sign In/i });
  const createAccountButton = page.getByRole("button", {
    name: /Create Account/i,
  });

  // If we see "Create Account", we need to switch to sign-in mode
  if (
    await createAccountButton.isVisible({ timeout: 2000 }).catch(() => false)
  ) {
    await page
      .getByRole("button", { name: /Already have an account/i })
      .click();
    await expect(signInButton).toBeVisible();
  }

  // Fill in credentials
  await page.getByPlaceholder(/email/i).fill(E2E_TEST_EMAIL);
  await page.getByPlaceholder(/password/i).fill(E2E_TEST_PASSWORD);

  // Click sign in
  await page.getByRole("button", { name: /Sign In/i }).click();

  // Wait for successful redirect to dashboard or role selection
  await expect(page).toHaveURL(/\/(dashboard|select-role)/, { timeout: 30000 });

  // If redirected to select-role, the user needs role setup
  // For E2E tests, we'll handle this in individual test files

  // Save auth state
  await page.context().storageState({ path: authFile });
});
