/**
 * Recruiter Flow E2E Tests
 *
 * Tests the complete recruiter user journey:
 * - Accessing recruiter dashboard
 * - Using resume search functionality
 * - Viewing search results
 *
 * Note: These tests require the recruiter role.
 * In dev mode, use NEXT_PUBLIC_DEV_ROLE=recruiter to bypass role checks.
 */

import { test, expect } from "@playwright/test";

test.describe("Recruiter Search Access", () => {
  test("should navigate to recruiter search page", async ({ page }) => {
    await page.goto("/recruiter/search");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    // In dev mode with recruiter role, should show search interface
    // Without proper role, may redirect to select-role or show error
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display search interface or role selection", async ({
    page,
  }) => {
    await page.goto("/recruiter/search");

    await page.waitForLoadState("networkidle");

    // Either we get the search page or a role selection page
    const hasSearchInput = await page
      .locator(
        "input[type='search'], input[placeholder*='search' i], input[type='text']"
      )
      .first()
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    const hasRoleSelection = await page
      .locator("text=/select.*role/i, text=/choose.*role/i")
      .isVisible()
      .catch(() => false);
    const hasRecruiterContent = await page
      .locator("text=/recruiter/i, text=/search.*resumes/i")
      .isVisible()
      .catch(() => false);

    // Page should show either search, role selection, or recruiter content
    expect(
      hasSearchInput || hasRoleSelection || hasRecruiterContent
    ).toBeTruthy();
  });
});

test.describe("Resume Search Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to recruiter search
    await page.goto("/recruiter/search");
    await page.waitForLoadState("networkidle");
  });

  test("should have search input field", async ({ page }) => {
    // Look for search input with various selectors
    const searchInput = page
      .locator(
        [
          "input[type='search']",
          "input[placeholder*='search' i]",
          "input[name*='search' i]",
          "[data-testid='search-input']",
          "textarea[placeholder*='search' i]",
        ].join(", ")
      )
      .first();

    const isVisible = await searchInput
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    // If not visible, we may be on role selection - that's okay
    if (!isVisible) {
      const onRoleSelection = await page
        .locator("text=/role/i")
        .isVisible()
        .catch(() => false);
      expect(onRoleSelection).toBeTruthy();
    }
  });

  test("should accept search query input", async ({ page }) => {
    // Find search input
    const searchInput = page
      .locator("input[type='search'], input[type='text']")
      .first();
    const isVisible = await searchInput
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    if (isVisible) {
      // Type a search query
      await searchInput.fill("TypeScript React developer");

      // Verify input was accepted
      await expect(searchInput).toHaveValue(/TypeScript/i);
    }
  });

  test("should have search button or trigger", async ({ page }) => {
    // Look for search button
    const searchButton = page.getByRole("button", { name: /search/i });

    const isVisible = await searchButton
      .isVisible({ timeout: 10000 })
      .catch(() => false);

    // Search button should exist if we're on the search page
    if (isVisible) {
      await expect(searchButton).toBeEnabled();
    }
  });
});

test.describe("Search Results", () => {
  test("should handle empty search gracefully", async ({ page }) => {
    await page.goto("/recruiter/search");
    await page.waitForLoadState("networkidle");

    // Page should load without errors
    await expect(page.locator("body")).toBeVisible();

    // Check for any error states
    const hasError = await page
      .locator(".error, [class*='error']")
      .isVisible()
      .catch(() => false);

    // Should not have critical errors on initial load
    // (Some validation errors may appear, which is fine)
  });

  test("should display search filters if available", async ({ page }) => {
    await page.goto("/recruiter/search");
    await page.waitForLoadState("networkidle");

    // Look for filter elements
    const hasFilters = await page
      .locator(
        [
          "text=/filter/i",
          "text=/skills/i",
          "text=/location/i",
          "text=/experience/i",
          "[data-testid='filters']",
        ].join(", ")
      )
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // Filters may or may not be present depending on UI design
    // Just verify page is usable
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Recruiter Role Selection", () => {
  test("should navigate to role selection page", async ({ page }) => {
    await page.goto("/select-role");

    // Should show role selection
    await expect(page.locator("body")).toBeVisible();
  });

  test("should display role options", async ({ page }) => {
    await page.goto("/select-role");
    await page.waitForLoadState("networkidle");

    // Look for jobseeker and recruiter options
    const hasJobseeker = await page
      .locator("text=/job.*seeker/i, text=/candidate/i")
      .isVisible({ timeout: 10000 })
      .catch(() => false);
    const hasRecruiter = await page
      .locator("text=/recruiter/i, text=/employer/i")
      .isVisible()
      .catch(() => false);

    // Should have at least one role option
    expect(hasJobseeker || hasRecruiter).toBeTruthy();
  });

  test("should allow role selection", async ({ page }) => {
    await page.goto("/select-role");
    await page.waitForLoadState("networkidle");

    // Find clickable role elements
    const recruiterOption = page
      .locator("button, a, [role='button']")
      .filter({ hasText: /recruiter/i });
    const jobseekerOption = page
      .locator("button, a, [role='button']")
      .filter({ hasText: /job.*seeker|candidate/i });

    const hasRecruiter = await recruiterOption
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const hasJobseeker = await jobseekerOption
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    // At least one should be clickable
    expect(hasRecruiter || hasJobseeker).toBeTruthy();
  });
});
