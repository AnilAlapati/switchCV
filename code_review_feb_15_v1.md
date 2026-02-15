# Code Review Feb 15 v1

## Scope
Implemented and verified all 5 requested fixes from the full-repo audit:
1. GDPR deletion schema drift for recruiter-related collections.
2. Recruiter contact quota consumed too early and not refunded on write failure.
3. Broken `test:security` wiring (backup-file security test not actually running).
4. Recruiter access-status map truncation risk at 1000 documents.
5. Functions recruiter request service schema mismatch between create and approve/deny.

## Changes Implemented

### 1) GDPR account deletion now covers normalized + legacy recruiter schemas
**File:** `functions/src/services/userDataService.ts`

- Added `deleteCollectionByUserMappings(...)` helper to delete across multiple identity fields during schema transitions.
- Updated recruiter-related deletion phase to clean across both old and new fields:
  - `recruiterRequests`: `fromRecruiter.recruiterId`, `recruiterId`, `toUserId`, `userId`, `candidateId`
  - `recruiterNotifications`: `recruiterId`, `toUserId`, `userId`
  - `recruiterSearchHistory`: `recruiterId`, `userId`
  - `recruiterInterviews`: `createdBy`, `recruiterId`, `userId`
  - `recruiterPipelines`: `recruiterId`, `userId`
  - `recruiterCandidates`: `createdBy`, `recruiterId`, `userId`
  - `recruiterBulkActions`: `createdBy`, `recruiterId`, `userId`

**Impact:** Prevents GDPR/account-delete misses caused by schema evolution.

### 2) Quota handling corrected for recruiter request-access flow
**File:** `src/app/api/recruiter/request-access/route.ts`

- Moved quota consumption to happen **after** recruiter/profile/resume/user validations and duplicate-pending-request checks.
- Added quota refund path (`refundQuota`) when quota is reserved but Firestore write fails.
- Preserved existing quota exceeded behavior and messaging.

**Impact:** Prevents charging quota for invalid/duplicate requests and avoids quota leakage on write failures.

### 3) Security test wiring fixed
**Files:**
- `package.json`
- `jest.security.config.cjs` (new)

- Replaced broken script:
  - from: `jest tests/security --testPathPattern=backup`
  - to: `jest --watchman=false --config jest.security.config.cjs`
- Added dedicated Jest config for `tests/security/**/*.test.ts` and ignored `.firebase/` path to avoid haste collisions.

**Impact:** `npm run test:security` now reliably runs the intended backup-file security test.

### 4) Access-status aggregation now paginates collection-group reads
**File:** `src/app/api/recruiter/search-resumes/access-status.ts`

- Added paginated fetch helper for collection-group queries using:
  - `orderBy("__name__")`
  - `startAfter(...)`
  - page size `1000`
- Replaced single-query limited reads with full pagination for:
  - `accessRequests` (`fromUserId == recruiterId`)
  - `accessGrants` (`toUserId == recruiterId`)

**Impact:** Eliminates silent truncation risk for high-volume recruiters.

### 5) Functions recruiter request service made schema-compatible
**File:** `functions/src/services/recruiterRequestService.ts`

- `create(...)` now writes normalized fields (`fromRecruiter`, `toUserId`) while preserving legacy fields for compatibility.
- `approve(...)` and `deny(...)` now read identifiers from normalized **or** legacy fields with explicit fallback.
- Added guard to throw clear error if required identifiers are missing.

**Impact:** Prevents runtime crashes when handling requests created with different schema shapes.

## Tests Executed

### App tests (targeted)
- `npm run test -- --watchman=false src/app/api/recruiter/request-access/route.test.ts src/app/api/recruiter/search-resumes/access-status.test.ts src/app/api/recruiters/request-contact/route.test.ts src/app/api/recruiters/verify-token/route.test.ts`
- Result: **PASS** (4 suites, 42 tests)

### Security test command (fixed)
- `npm run test:security`
- Result: **PASS** (`tests/security/backup-files.test.ts`, 2 tests)

### Type check
- `npx tsc --noEmit`
- Result: **PASS**

### Functions tests and build
- `npm test -- --watchman=false` (in `functions/`)
- Result: **PASS** (5 suites, 36 tests)
- `npm run build` (in `functions/`)
- Result: **PASS**

### Lint (changed app files)
- `npm run lint -- src/app/api/recruiter/request-access/route.ts src/app/api/recruiter/search-resumes/access-status.ts src/app/api/recruiter/request-access/route.test.ts src/app/api/recruiter/search-resumes/access-status.test.ts`
- Result: **PASS**

## Notes
- Existing unrelated workspace modifications were left untouched.
- Functions test suite still prints an existing open-handle warning about worker shutdown; tests still pass.
