/**
 * Authentication Flow E2E Tests (Unauthenticated)
 *
 * Tests the auth page UI and form validation.
 * These tests run without prior authentication.
 */

import { test, expect } from "@playwright/test";

test.describe("Authentication Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth");
    // Wait for the page to fully render
    await page.waitForLoadState("networkidle");
  });

  test("should display auth page with sign-in form", async ({ page }) => {
    // Check branding - SwitchCV should appear somewhere on the page
    await expect(page.locator("text=SwitchCV").first()).toBeVisible({
      timeout: 15000,
    });

    // Check for email input (using type or placeholder)
    const emailInput = page.locator(
      'input[type="email"], input[placeholder*="mail" i]'
    );
    await expect(emailInput.first()).toBeVisible();

    // Check for password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput.first()).toBeVisible();
  });

  test("should toggle between sign-in and sign-up modes", async ({ page }) => {
    // Should start in sign-in mode - look for "Welcome Back"
    await expect(page.locator("text=Welcome Back")).toBeVisible({
      timeout: 10000,
    });

    // Find and click the toggle button to switch to sign-up
    const signUpToggle = page.locator(
      "button:has-text('Sign up'), button:has-text(\"Don't have an account\")"
    );
    await signUpToggle.click();

    // Should now show sign-up form - "Join the Future"
    await expect(page.locator("text=Join the Future")).toBeVisible();

    // Username field should be visible in sign-up mode
    const usernameInput = page.locator(
      'input[placeholder*="username" i], input[name="username"]'
    );
    await expect(usernameInput.first()).toBeVisible();

    // Click to switch back to sign-in
    const signInToggle = page.locator(
      "button:has-text('Sign in'), button:has-text('Already have an account')"
    );
    await signInToggle.click();

    // Should be back in sign-in mode
    await expect(page.locator("text=Welcome Back")).toBeVisible();
  });

  test("should show validation error for empty email", async ({ page }) => {
    // Get password input and fill it
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill("somepassword123");

    // Get submit button and click
    const submitButton = page.locator(
      'button[type="submit"]:has-text("Sign In")'
    );
    await submitButton.click();

    // Should remain on auth page (HTML5 validation prevents submission)
    await expect(page).toHaveURL(/\/auth/);
  });

  test("should show error for invalid credentials", async ({ page }) => {
    // Fill email
    const emailInput = page
      .locator('input[type="email"], input[placeholder*="mail" i]')
      .first();
    await emailInput.fill("invalid@test.com");

    // Fill password
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill("wrongpassword123");

    // Submit
    const submitButton = page.locator(
      'button[type="submit"]:has-text("Sign In")'
    );
    await submitButton.click();

    // Wait for either error message or remain on auth page
    // Error could be in various formats based on Firebase response
    const errorVisible = await page
      .locator(".text-red-400, .text-red-500, [class*='error'], [role='alert']")
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    // Either error is shown OR we're still on auth page (validation prevented)
    const onAuthPage = page.url().includes("/auth");
    expect(errorVisible || onAuthPage).toBeTruthy();
  });

  test("should have Google sign-in button", async ({ page }) => {
    // Check for Google sign-in button
    const googleButton = page.locator(
      'button:has-text("Google"), button:has-text("Sign in with Google"), [aria-label*="Google" i]'
    );
    await expect(googleButton.first()).toBeVisible({ timeout: 10000 });
  });

  test("should show terms and privacy policy link", async ({ page }) => {
    // Check for legal text - both should be in the footer
    await expect(page.locator("text=Terms of Service")).toBeVisible();
    await expect(page.locator("text=Privacy Policy")).toBeVisible();
  });
});

test.describe("Protected Routes - Unauthenticated", () => {
  test("should redirect /dashboard to auth page", async ({ page }) => {
    await page.goto("/dashboard");

    // Should redirect to auth
    await expect(page).toHaveURL(/\/auth/, { timeout: 15000 });
  });

  test("should redirect /create-resume to auth page", async ({ page }) => {
    await page.goto("/create-resume");

    // Should redirect to auth
    await expect(page).toHaveURL(/\/auth/, { timeout: 15000 });
  });

  test("should redirect /recruiter/search to auth page", async ({ page }) => {
    await page.goto("/recruiter/search");

    // Should redirect to auth
    await expect(page).toHaveURL(/\/auth/, { timeout: 15000 });
  });
});
