# Code Review — February 14, 2026 (v4 — Security Consolidation)

**Scope:** Cross-tenant IDOR vulnerabilities + token security in recruiter module  
**Severity:** 5 P0 (Critical) + 4 P1 (High) issues found — **ALL RESOLVED**  
**Status:** ✅ ALL FIXES APPLIED — TypeScript clean, 38/38 tests pass

---

## P0 — Cross-Tenant IDOR Vulnerabilities (Critical)

> These allow **any authenticated recruiter** to read/modify resources belonging to **other recruiters** by guessing or enumerating document IDs.

### P0-1: Admin Migration Missing Admin Role Check — ✅ FIXED

**File:** `src/app/api/admin/migrate-numeric-ids/route.ts`  
**Issue:** `migrateAll` action only checked authentication, not admin role. Any authenticated user could trigger full database migration.  
**Fix:** Added `verifyAdminRole(userId)` gate before `migrateAll` execution. Returns 403 if non-admin.

### P0-2: Candidates API — No Ownership Enforcement — ✅ FIXED

**File:** `src/app/api/recruiter/candidates/route.ts`  
**Issue:** `update-priority`, `add-note`, and GET operations accepted any valid `candidateId` without verifying the candidate belongs to the requesting recruiter.  
**Fix:**
- Added `createdBy === authUserId` ownership check to `update-priority` and `add-note` actions
- Added ownership verification to GET by ID
- Added `.where("createdBy", "==", authUserId)` filter to list-all query

### P0-3: Bulk Actions API — No Ownership Enforcement — ✅ FIXED

**File:** `src/app/api/recruiter/bulk-actions/route.ts`  
**Issue:** `execute` and `cancel` actions accepted any `bulkActionId` without verifying ownership. GET endpoints exposed cross-tenant data.  
**Fix:**
- Added `createdBy === authUserId` ownership check to `execute`, `cancel`, and GET by ID
- Added `.where("createdBy", "==", authUserId)` filter to list-all query

### P0-4: Interviews API — No Ownership Enforcement — ✅ FIXED

**File:** `src/app/api/recruiter/interviews/route.ts`  
**Issue:** `update-status`, `add-feedback`, and all GET operations lacked ownership checks. The `schedule` action didn't store `createdBy` at all.  
**Fix:**
- Added `createdBy: authUserId` to interview document creation in `schedule`
- Added `createdBy === authUserId` ownership check to `update-status`, `add-feedback`, and GET by ID
- Added `.where("createdBy", "==", authUserId)` filter to `get-upcoming`, GET by candidateId, and list-all queries

### P0-5: Pipeline API — Client-Supplied recruiterId + No Ownership — ✅ FIXED

**Files:** `src/app/api/recruiter/pipeline/route.ts`, `src/lib/services/recruiter/pipeline-service.ts`  
**Issue:** `initialize` accepted client-supplied `recruiterId` (impersonation). All other actions (`add-candidate`, `move-candidate`, `get-stage`, GET) lacked ownership verification.  
**Fix:**
- `initialize` now ignores client `recruiterId` — always uses `authUserId`
- Added `getPipelineOwner()` helper to `pipeline-service.ts` for efficient ownership lookups
- All mutation and read operations verify `pipeline.recruiterId === authUserId`

---

## P1 — Token Security (High)

### P1-1: Raw Token Stored in Firestore — ✅ FIXED

**File:** `src/app/api/recruiters/approve-contact/route.ts`  
**Issue:** Line 151 stored `token` (the raw JWT) alongside `tokenHash` in the ACCESS_TOKENS collection. If Firestore is compromised, attackers get valid tokens.  
**Fix:** Removed `token` field from stored data. Only `tokenHash` is persisted.

### P1-2: Unauthenticated verify-token Endpoint — ✅ FIXED

**File:** `src/app/api/recruiters/verify-token/route.ts`  
**Issue:** Both GET and POST handlers had no authentication check. Anyone could probe token validity and extract access metadata.  
**Fix:** Added `getAuthenticatedUserId()` check to both GET and POST handlers. Returns 401 if unauthenticated.

### P1-3: Token Expiry Overwritten by serverTimestamp() — ✅ FIXED

**File:** `src/app/api/recruiters/approve-contact/route.ts`  
**Issue:** Lines 163-177 used `serverTimestamp()` for `issuedAt`, `expiresAt`, and `accessExpiresAt`, which **overwrote** the correctly computed dates with the current server time. All tokens expired immediately or had wrong expiry.  
**Fix:** 
- Token document now uses the computed `new Date(now * 1000)` and `new Date(tokenExpiry * 1000)` values directly
- Contact request `accessExpiresAt` uses computed date instead of `serverTimestamp()`

### P1-4: Token Preview Leaked in Notification and Response — ✅ FIXED

**File:** `src/app/api/recruiters/approve-contact/route.ts`  
**Issue:** Line 193 stored `token.substring(0, 20) + "..."` in recruiter notification (Firestore). Line 255 returned `token.substring(0, 50) + "..."` in API response. Both leak token prefixes.  
**Fix:** Removed token from both notification document and API response. Clients should reference tokens by `tokenId` only.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/app/api/admin/migrate-numeric-ids/route.ts` | Added `verifyAdminRole()` for `migrateAll` |
| `src/app/api/recruiter/candidates/route.ts` | Ownership checks on all mutation/read operations |
| `src/app/api/recruiter/bulk-actions/route.ts` | Ownership checks on all mutation/read operations |
| `src/app/api/recruiter/interviews/route.ts` | `createdBy` on schedule + ownership checks everywhere |
| `src/app/api/recruiter/pipeline/route.ts` | Ignore client `recruiterId` + ownership on all ops |
| `src/lib/services/recruiter/pipeline-service.ts` | New `getPipelineOwner()` helper |
| `src/app/api/recruiters/approve-contact/route.ts` | Token security: no raw storage, correct expiry, no leaks |
| `src/app/api/recruiters/verify-token/route.ts` | Added authentication to GET and POST |

### Test Files Updated

| File | Change |
|------|--------|
| `src/__tests__/api/recruiter-candidates.test.ts` | Added `createdBy` to mocks |
| `src/__tests__/api/recruiter-bulk-actions.test.ts` | Added `createdBy` to mocks |
| `src/__tests__/api/recruiter-interviews.test.ts` | Added `createdBy` to mocks |
| `src/__tests__/api/recruiter-pipeline.test.ts` | Added `recruiterId` to mocks |

## Verification

- **TypeScript:** Compiles clean (`npx tsc --noEmit` — 0 errors)
- **Tests:** 38/38 passing across 5 test suites
- **Not deployed:** Changes are on branch `feature/feb_14_10pm`, not deployed to dev or prod

---

## Phase 2 — Remaining P1/P2 Gaps (High/Medium)

### [P1] Missing Recruiter Role Enforcement — ✅ FIXED
**Routes:** `agent/analyze`, `agent/outreach`, `agent/pipeline-suggest`, `agent/screen`, `agent/enhance-job`, `agent/interview-prep`, `recruiters/request-contact`  
**Issue:** Verified authentication but allowed basic users to hit recruiter-only AI endpoints.  
**Fix:** Added `getUserRole()` check to all 7 routes. Returns 403 for non-recruiters.

### [P1] Token Verification Hardening — ✅ FIXED
**File:** `src/app/api/recruiters/verify-token/route.ts`  
**Issues:** Trusts client-supplied IP (Allowlist bypass); Fails for Firestore `Timestamp` expiry.  
**Fix:** 
- Switched to server-derived `x-forwarded-for` IP for allowlist validation.
- Added `(expiresAt as any)?.toDate()` support in expiry parsing.

### [P1] Sensitive Data Log Sanitization — ✅ FIXED
**Files:** `approve/route.ts`, `decline/route.ts`, `authService.ts`  
**Issue:** Raw reset/approval tokens were being logged on error/warning paths.  
**Fix:** Removed `token` field from all `logger.warn`/`logger.error` objects in these files.

### [P1] Schema Normalization (Legacy Route) — ✅ FIXED
**File:** `src/app/api/recruiter/request-access/route.ts`  
**Issue:** Legacy write pattern mismatch (`userId` vs `toUserId`, missing `fromRecruiter` object).  
**Fix:** Normalized schema to use `toUserId` and full `fromRecruiter` object with recruiter profile data.

---

## Phase 3 — P2 Fixes (Medium Priority)

### [P2] Password Reset Tokens Stored in Plaintext — ✅ FIXED
**Files:** `request-password-reset/route.ts`, `reset-password/route.ts`  
**Issue:** Raw reset token stored and queried directly in Firestore.  
**Fix:** Store `tokenHash` (SHA-256) instead of raw token. On reset, hash incoming token and query by hash.

### [P2] Email Verification Tokens Stored in Plaintext — ✅ FIXED
**Files:** `functions/src/emailFunctions.ts`, `src/lib/services/authService.ts`  
**Issue:** Verification token stored as raw value and looked up directly.  
**Fix:** Cloud Functions now store `tokenHash`. Auth service hashes incoming token before lookup.

### [P2] Notification Statistics Global Access — ✅ FIXED
**Files:** `notifications/route.ts`, `firestoreRepository.ts`  
**Issue:** Authenticated caller could omit `userId` to get global stats; unbounded collection scan.  
**Fix:** Always require `userId` (enforced via `authUserId`). Added `.limit(500)` to query. Made `recipientId` filter mandatory.

### [P2] Notification Delivery-Status Lacks Ownership Check — ✅ FIXED
**File:** `notifications/route.ts`  
**Issue:** `get-delivery-status` returned status by ID without verifying ownership.  
**Fix:** Added `recipientId === authUserId` ownership check before returning delivery status.

### [P2] Unbounded Collection-Group Reads in Access-Status — ✅ FIXED
**File:** `recruiter/search-resumes/access-status.ts`  
**Issue:** `buildAccessStatusMap` performs unbounded collection-group queries for all recruiter access docs.  
**Fix:** Added `.limit(200)` to both `accessRequests` and `accessGrants` collection-group queries.

### [P2] Resume Indexing Debounce Suppresses Real Updates — ✅ FIXED
**File:** `functions/src/indexResumeService.ts`  
**Issue:** Debounce check runs before content-change check; real edits during debounce window are skipped.  
**Fix:** Reordered logic: content-change check first, then debounce. Only debounces when content actually changed.

### [P2] Request-Contact Checks Only Legacy Collection — ✅ FIXED
**File:** `recruiters/request-contact/route.ts`  
**Issue:** Route validates resume only in `resumeProfiles`; canonical path persists to `resumes`.  
**Fix:** Dual lookup: query canonical `resumes` first, then fallback to legacy `resumeProfiles`.

### ~~[P2] Billing Rollover Race Condition~~ — SKIPPED
**Reason:** No billing system built yet. Will address when billing is implemented.
