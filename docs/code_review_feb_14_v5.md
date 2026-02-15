# Code Review — February 14, 2026 (v5 — Remaining Issue Fixes)

**Scope:** 6 remaining issues in recruiter module (2 P1, 4 P2)  
**Status:** ✅ ALL FIXES APPLIED — TypeScript clean, 37/37 tests pass across 3 suites

---

## P1 — Token Verification Bugs (Critical)

### P1-1: Token ID Mismatch — ✅ FIXED

**Files:** `src/lib/tokenGenerator.ts`, `src/app/api/recruiters/approve-contact/route.ts`  
**Issue:** `generateToken()` always generated a random `tokenId` via `crypto.randomUUID()`, ignoring any `tokenId` passed in by the caller. Meanwhile, `approve-contact` stored `contactRequest.id` as `tokenId`, and the Firestore doc got yet another auto-generated ID via `.add()`. The three IDs (JWT payload, stored field, Firestore doc) were all different, causing `verify-token` to fail on the `payload.tokenId !== tokenId` check for valid tokens.  
**Fix:**
- `tokenGenerator.ts`: `generateToken()` now honors `payload.tokenId` when provided, falling back to `crypto.randomUUID()` only when absent
- `approve-contact/route.ts`: Restructured to **create-doc-first** pattern — creates Firestore doc to get `tokenRef.id`, generates token using that ID as `tokenId`, then updates the doc with `tokenHash`. All three IDs are now identical.

### P1-2: verify-token No Ownership Binding — ✅ FIXED

**File:** `src/app/api/recruiters/verify-token/route.ts`  
**Issue:** Route authenticated the caller (`authUserId`) but never verified that the caller owned the token being verified. The only recruiter check used the client-supplied `recruiterId` query param, which any authenticated user could set to any value. This allowed any authenticated user to verify and extract metadata from any recruiter's token.  
**Fix:** Added server-side ownership check: `authUserId` must match the token's `recruiterId` (from JWT payload or stored Firestore data). Returns 403 if mismatch. This check runs before revocation/expiry checks and cannot be bypassed by manipulating query params.

---

## P2 — Medium Priority Fixes

### P2-1: Notification expiresAt Uses serverTimestamp() — ✅ FIXED

**File:** `src/app/api/recruiters/approve-contact/route.ts`  
**Issue:** Both recruiter and candidate notification documents stored `expiresAt: serverTimestamp()`, which resolves to the current server time — not the actual token expiry. Notifications would show the wrong expiration date.  
**Fix:** Replaced with `new Date(tokenExpiry * 1000)` — the actual computed token expiry timestamp.

### P2-2: Client-Spoofable Recruiter Identity — ✅ FIXED

**File:** `src/app/api/recruiters/request-contact/route.ts`  
**Issue:** `recruiterName`, `recruiterEmail`, and `companyName` were taken directly from the request body and stored in both the contact request and admin notification. A malicious recruiter could impersonate another company or individual.  
**Fix:** After fetching the recruiter's profile from Firestore (already done for subscription tier checks), the route now uses server-side `displayName`/`name`, `email`, and `companyName`/`company` fields from the recruiter's user document only. Client-supplied identity fields are no longer used.

### P2-3: Access-Status 200-Record Truncation — ✅ FIXED

**File:** `src/app/api/recruiter/search-resumes/access-status.ts`  
**Issue:** `buildAccessStatusMap()` used `.limit(200)` on both `accessRequests` and `accessGrants` collection-group queries, silently truncating results for recruiters with >200 records. This caused under-reporting of access status in search results.  
**Fix:** Increased limit to 1000 on both queries. Added `logger.error()` warnings when results hit the 1000-record ceiling to flag potential truncation for monitoring.

### P2-4: verify-token Tests Broken — ✅ FIXED

**File:** `src/app/api/recruiters/verify-token/route.test.ts`  
**Issue:** Tests only mocked `handleApiError` from `api-helpers`, but the route now also imports `getAuthenticatedUserId`. Missing mock caused `TypeError: getAuthenticatedUserId is not a function` — all 4 tests crashed.  
**Fix:** 
- Added `getAuthenticatedUserId` mock (returns `{ userId: "recruiter-123" }`)
- Added `VerifyRecruiterTokenSchema` mock for Zod validation
- Added `recruiterId` to test payloads for ownership check compatibility
- Added new test: "should return 403 when authenticated user does not own the token"
- Added new test: "should verify token using tokenId-only flow"
- Result: 6/6 tests passing (was 0/4)

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/lib/tokenGenerator.ts` | Honor caller-supplied `tokenId` |
| `src/app/api/recruiters/approve-contact/route.ts` | Create-doc-first + correct notification `expiresAt` |
| `src/app/api/recruiters/verify-token/route.ts` | Ownership binding (`authUserId === tokenRecruiterId`) |
| `src/app/api/recruiters/request-contact/route.ts` | Server-side recruiter identity |
| `src/app/api/recruiter/search-resumes/access-status.ts` | Limit 200→1000 + truncation warnings |

### Test Files Updated

| File | Change |
|------|--------|
| `src/app/api/recruiters/verify-token/route.test.ts` | Full rebuild: auth + schema mocks, ownership test |
| `src/app/api/recruiters/request-contact/route.test.ts` | Added `getUserRole` mock + dual resume lookup mock |
| `src/app/api/recruiter/search-resumes/access-status.test.ts` | Added `.limit()` to mock chain |

## Verification

- **TypeScript:** Compiles clean (`npx tsc --noEmit` — 0 errors)
- **verify-token tests:** 6/6 passing
- **request-contact tests:** 15/15 passing
- **access-status tests:** 16/16 passing
- **Total:** 37/37 tests passing across 3 suites
