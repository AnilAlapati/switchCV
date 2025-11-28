import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration for SwitchCV
 *
 * Run tests with:
 *   npm run e2e          - Run all tests headless
 *   npm run e2e:ui       - Open Playwright UI
 *   npm run e2e:debug    - Debug mode with browser visible
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: "./e2e",

  // Run tests in parallel (but not on first run to avoid cold start issues)
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,

  // Retry failed tests (more retries in CI for flaky network tests)
  retries: process.env.CI ? 2 : 1,

  // Parallel workers - limit to 2 to reduce cold start contention
  workers: process.env.CI ? 1 : 2,

  // Reporter configuration
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  // Global setup to warm up the server
  globalSetup: "./e2e/global-setup.ts",

  // Shared settings for all projects
  use: {
    // Base URL for tests - Next.js dev server
    baseURL: "http://localhost:3000",

    // Collect trace on first retry
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "retain-on-failure",

    // Default timeout for actions
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Test timeout
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  // Configure projects for browsers
  projects: [
    // Setup project for authentication (only if credentials are set)
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    // Chromium tests requiring authentication
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use stored auth state from setup
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
      // Only run if E2E credentials are configured
      testIgnore: process.env.E2E_TEST_EMAIL ? [] : [/.*/],
    },

    // Unauthenticated tests (always run, no setup dependency)
    {
      name: "chromium-unauthenticated",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /.*\.unauth\.spec\.ts/,
    },
  ],

  // Run local dev server before tests
  webServer: {
    command: "npm run dev:enterprise",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // 2 minutes to start
    stdout: "pipe",
    stderr: "pipe",
  },
});
