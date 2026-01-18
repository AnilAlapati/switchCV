# NPM Run Test Failures Report

This report lists the current issues in the test suite as of `2026-01-06`.

## Summary
- **Total Test Suites**: 332
- **Passed Suites**: 317
- **Failed Suites**: 13
- **Total Tests**: 3408
- **Passed Tests**: 3326
- **Failed Tests**: 40

---

## 1. Profiles & Access Management
This section covers failures related to resume access requests, approvals, and status checking.

### [FAIL] `src/app/api/profiles/approve-access/approve-access.test.ts`
- **Issue**: Mocking failure for `getAuthenticatedUserId`.
- **Error**: `TypeError: _apiHelpers.getAuthenticatedUserId.mockResolvedValue is not a function`.
- **Root Cause**: Potential mismatch in how `getAuthenticatedUserId` is imported or exported in the test environment (possibly a barrel export issue or `jest.mock` placement).

### [FAIL] `src/app/api/profiles/respond-access/route.test.ts`
- **Issue 1**: Error message mismatch. Expected `"Request not found"`, received `"Not found"`.
- **Issue 2**: Unexpected 500 status on approval. Received 500 when 200 was expected.
- **Root Cause**: Likely a change in the API's standard error reporting or an unhandled exception in the `respond-access` service logic.

### [FAIL] `src/__tests__/api/profiles-approve-access.test.ts`
- **Issue**: Status code mismatch. Expected `404`, received `400`.
- **Root Cause**: Validations might be catching the error before the "Not Found" check.

### [FAIL] `src/__tests__/api/profiles-check-access.test.ts`
- **Issue**: Persistent 500 errors instead of expected 404 or 200.
- **Root Cause**: Likely a failure in the underlying `AccessService` or database mock.

### [FAIL] `src/app/api/profiles/check-access/check-access.test.ts`
- **Issue**: Received 500 when 404 was expected for non-existent resume.

### [FAIL] `src/__tests__/api/profiles-respond-access.test.ts`
- **Issue**: Multiple 500 errors during approval/denial tests.

---

## 2. Analytics & Reporting
Failures in the analytics dashboard and system-level reporting.

### [FAIL] `src/app/api/analytics/dashboard/route.test.ts`
- **Issue 1**: `viewCount` received `0` when expecting `>= 10`.
- **Issue 2**: Schema mismatch in `benchmarks` object. Expected `benchmark` (singular), received `benchmarks` (plural).
- **Root Cause**: Refactored response structure in the API that hasn't been updated in the tests.

### [FAIL] `src/__tests__/api/analytics-system.test.ts`
- **Issue**: Received 500 instead of 404 when user is not found.

---

## 3. Recruiter Dashboard
Failures related to recruiter-specific metrics and requests.

### [FAIL] `src/__tests__/api/recruiter/requests.test.ts`
- **Issue 1**: `TypeError: Cannot read properties of undefined (reading 'status')` for `GET` requests.
- **Issue 2**: `TypeError: (0 , _route.POST) is not a function` for `POST` requests.
- **Root Cause**: Potential export issue in `src/app/api/recruiter/requests/route.ts` or incorrect import in the test.

### [FAIL] `src/__tests__/api/recruiter-metrics.test.ts`
- **Issue**: Lazy migration failing. Expected `pending` count of 1, received 0.

---

## 4. Jobseeker Metrics
Failures in jobseeker-facing analytics.

### [FAIL] `src/__tests__/api/jobseeker/metrics.test.ts`
- **Issue**: `TypeError: Cannot read properties of undefined (reading 'status')`.
- **Root Cause**: The `GET` handler is likely returning `null` or `undefined` instead of a `Response` object.

---

## 5. AI & Resume Generation
Failures in the AI-enhanced resume generation flow.

### [FAIL] `src/__tests__/api/generate-resume.test.ts`
- **Issue**: Model name mismatch. Expected `"gemini-pro"`, received `"agentic-workflow"`.
- **Root Cause**: The API now returns the workflow type as the model name when agentic mode is enabled.

---

## 6. Drafts
Failures in managing resume drafts.

### [FAIL] `src/__tests__/app/api/drafts/[draftId]/route.test.ts`
- **Issue**: `mockUpdate` not called (`Number of calls: 0`).
- **Root Cause**: The update logic might be short-circuited or failing before hitting the database update call.
