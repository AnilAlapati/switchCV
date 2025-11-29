import { test, expect } from "@playwright/test";
import { verifyUserEmail, deleteUserByEmail } from "./utils/firebase-admin";

test.describe("Full Signup and Resume Creation Flow", () => {
  const timestamp = Date.now();
  const email = `test.e2e.${timestamp}@example.com`;
  const password = "TestPassword123!";
  const username = `user_${timestamp}`;

  test.afterAll(async () => {
    // Clean up user
    await deleteUserByEmail(email);
  });

  // Skipped due to insufficient permissions in key.json to verify user email via Admin SDK
  test.skip("should allow a user to sign up, verify email, select role, and create a resume", async ({ page }) => {
    // 1. Navigate to Auth Page
    await page.goto("/auth");
    await expect(page.locator("text=Welcome Back")).toBeVisible();

    // 2. Switch to Sign Up
    await page.click("button:has-text('Sign up')");
    await expect(page.locator("text=Join the Future")).toBeVisible();

    // 3. Fill Sign Up Form
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.fill('input[name="username"]', username);

    // Wait for username availability check
    await expect(page.locator("text=Username is available")).toBeVisible({ timeout: 10000 });

    // 4. Submit
    await page.click('button[type="submit"]:has-text("Create Account")');

    // 5. Wait a bit for backend creation
    await page.waitForTimeout(5000);

    // 6. Verify Email (Backend) - Try multiple times if needed
    let verified = false;
    for (let i = 0; i < 3; i++) {
      verified = await verifyUserEmail(email);
      if (verified) break;
      await page.waitForTimeout(2000);
    }
    expect(verified).toBe(true);

    // 7. Navigate to Dashboard directly
    // Since we are verified, we should be allowed in
    await page.goto("/dashboard");

    // 8. Should redirect to Role Selection (since new user has no role)
    await expect(page).toHaveURL(/\/select-role/, { timeout: 15000 });

    // 9. Select Job Seeker Role
    await page.click("button:has-text('Job Seeker')");

    // 10. Should redirect to Dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page.locator("text=Dashboard")).toBeVisible();

    // 11. Navigate to Create Resume
    await page.click("a[href='/create-resume']");
    await expect(page).toHaveURL(/\/create-resume/);

    // 12. Fill Resume Form (Basic)
    // Assuming there's a textarea for "paste resume" or similar
    const textArea = page.locator("textarea").first();
    await expect(textArea).toBeVisible();
    await textArea.fill("I am a software engineer with experience in React and Node.js.");

    // 13. Submit/Generate
    const generateButton = page.locator("button:has-text('Generate'), button:has-text('Next')").first();
    await generateButton.click();

    // 14. Verify Result (e.g., redirected to view resume or success message)
    // This depends on the exact flow, but we expect *some* change or success
    // For now, just checking we don't crash is a good start, or check for "Generating"
    await expect(page.locator("text=Generating").or(page.locator("text=Success"))).toBeVisible({ timeout: 10000 });
  });
});
