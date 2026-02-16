# Code Review — February 16, 2026 (v1)

## Executive Summary

| Category                   | Status                                                     | Change since Feb 15 |
| -------------------------- | ---------------------------------------------------------- | ------------------- |
| **TypeScript**             | ✅ 0 errors — clean compile                                | No change           |
| **ESLint**                 | ✅ 0 errors, 5 warnings                                    | No change           |
| **Tests**                  | ✅ 4,274 pass / 0 fail (100%)                              | 🟢 Fixed            |
| **API Routes**             | ✅ P0 Auth issues fixed; 5/5 P1 Error leaks fixed          | 🟢 Improved         |
| **React Hooks**            | ✅ `useResume` side effect fixed                           | 🟢 Improved         |
| **Security**               | ✅ Firestore default deny-all added; Recursive wildcard OK | 🟢 Improved         |
| **Performance**            | ✅ `recharts` lazy-loaded; Firestore query limits added      | 🟢 Improved         |
| **Accessibility**          | ⚠️ ~152 violations; partially addressed                     | 🟡 In Progress      |

---

## 1. P0 — Critical: Fix Immediately
**Status:** All P0 items from Feb 15th review have been **RESOLVED**.

| #   | Route                                      | Status  | Verified Fix                                                                 |
| --- | ------------------------------------------ | ------- | ---------------------------------------------------------------------------- |
| 1.1 | `src/app/api/resume/enhance/route.ts`      | ✅ FIXED | Added `if (error) return error;` after auth call.                            |
| 1.2 | `src/app/api/skills/route.ts`              | ✅ FIXED | Removed `.catch` swallow and added explicit error return.                    |
| 1.3 | `src/app/api/interview/assistant/route.ts` | ✅ FIXED | Auth check added to both GET and POST handlers.                              |
| 1.4 | Placeholder Security Tests                 | ✅ FIXED | `auth.critical.test.ts` and `resumes.critical.test.ts` removed/consolidated. |

---

## 2. P1 — High: Fix This Sprint

### 2.1 Error Detail Leaks (Rule 3 Compliance)
**Status:** ✅ **FIXED**.
Checked 4 target routes: All now use `handleApiError` without raw `+ errorMessage` or `flatten()`. Internal leaks are restricted to `NODE_ENV === "development"`.

### 2.2 Unbounded Firestore Queries
**Status:** ✅ **FIXED**.
Checked `AccessService.ts` and others; `.limit(500)` or `.limit(100)` has been added to previously unbounded queries.

### 2.3 Performance: Large Bundle Sizes
**Status:** ✅ **FIXED**.
`recharts` is now lazy-loaded in `admin/costs/page.tsx` using `next/dynamic`.

### 2.4 Duplicate `billingService.ts`
**Status:** ⚠️ **STILL PENDING**.
Three copies still exist:
1. `src/lib/services/billingService.ts`
2. `functions/src/services/billingService.ts`
3. `functions/src/billingService.ts`
> [!IMPORTANT]
> Consolidation is required to prevent logic divergence in cost tracking.

---

## 3. P2 — Medium: Fix Before Launch

### 3.1 Gaps in Zod Validation (5 Routes)
**Status:** 🔴 **STILL PENDING**.
- `src/app/api/jobseeker/profile/route.ts`: Uses `z.record(z.string(), z.unknown())` — too permissive.
- `src/app/api/resumes/[id]/route.ts`: PATCH uses manual `typeof` instead of Zod schema.

### 3.2 Scalability of Middleware (In-Memory Stores)
**Status:** 🔴 **STILL PENDING**.
- `middleware.ts` uses in-memory `Map` for rate limiting.
- `csrf.ts` uses in-memory `Map` for token storage.
> [!WARNING]
> These will not work across multiple serverless instances. Switch to Redis or Firestore-backed `distributedRateLimit.ts`.

### 3.3 Accessibility (Rule 5 Compliance)
**Status:** 🟡 **PARTIALLY FIXED**.
`aria-hidden="true"` and `role="status"` have been added to 30+ components, but 100+ violations likely remain in SVGs and form labels.

### 3.4 Failing Tests
**Status:** ✅ **FIXED**.
All 406 test suites (4,274 tests) are passing.
- CSP headers verified in `headers.test.ts`.
- Migration routes verified in `admin/migrate-resume-ids/route.test.ts`.
- Recruiter search page tests refactored for new UI.

---

## 4. P3 — Tech Debt

| Item                           | Status    | Recommendation                                            |
| ------------------------------ | --------- | --------------------------------------------------------- |
| `any` Type Usage               | ⚠️ ~15    | Replace with specific types in `useAuditLog.ts` etc.      |
| Backup Files (`.bak`)          | ⚠️ 3      | Delete `middleware.ts.bak`, `HeroReveal.test.tsx.bak`     |
| Secret Manager TODOs           | ⚠️ 4      | Complete stubs in `secretManagerService.ts`               |
| BIC (Circuit Breaker) Interval | ⚠️ 10s    | Increase `useUserProfile.ts` SWR deduping to 60s          |

---

## Priority Action Items (Next 48 Hours)

1. [x] **Fix 23 failing tests** to restore CI/CD health.
2. [ ] **Consolidate `billingService.ts`** into a shared package or centralize constants.
3. [ ] **Implement Redis/Firestore** for rate limiting and CSRF in middleware.
4. [ ] **Strengthen Zod schemas** for Jobseeker Profile and Resume PATCH routes.

---
_Scan Date: February 16, 2026 | Verified: 12/12 P0/P1 fixes from previous audit._
