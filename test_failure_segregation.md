# Test Failure Segregation & Migration Plan

This document breaks down the current test failures into logical groups for parallel processing by AI agents.

## Group 1: Firebase & Mocking Infrastructure (Core Fixes)

**Objective:** Resolve systemic mocking issues and Firebase Admin SDK mismatches in the test environment.

- **Failures:**
  - `TypeError: _firebaseAdmin.adminDb.runTransaction is not a function` in `distributedRateLimit.ts`.
  - `TypeError: resumeRef.collection(...).where(...).where is not a function` (Broken mock chaining in `accessService.ts`).
  - `Cannot read properties of undefined (reading 'mockReturnValue')` in recruiter metrics tests.
  - `Cannot read properties of undefined (reading 'doc')` in `resumeService.ts`.
- **Target Files:**
  - `src/lib/services/accessService.ts` [L77]
  - `src/lib/utils/distributedRateLimit.ts` [L123]
  - `src/lib/services/resumeService.ts` [L460]
  - `jest.setup.js` (Verify global mocks)

## Group 2: API Route Logic & Response Codes

**Objective:** Fix status code mismatches (500 vs 4xx) and standardized error responses.

- **Failures:**
  - `request-access` route returns 500 when 404/400 expected.
  - `drafts` route returns 404 ("Not found") when 403 ("Forbidden") expected.
  - `jobseeker/metrics` failing with undefined response status.
  - Standardize error messages (e.g., "Request not found" vs "Not found").
- **Target Files:**
  - `src/app/api/profiles/request-access/route.ts`
  - `src/app/api/profiles/approve-access/route.ts`
  - `src/app/api/drafts/route.ts`
  - `src/app/api/jobseeker/metrics/route.ts`
  - `src/lib/utils/api-helpers.ts`

## Group 3: Frontend Component Rendering & State

**Objective:** Resolve `act()` warnings and loading state blocks in React Testing Library.

- **Failures:**
  - `ProfileEditor` stuck in pulse/loading state, unable to find form labels.
  - `ResumeView` unable to find "Loading resume..." or transition to data view.
  - `SettingsPage` failing initial value assertions due to race conditions or mock data delay.
- **Target Files:**
  - `src/app/profile/page.tsx`
  - `src/app/profile/settings/page.tsx`
  - `src/app/resume/[id]/page.tsx`
  - Corresponding test files in `src/__tests__/app/`

## Group 4: AI & Data Extraction Accuracy

**Objective:** Improve regex/AI extraction patterns and fix rate-limited AI tests.

- **Failures:**
  - `extractionAccuracy.test.ts`: Name extraction accuracy at 33% (threshold 50%).
  - `ResumeDataExtractor` failing generic education/experience detection.
  - AI generation tests hitting rate limits (429) or failing to call mocked services.
- **Target Files:**
  - `src/lib/services/resumeDataExtractor.ts`
  - `src/__tests__/extractionAccuracy.test.ts`
  - `src/app/api/ai/generate/route.ts`

## Group 5: Hooks & Analytics Services

**Objective:** Fix logical errors in SWR hooks and analytics aggregation.

- **Failures:**
  - `useResume` hook returns stale/incorrect data objects during error states.
  - Analytics dashboard failing with `Cannot read properties of undefined (reading 'count')`.
- **Target Files:**
  - `src/hooks/useResume.ts`
  - `src/lib/services/analyticsService.ts`
  - `src/app/api/analytics/dashboard/route.ts`
