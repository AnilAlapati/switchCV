# Code Review — February 17, 2026 (v1)

## Executive Summary

| Category                   | Status                                                     | Change since Feb 16 |
| -------------------------- | ---------------------------------------------------------- | ------------------- |
| **TypeScript**             | ✅ 0 errors — clean compile                                | No change           |
| **ESLint**                 | ⚠️ 0 errors, 20 warnings                                   | 🔴 Regression (+15) |
| **Tests**                  | ❌ 4,196 pass / 11 fail (98.4%)                            | 🔴 Regression       |
| **API Routes**             | ✅ Token hashing implemented; Zod validation tightened     | 🟢 Improved         |
| **Middleware**             | 🔴 In-memory stores persist for Rate Limiting/CSRF         | No change           |
| **Billing Service**        | 🔴 Duplicate logic (3 locations) persists                  | No change           |
| **JD Upload**              | 🟡 Multi-format support added; Parsing placeholder remains | 🟢 Improved         |

---

## 1. P0 — Critical: Fix Immediately

### 1.1 Test Failures (Regressions)
**Status:** ❌ **FAILED**.
11 tests are currently failing, notably in `RecruiterDashboard.test.tsx`.
- **Issue:** `expect(screen.getByText(/Good evening/i)).toBeInTheDocument()` failed.
- **Cause:** Likely a time-dependent greeting logic that doesn't account for the test environment's clock.
- **Impact:** Blocks CI/CD pipeline.

---

## 2. P1 — High: Fix This Sprint

### 2.1 Duplicate `billingService.ts`
**Status:** 🔴 **STILL PENDING**.
Logic remains split across:
1. `src/lib/services/billingService.ts`
2. `functions/src/services/billingService.ts`
3. `functions/src/billingService.ts`
> [!IMPORTANT]
> This poses a high risk of "double billing" or logic drift for AI cost tracking.

### 2.2 JD Upload Parsing
**Status:** 🟡 **PARTIAL**.
The UI now accepts `.pdf`, `.doc`, and `.docx`, but the backend implementation in `JDUpload.tsx` uses a placeholder:
`// TODO: Implement actual parsing for PDF/DOC`
> [!WARNING]
> Users uploading non-TXT files will experience a "no text found" or empty search result.

---

## 3. P2 — Medium: Fix Before Launch

### 3.1 Middleware Scalability (Maps)
**Status:** 🔴 **STILL PENDING**.
`src/middleware.ts` continues to use `new Map()` for:
- Rate limiting (`rateLimitStore`)
- CSRF validation (Origin checking is solid, but state-tracking is local)
> [!CAUTION]
> This will cause inconsistent rate limiting across serverless instances/regions. Migration to Redis or Firestore-backed `distributedRateLimit.ts` is required.

### 3.2 Zod Validation Coverage
**Status:** ✅ **FIXED**.
- `src/app/api/jobseeker/profile/route.ts`: Now uses `JobseekerProfileSchema` with strict field validation.
- `src/app/api/resumes/[id]/route.ts`: PATCH and PUT routes correctly use Zod schemas for visibility and updates.

### 3.3 Security: Hashed Tokens
**Status:** ✅ **FIXED**.
- `authService.ts`: `verifyEmailToken` now hashes tokens using SHA-256 before Firestore lookup.
- `reset-password/route.ts`: Tokens are hashed before lookup.

---

## 4. P3 — Tech Debt

| Item                           | Status    | Recommendation                                            |
| ------------------------------ | --------- | --------------------------------------------------------- |
| `useUserProfile` Interval      | ⚠️ 10s    | Increase SWR deduping to 60s to reduce Firestore reads.   |
| Secret Manager TODOs           | ⚠️ 4      | Implement Firestore storage for secret metadata.          |
| ESLint Warnings                | ⚠️ 20     | Clean up unused variables in `accessService.ts` etc.      |
| `accessService.ts` Length      | ⚠️ 316 L  | Split into sub-services (Quota, Permissions, Mapping).    |

---

## Priority Action Items (Next 24 Hours)

1. [ ] **Fix Greeting Logic in `RecruiterDashboard.test.tsx`** to restore passing tests.
2. [ ] **Consolidate `billingService.ts`** into a single source of truth.
3. [ ] **Implement PDF/DOC text extraction** for JD Upload (Cloud Functions recommended).
4. [ ] **Migrate Middleware to Distributed Store** (Redis/Upstash).

---
_Scan Date: February 17, 2026 | Verified: 4/12 fixes implemented since Feb 16._
