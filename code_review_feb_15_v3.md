# Code Review — February 15, 2026 (v3)

**Full Codebase Audit**
**Reviewer:** AI Agent (GitHub Copilot)
**Project:** SwitchCV v0.1.22
**Scope:** Every corner — API routes, React components, hooks, context providers, services, security, tests, CI/CD, code hygiene

---

## Executive Summary

| Category                   | Status                                                     |
| -------------------------- | ---------------------------------------------------------- |
| **TypeScript**             | ✅ 0 errors — clean compile                                |
| **ESLint**                 | ✅ 0 errors, 5 warnings                                    |
| **Tests**                  | ⚠️ 4,214 pass / 23 fail (97.8%) — 7 suites failing         |
| **API Routes**             | ⚠️ 77 routes total — 3 critical auth issues, 5 error leaks |
| **React Hooks (Rule 4)**   | ✅ 37/40 pass (92.5%) — 1 high, 2 medium                   |
| **Context Providers**      | ✅ 4/4 fully compliant                                     |
| **Accessibility (Rule 5)** | 🔴 ~152 violations across 6 categories                     |
| **Security**               | ⚠️ 1 high + 5 medium issues                                |
| **Performance**            | ✅ Mostly good — 1 synchronous heavy import                |
| **Code Hygiene**           | ⚠️ 3 backup files, 15 `any` types, 3 duplicate services    |

---

## Table of Contents

1. [P0 — Critical: Fix Immediately](#1-p0--critical-fix-immediately)
2. [P1 — High: Fix This Sprint](#2-p1--high-fix-this-sprint)
3. [P2 — Medium: Fix Before Launch](#3-p2--medium-fix-before-launch)
4. [P3 — Low: Tech Debt](#4-p3--low-tech-debt)
5. [What's Working Well](#5-whats-working-well)
6. [Full Section Reports](#6-full-section-reports)

---

## 1. P0 — Critical: Fix Immediately

### 1.1 Broken Authentication — 3 API Routes (Rule 1 Violation)

| #   | Route                                      | Issue                                                                                                                                                 |
| --- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/app/api/resume/enhance/route.ts`      | Calls `getAuthenticatedUserId` but **does NOT check `error`**. Auth failure is silently ignored; `userId` may be `undefined` and execution continues. |
| 2   | `src/app/api/skills/route.ts`              | Wraps auth in `.catch(() => ({}))` — auth errors are **swallowed**. Unauthenticated users can call all skill actions.                                 |
| 3   | `src/app/api/interview/assistant/route.ts` | POST: wraps auth in `.catch(() => ({}))`. GET: **no auth at all** — anyone can fetch interview data.                                                  |

**Fix:**

```typescript
// For all 3 routes — use the standard pattern:
const { userId, error } = await getAuthenticatedUserId(request);
if (error) return error;
```

### 1.2 Placeholder Security Tests Providing False Coverage

| File                                         | Lines     | Impact                                                                                                                                                                              |
| -------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/__tests__/api/auth.critical.test.ts`    | 424 lines | **~20+ "tests" that never invoke any handler.** They construct Request objects and assert `request.method === "POST"` — providing zero actual coverage while inflating test counts. |
| `src/__tests__/api/resumes.critical.test.ts` | 355 lines | Same pattern — ~20+ placeholder tests that test nothing.                                                                                                                            |

**Fix:** Rewrite these tests to actually call the route handlers with `createAuthenticatedRequest()` and assert on response status/body, or delete them and write real integration tests.

### 1.3 No CI/CD Pipeline

No `.github/workflows/` directory exists. All quality gates (pre-commit hooks, lint, tests) run **locally only**. Any developer can bypass with `git commit --no-verify`.

**Fix:** Create a GitHub Actions workflow that runs TypeScript check, ESLint, tests, and the API route audit on every PR.

---

## 2. P1 — High: Fix This Sprint

### 2.1 Error Detail Leaks to Clients (Rule 3 Violation) — 5 Routes

| #   | Route                                          | Leaking Pattern                                      |
| --- | ---------------------------------------------- | ---------------------------------------------------- |
| 1   | `src/app/api/profiles/check-access/route.ts`   | `"Failed to check access: " + errorMessage`          |
| 2   | `src/app/api/profiles/approve-access/route.ts` | `"Failed to approve access: " + errorMessage`        |
| 3   | `src/app/api/profiles/respond-access/route.ts` | `"Failed to process response: " + errorMessage`      |
| 4   | `src/app/api/search/ai/route.ts`               | `"Search failed. Please try again: " + errorMessage` |
| 5   | `src/app/api/resume/enhance/route.ts`          | Zod issue details leaked in 400 response body        |

**Fix:** Remove `+ errorMessage` from all responses. Use `handleApiError(err, "Generic message")`.

### 2.2 Zod Validation Details Leaked in 5 Recruiter Agent Routes

These routes return `parseResult.error.flatten()` in the `details` field of 400 responses, exposing internal schema structure:

- `src/app/api/recruiter/agent/pipeline-suggest/route.ts`
- `src/app/api/recruiter/agent/analyze/route.ts`
- `src/app/api/recruiter/agent/interview-prep/route.ts`
- `src/app/api/recruiter/agent/screen/route.ts`
- `src/app/api/recruiter/agent/enhance-job/route.ts`

**Fix:** Replace `details: parseResult.error.flatten()` with `details: "Invalid input"` or remove `details` entirely.

### 2.3 Firestore Rules: No Default Deny-All

The `profiles` collection uses a recursive wildcard `{document=**}` which matches ALL subcollections. Any new subcollection under `profiles/{userId}/` is writable by the owner without explicit rules. No catch-all deny rule exists at the bottom of `firestore.rules`.

**Fix:** Add `match /{document=**} { allow read, write: if false; }` as the final rule, and scope the `profiles` wildcard to known subcollections only.

### 2.4 Unbounded Firestore Queries — 7 Locations

| #   | File                                                  | Query                                          | Fix                        |
| --- | ----------------------------------------------------- | ---------------------------------------------- | -------------------------- |
| 1   | `src/lib/services/accessService.ts:103`               | `resumeRef.collection("accessRequests").get()` | Add `.limit(500)`          |
| 2   | `src/lib/services/accessService.ts:135`               | `resumeRef.collection("accessGrants").get()`   | Add `.limit(500)`          |
| 3   | `src/lib/services/analytics/dashboard.ts:46`          | `.collection("heatmaps").get()`                | Add `.limit(50)`           |
| 4   | `functions/src/analyticsService.ts:72`                | `.where("timestamp", ">=", 7daysAgo).get()`    | Add `.limit(1000)`         |
| 5   | `functions/src/analyticsService.ts:321`               | `.where("eventType", "==", "view").get()`      | Add `.limit(1000)`         |
| 6   | `functions/src/scheduled/notifyExpiringResumes.ts:34` | Expiring resumes query without limit           | Add `.limit(200)`          |
| 7   | `functions/src/services/billingService.ts:72`         | Shard collection `.get()`                      | Add defensive `.limit(20)` |

### 2.5 Synchronous recharts Import

`src/app/admin/costs/page.tsx` imports `AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer` at the top level. `recharts` is ~200KB+ and should be lazy-loaded.

**Fix:** Wrap in `next/dynamic` with `ssr: false`.

### 2.6 `useResume.tsx` — Side Effect in `useMemo` (Rule 4 Violation)

```typescript
// src/hooks/useResume.tsx:121-129
const resumeId = useMemo(() => {
    const id = resume?.numericId || resume?.id || null;
    logger.info({ ... }, "Resume ID resolved:");  // ← SIDE EFFECT in useMemo!
    return id;
}, [resume]);
```

**Fix:** Move `logger.info` to a `useEffect` watching `resumeId`.

### 2.7 Duplicate `billingService.ts` — 3 Copies

| Location                                   | Lines |
| ------------------------------------------ | ----- |
| `src/lib/services/billingService.ts`       | 285   |
| `functions/src/services/billingService.ts` | 121   |
| `functions/src/billingService.ts`          | 109   |

All three share the same `system/billing/shards` Firestore path. If one is updated and the others aren't, billing calculations will diverge.

**Fix:** Consolidate into a shared module or clearly separate client vs. server implementations with a shared constants file.

---

## 3. P2 — Medium: Fix Before Launch

### 3.1 Missing Zod Validation — 5 Routes

| Route                                     | Method | Issue                                                                   |
| ----------------------------------------- | ------ | ----------------------------------------------------------------------- |
| `src/app/api/jobseeker/profile/route.ts`  | POST   | Uses `z.record(z.string(), z.unknown())` — validates nothing meaningful |
| `src/app/api/resumes/[id]/route.ts`       | PATCH  | Uses manual `typeof` check instead of Zod                               |
| `src/app/api/contact/feedback/route.ts`   | POST   | Uses `safeParseBody` without Zod schema                                 |
| `src/app/api/recruiter/requests/route.ts` | POST   | No Zod schema for request body                                          |
| `src/app/api/recruiter/search/route.ts`   | GET    | No Zod validation for query params                                      |

### 3.2 In-Memory Rate Limiting & CSRF (Won't Scale)

| System                          | Issue                                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/middleware.ts:60`          | Rate limiter uses `Map` — each serverless instance has its own. Attackers bypass by hitting different instances. |
| `src/lib/middleware/csrf.ts:35` | CSRF token store is in-memory `Map`. Same cross-instance issue. Comment says "use Redis" but not implemented.    |

**Note:** A Firestore-backed `distributedRateLimit.ts` exists but isn't wired into the main middleware.

### 3.3 Accessibility Violations (Rule 5) — 152+ Issues

| Category                                                | Count | Severity |
| ------------------------------------------------------- | ----- | -------- |
| SVGs missing `aria-hidden="true"`                       | ~90+  | High     |
| Form inputs missing `aria-invalid` / `aria-describedby` | 34    | High     |
| Loading spinners missing `role="status"`                | 21    | Medium   |
| Icon-only buttons missing `aria-label`                  | 7     | Medium   |
| `window.alert()` usage                                  | 0     | ✅ Pass  |
| Missing keyboard handlers on interactive elements       | 0     | ✅ Pass  |

**Top-priority accessibility fixes:**

1. **SVGs:** Global pass to add `aria-hidden="true"` to all decorative `<svg>` and Lucide icons
2. **Form inputs:** Fix `FormComponents.tsx` (cascades to onboarding), `profile/page.tsx`, `SearchForm.tsx`, `form-fields.tsx`
3. **Loading spinners:** 21 `animate-spin` divs need `role="status" aria-live="polite"`
4. **Buttons:** `NotificationsMenu.tsx`, `UserProfileMenu.tsx`, `PremiumFiltersInput.tsx` "×" button

### 3.4 Controlled Input Violations (Rule 8)

| File                                                 | Issue                                                               | Severity |
| ---------------------------------------------------- | ------------------------------------------------------------------- | -------- |
| `src/app/profile/page.tsx:26`                        | `setProfile(serverProfile)` without `?? ""` on string fields        | Critical |
| `src/components/onboarding/steps/ExperienceStep.tsx` | 4 inputs with `value={experience.field}` without `\|\| ""` fallback | Medium   |
| `src/components/onboarding/steps/EducationStep.tsx`  | 3 inputs without fallback                                           | Medium   |
| `src/components/onboarding/steps/SkillsStep.tsx`     | 2 inputs without fallback                                           | Medium   |
| `src/components/onboarding/steps/ProjectsStep.tsx`   | 2 inputs without fallback                                           | Medium   |
| `src/components/recruiter/AgentMessageModal.tsx:10`  | `useState(message)` without `?? ""`                                 | Low      |

### 3.5 `handleApiError` Leaks Details in Non-Production

`src/lib/utils/api-helpers.ts:207-226` — In development mode, `error.message` is returned to clients. If `NODE_ENV` is not explicitly `"production"` in a preview/staging deployment, raw errors (potentially containing Firebase URLs, credentials) are exposed.

### 3.6 Test Failures — 7 Suites, 23 Tests

| Suite                                              | Root Cause                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `UserProfileSettings.test.tsx` (1 fail)            | Mock `fetch` returns `undefined`; test queries `role="button"` but component uses `role="switch"` |
| `NotificationSettings.test.tsx` (1 fail)           | Same `role="button"` vs `role="switch"` mismatch                                                  |
| `headers.test.ts` (8 fails)                        | CSP header returns `undefined` — CSP not fully implemented in test environment                    |
| `admin/migrate-resume-ids/route.test.ts` (4 fails) | Firestore batch/transaction mock doesn't match route behavior                                     |
| `recruiter/request-access/route.test.ts` (2 fails) | `consumeQuota` mock not properly wired                                                            |
| `seed/generate/route.test.ts` (1 fail)             | String assertion mismatch: route returns full message, test expects terse version                 |

### 3.7 E2E Test Gaps

- Only Chromium tested — no Firefox or Safari
- Authenticated tests silently skip without `E2E_TEST_EMAIL` env var
- No mobile viewport testing

---

## 4. P3 — Low: Tech Debt

### 4.1 ESLint Warnings — 5 Total

| File                                              | Warning                                                |
| ------------------------------------------------- | ------------------------------------------------------ |
| `src/app/api/recruiter/interviews/route.ts`       | File has too many lines (310 > 300)                    |
| `src/app/api/recruiters/approve-contact/route.ts` | `token` assigned but never used                        |
| `src/components/demo/HeroReveal.tsx`              | `_role` and `_onRevealComplete` defined but never used |
| `src/lib/services/accessService.ts`               | File has too many lines (310 > 300)                    |

### 4.2 `useCallback` Missing on Hook Return Functions

| Hook                            | Issue                                  |
| ------------------------------- | -------------------------------------- |
| `src/hooks/useTier.ts:45`       | `refetch` not wrapped in `useCallback` |
| `src/hooks/useTierLimits.ts:92` | `refetch` not wrapped in `useCallback` |

### 4.3 Backup Files in Repository

| File                                                   | Action |
| ------------------------------------------------------ | ------ |
| `src/middleware.ts.bak`                                | Delete |
| `src/app/how-it-works/page.tsx.backup`                 | Delete |
| `src/app/api/recruiter/bulk-actions/route.test.ts.bak` | Delete |

### 4.4 Incomplete Implementations

| File                                                  | Issue                                                                                               |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `src/lib/services/secretManagerService.ts`            | 4 TODO stubs for secret management operations (rotateSecret, createSecret, deleteSecret, logAccess) |
| `functions/src/searchProviders/legacyScanProvider.ts` | TODO: Migrate to vector search provider                                                             |
| `src/lib/services/analyticsService.ts`                | 2-line stub (empty) — functional service is in `functions/src/analyticsService.ts` only             |

### 4.5 `any` Type Usage — 15 Occurrences

| Category              | Count | Worst Offenders                                                                             |
| --------------------- | ----- | ------------------------------------------------------------------------------------------- |
| `Record<string, any>` | 8     | `useAuditLog.ts` (4), `access-status.ts` (2), `useResumeDelete.ts` (1), `edit/page.tsx` (1) |
| `as any` cast         | 5     | `create-resume/page.tsx` (2), `verify-token/route.ts` (2), `page.tsx` (1)                   |
| `any[]` state type    | 1     | `AuditLogViewer.tsx`                                                                        |
| `...args: any[]`      | 1     | `access-status.ts`                                                                          |

### 4.6 SWR Deduping Too Aggressive

`src/hooks/useUserProfile.ts:52` — `dedupingInterval: 10000` (10 seconds). All other hooks use 60s+. This triggers a Firestore read every 10 seconds per consumer. Increase to 60000.

### 4.7 Environment Variable Validation

- `src/lib/env.ts` makes all Firebase env vars `.optional()` — missing vars don't fail at startup
- 80+ direct `process.env` accesses bypass the Zod-validated `env` object
- Redundant validation systems: `env.ts` (Zod) and `validateEnv.ts` (manual checks)

### 4.8 CSP Weaknesses

- `style-src 'unsafe-inline'` weakens XSS protection (needed for Next.js inline styles)
- `script-src` fallback allows `https: http:` for older browsers
- CSP nonce only generated for state-changing requests, not GETs

### 4.9 Storage Rules

- Content-type validation relies on client-provided header (can be spoofed)
- No filename/extension restriction — `image/svg+xml` uploads allowed (can contain JavaScript)

### 4.10 Miscellaneous

- `jest.setup.js` is 493 lines — should be split into modules
- Duplicate `Request` polyfill in jest.setup.js (dead code)
- No `afterEach(jest.restoreAllMocks)` global configuration
- CORS `validateCorsOrigin` returns `allowed: true` when no Origin header present (same-origin fallback)
- Auth token `secure` flag gated on `NODE_ENV === "production"` — staging over HTTPS may send cookies over clear-text

---

## 5. What's Working Well

### Authentication & Authorization

- ✅ 73 of 77 API routes have proper auth — 95% compliance
- ✅ BOLA (Broken Object-Level Authorization) checks present on ownership-sensitive routes
- ✅ Role-based access (admin, recruiter, jobseeker) enforced consistently
- ✅ `verifyResumeOwnership()` combines auth + ownership in one call

### React Architecture

- ✅ All 4 Context Providers (Connectivity, DashboardMetrics, SystemConfig, Theme) fully comply with Rule 4
- ✅ `AuthProvider` has all 10 handlers in `useCallback` with correct dependencies
- ✅ 31 of 36 custom hooks properly memoize returned callbacks
- ✅ No `window.alert()` in production code
- ✅ No `<div onClick>` anti-patterns — all interactive elements use native `<button>`

### Security

- ✅ **Zero hardcoded secrets** in source code
- ✅ **Zero console.log** in production paths (uses pino logger)
- ✅ **Zero eval()**, dangerouslySetInnerHTML, or innerHTML usage
- ✅ **Zero NoSQL injection** vulnerabilities — all queries use parameterized SDK methods
- ✅ All OWASP-recommended security headers present (HSTS, X-Content-Type-Options, X-Frame-Options, etc.)
- ✅ CSRF with constant-time comparison (`crypto.timingSafeEqual`)
- ✅ Cookie security: `__Host-` prefix, `HttpOnly`, `SameSite: strict`
- ✅ Prompt injection detection in search and recruiter agent services
- ✅ 1MB body size limit enforced via `safeParseBody()`

### AI Service Layer

- ✅ Circuit breaker per AI provider with 3-failure threshold and 60s reset
- ✅ Health-score-based provider fallback chain (Gemini → OpenAI → Groq)
- ✅ Token/cost tracking with sharded counters and per-tier budget caps
- ✅ Tier-based model preferences (basic → cheaper models, enterprise → best models)

### Data Layer

- ✅ SWR with `revalidateOnFocus: false` globally — no unnecessary Firestore reads
- ✅ No polling intervals — all data is fetch-on-demand with SWR caching
- ✅ Two-tier cache (L1 in-memory + L2 Firestore) with TTL in `cacheService.ts`
- ✅ GDPR deletion uses batched queries with `.limit(BATCH_LIMIT)` throughout

### Testing

- ✅ 4,214 passing tests — comprehensive coverage
- ✅ Per-file coverage thresholds on critical routes (90% for resume CRUD)
- ✅ Automated pre-commit audit script checks 10 security/quality patterns
- ✅ Well-structured ESLint rules enforce architecture patterns
- ✅ `jest-preprocessor.js` correctly strips `"use client"` / `"use server"` directives

### Code Quality

- ✅ TypeScript: **0 errors** — clean compile
- ✅ ESLint: **0 errors**, only 5 warnings
- ✅ Zod validation on 65+ of 77 routes
- ✅ `handleApiError()` standardizes error responses
- ✅ No commented-out code blocks
- ✅ Only 3 unused variables across entire `src/`
- ✅ Comprehensive Firestore rules (452 lines) with role/ownership/tier validation

---

## 6. Full Section Reports

### 6.1 API Route Audit (77 Routes)

| Category                           | Count            |
| ---------------------------------- | ---------------- |
| Total routes                       | 77               |
| Auth: Fully compliant              | 62               |
| Auth: Public (by design)           | 11               |
| Auth: Broken                       | 3 (**Critical**) |
| Auth: Optional (intentional)       | 1                |
| Zod validation: Present            | 65               |
| Zod validation: Missing/inadequate | 5                |
| Zod validation: N/A (GET only)     | 7                |
| Error handling: Safe               | 72               |
| Error handling: Leaks details      | 5                |

#### Public/Exempt Routes (By Design)

`health/route.ts`, `health/infra/route.ts`, `system-config/route.ts`, `auth/reset-password/route.ts`, `auth/request-password-reset/route.ts`, `auth/verify/route.ts`, `user-approval/approve/route.ts`, `user-approval/decline/route.ts`, `user/username/check/route.ts`, `templates/route.ts`, `csrf-token/route.ts`

### 6.2 Context Providers & Hooks Audit

| Scope             | Total  | Pass   | Fail  |
| ----------------- | ------ | ------ | ----- |
| Context Providers | 4      | 4      | 0     |
| Custom Hooks      | 36     | 33     | 3     |
| **Total**         | **40** | **37** | **3** |

**Failures:**

1. `useResume.tsx` — `logger.info()` side effect inside `useMemo` (HIGH)
2. `useTier.ts` — `refetch` not in `useCallback` (MEDIUM)
3. `useTierLimits.ts` — `refetch` not in `useCallback` (MEDIUM)

### 6.3 Security Posture

| Area                 | Status                                                     |
| -------------------- | ---------------------------------------------------------- |
| Authentication       | ⚠️ 3 routes with broken auth                               |
| Authorization (BOLA) | ✅ Ownership checks present where needed                   |
| Input validation     | ⚠️ 5 routes with missing/weak Zod                          |
| Error handling       | ⚠️ 5 routes leak error details                             |
| CSRF                 | ✅ Implemented (but in-memory store won't scale)           |
| CORS                 | ✅ Explicit origin allowlist                               |
| Security headers     | ✅ All OWASP headers present                               |
| Cookie security      | ✅ `__Host-`/`__Secure-` prefix, HttpOnly, SameSite        |
| Rate limiting        | ⚠️ In-memory only (won't scale across instances)           |
| Prompt injection     | ✅ Detection + sanitization on search/agent routes         |
| Secrets management   | ✅ Zero hardcoded secrets                                  |
| NoSQL injection      | ✅ Zero vulnerabilities                                    |
| XSS vectors          | ✅ Zero `eval`/`dangerouslySetInnerHTML`/`innerHTML`       |
| Firestore rules      | ⚠️ No default deny-all; recursive wildcard on `profiles`   |
| Storage rules        | ✅ Size limits + type validation (but SVG upload possible) |

### 6.4 Test Infrastructure

| Metric                                     | Value                                                     |
| ------------------------------------------ | --------------------------------------------------------- |
| Test suites                                | 404 total (397 pass, 7 fail)                              |
| Individual tests                           | 4,304 total (4,214 pass, 23 fail, 67 skip)                |
| Pass rate                                  | 97.8%                                                     |
| Coverage threshold (global)                | 75% lines, 65% branches                                   |
| Coverage threshold (critical)              | 90% for resume routes, AI service                         |
| E2E tests                                  | Chromium only, 5 spec files                               |
| Security tests                             | 3 files (1 backup check, 1 CSP check, 1 prompt injection) |
| Placeholder tests providing false coverage | ~40+ across 2 files                                       |

### 6.5 Code Hygiene

| Metric               | Value                                    |
| -------------------- | ---------------------------------------- |
| TypeScript errors    | 0                                        |
| ESLint errors        | 0                                        |
| ESLint warnings      | 5                                        |
| `any` type usage     | 15 occurrences                           |
| console.log in prod  | 0                                        |
| Commented-out blocks | 0                                        |
| Backup files         | 3 (should delete)                        |
| TODO comments        | 7 (4 stubs in `secretManagerService.ts`) |
| Unused variables     | 3                                        |
| Duplicate services   | 3 (`billingService.ts` × 3)              |

---

## Priority Action Items

### Must Fix Before Production (P0+P1) — 12 Items

1. [ ] Fix auth in `resume/enhance/route.ts` — add `if (error) return error;`
2. [ ] Fix auth in `skills/route.ts` — remove `.catch(() => ({}))`
3. [ ] Fix auth in `interview/assistant/route.ts` — remove `.catch` on POST, add auth on GET
4. [ ] Remove `+ errorMessage` from 4 profile/search routes
5. [ ] Remove Zod `flatten()` details from 5 recruiter agent routes
6. [ ] Remove Zod issue details from `resume/enhance/route.ts` 400 response
7. [ ] Add `.limit()` to 7 unbounded Firestore queries
8. [ ] Add default deny-all rule to `firestore.rules`
9. [ ] Rewrite or delete placeholder tests in `auth.critical.test.ts` and `resumes.critical.test.ts`
10. [ ] Create GitHub Actions CI/CD workflow
11. [ ] Fix `useResume.tsx` — move `logger.info` out of `useMemo`
12. [ ] Lazy-load `recharts` in `admin/costs/page.tsx`

### Should Fix Before Launch (P2) — 8 Items

13. [ ] Add missing Zod schemas to 5 routes
14. [ ] Wire distributed rate limiting into middleware (replace in-memory `Map`)
15. [ ] Fix 34 form inputs missing `aria-invalid` / `aria-describedby`
16. [ ] Add `aria-hidden="true"` to ~90+ decorative SVGs
17. [ ] Add `role="status"` to 21 loading spinners
18. [ ] Fix `profile/page.tsx` controlled input violation (`setProfile(serverProfile)`)
19. [ ] Consolidate 3 copies of `billingService.ts`
20. [ ] Fix 23 failing tests (7 suites)

### Nice to Have (P3) — 7 Items

21. [ ] Delete 3 `.bak`/`.backup` files
22. [ ] Wrap `refetch` in `useCallback` in `useTier.ts` and `useTierLimits.ts`
23. [ ] Replace 15 `any` types with proper typing
24. [ ] Complete 4 TODO stubs in `secretManagerService.ts`
25. [ ] Increase `useUserProfile.ts` deduping from 10s to 60s
26. [ ] Add Firefox/Safari to Playwright E2E
27. [ ] Split `jest.setup.js` into modules

---

_Generated: February 15, 2026 | Files scanned: 77 API routes, 40 hooks/providers, 404 test suites, 452 Firestore rules, 227 ESLint rules_
