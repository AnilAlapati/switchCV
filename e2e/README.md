# E2E Testing with Playwright

This directory contains end-to-end tests using Playwright.

## Running Tests

```bash
# Run all E2E tests
npm run e2e

# Run tests with UI mode (interactive)
npm run e2e:ui

# Run tests in debug mode
npm run e2e:debug

# View test report
npm run e2e:report
```

## Test Structure

- `auth.setup.ts` - Authentication setup (runs once before authenticated tests)
- `auth.unauth.spec.ts` - Tests for unauthenticated flows (auth page, redirects)
- `jobseeker-flow.spec.ts` - Tests for jobseeker user journeys
- `recruiter-flow.spec.ts` - Tests for recruiter user journeys

## Authentication

Tests use a persistent authentication state stored in `.auth/user.json`. The setup script (`auth.setup.ts`) handles login once, and subsequent tests reuse that session.

### Environment Variables for Auth

Set these in your `.env.local` or as environment variables:

```
E2E_TEST_EMAIL=test@example.com
***REMOVED***your-test-password
```

## Dev Mode Testing

The tests run against the dev server with enterprise tier enabled (`npm run dev:enterprise`). This bypasses tier restrictions for testing all features.

To test with specific roles:

- Jobseeker: `npm run dev:enterprise:jobseeker`
- Recruiter: `npm run dev:enterprise:recruiter`

## Project Configuration

Tests are organized into projects in `playwright.config.ts`:

1. **setup** - Runs authentication (once)
2. **chromium** - Authenticated tests
3. **chromium-unauthenticated** - Tests without auth state

## Writing New Tests

```typescript
import { test, expect } from "@playwright/test";

test("my test", async ({ page }) => {
  await page.goto("/my-page");
  await expect(page.locator("h1")).toBeVisible();
});
```

For authenticated tests, they automatically use the saved auth state from the setup project.

For unauthenticated tests, add them to the `auth.unauth.spec.ts` file or create a new spec that doesn't depend on the setup project.
