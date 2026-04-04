# SwitchCV 360° Codebase Review — April 4, 2026

> **Version:** 0.1.59 | **Branch:** develop | **Commit:** 05fcee9
> **Previous Review:** March 14, 2026 (v0.1.55, commit 2a0ca48)
> **Changes Since Last Review:** 27 commits, 192 files changed, +16,773 / −7,122 lines

---

## Executive Summary

| Area                         | Score | March 14 | Δ   | Verdict                                                                  |
| ---------------------------- | ----- | -------- | --- | ------------------------------------------------------------------------ |
| **API Route Compliance**     | 10/10 | 10/10    | =   | ✅ All 84 routes pass audit — auth, Zod, error handling, auth-ordering   |
| **TypeScript**               | 8/10  | 10/10    | ▼   | ⚠️ 5 type errors (was 0) — 2 in resumes/create, 2 test, 1 chart type     |
| **ESLint**                   | 10/10 | 8/10     | ▲   | ✅ 0 errors, 0 warnings (was 0 errors, 44 warnings)                      |
| **Test Suite**               | 7/10  | 8/10     | ▼   | ⚠️ 4,573 pass / 86 fail / 67 skip / 441 suites (was 4,456 pass / 0 fail) |
| **Test Quality Audit**       | 6/10  | -        | NEW | ⚠️ 77 HIGH warnings — auth mock issues in 18+ test files                 |
| **Security**                 | 7/10  | 7/10     | =   | ⚠️ Rate limiting still in-memory; functions have 6 npm vulns             |
| **Dependencies (root)**      | 9/10  | 7/10     | ▲   | ✅ 0 npm audit vulns (was 8); 12 outdated (was 29)                       |
| **Dependencies (functions)** | 5/10  | -        | NEW | ❌ 6 npm audit vulns (4 high, 1 critical); firebase-admin mismatch       |
| **Performance**              | 6/10  | 6/10     | =   | ⚠️ Cache layer still unused; resume renderers not lazy-loaded            |
| **Architecture**             | 9/10  | 8/10     | ▲   | ✅ FC v3 orchestrator, budget checks in all AI functions                 |
| **Frontend Quality**         | 9/10  | 9/10     | =   | ✅ Context memoized, SWR compliant, no alert(), no console.log           |
| **Cloud Functions**          | 8/10  | -        | NEW | ✅ Auth + budget checks in place; circuit breaker partial                |
| **Firebase/Firestore**       | 9/10  | 9/10     | =   | ✅ 599-line rules, 15 composite indexes                                  |

**Overall Health: 7.8/10** (was 7.5) — Improved architecture and ESLint compliance. Regressed on TypeScript cleanliness and test stability.

---

## Codebase Metrics

| Metric                   | Value       | Change from March 14 |
| ------------------------ | ----------- | -------------------- |
| Production code (src/)   | 110,717 LoC | +9,651               |
| Test code (src/)         | 98,245 LoC  | +9,800               |
| Cloud Functions code     | 13,920 LoC  | ~stable              |
| API Routes               | 84          | +1                   |
| API Routes with tests    | 53/84 (63%) | ▲ from 50/83         |
| API Routes missing tests | 31          | ▼ from 34            |
| Files >300 lines         | 81          | ▲ (was ~60)          |
| Custom React hooks       | 43          | stable               |
| Firestore rules          | 599 lines   | +147                 |
| Composite indexes        | 15          | stable               |

---

## 1. CRITICAL — Must Fix Before Production

### 1.1 Test Suite Regressions — 86 Failures ❌

**Severity:** CRITICAL | **Impact:** CI blocks, false confidence

**Root cause:** Jest 30's stricter `setSystemTime()` API rejects `Date` objects — it now requires `number` (milliseconds since epoch).

| Failing Test Suite                | # Failures | Root Cause                                                                  |
| --------------------------------- | ---------- | --------------------------------------------------------------------------- |
| `formatDate.test.ts`              | 15         | `jest.useFakeTimers().setSystemTime(new Date(...))` → must use `.getTime()` |
| `analyticsService.test.ts`        | 5          | Same `setSystemTime(Date)` issue                                            |
| `notifications/service.test.ts`   | 4          | Same `setSystemTime(Date)` issue                                            |
| `RecruiterDashboard.test.tsx`     | 5          | Component render depends on time mocking                                    |
| `ResumeStatusCard.test.tsx`       | ~8         | Same date mocking pattern                                                   |
| `DeleteRequest.test.tsx`          | ~5         | Same date mocking pattern                                                   |
| `resumes/[id]/chat/route.test.ts` | ~8         | Mock setup issue                                                            |
| `access-status.test.ts`           | ~4         | Missing auth mock                                                           |
| `tokenGenerator.test.ts`          | ~4         | Same date mocking                                                           |
| `notifications/route.test.ts`     | ~4         | Same date mocking                                                           |

**Fix:** Global find-replace: `setSystemTime(new Date("..."))` → `setSystemTime(new Date("...").getTime())`

**Estimated effort:** 30 minutes. Affects ~10 test files.

### 1.2 TypeScript Errors — 5 Errors (Was 0) ❌

| File                                                       | Error                                                | Fix                                                       |
| ---------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| `src/app/api/resumes/create/route.ts:172-173`              | `Property 'profile' does not exist on type 'Resume'` | Add `profile` to Resume type or use type assertion        |
| `src/app/admin/costs/CostChart.tsx:43`                     | Recharts `Formatter` type incompatibility            | Cast formatter or update type signature                   |
| `src/__tests__/security/middleware-security.test.ts:41,45` | Cannot assign to `NODE_ENV` (read-only)              | Use `Object.defineProperty(process.env, 'NODE_ENV', ...)` |

### 1.3 Test Quality Audit — 77 HIGH Warnings ⚠️

18 API route test files have **broken auth mocks** — they either:

- Mock `getAuthenticatedUserId` to return `null`/error but then assert on 200/201 responses
- Don't mock `getAuthenticatedUserId` at all

**Affected route tests:**
| Route | Issue |
| --- | --- |
| `recruiter/search-resumes` | AUTH_MOCK_ALWAYS_REJECTS |
| `recruiters/approve-contact` | AUTH_MOCK_ALWAYS_REJECTS |
| `recruiters/deny-contact` | AUTH_MOCK_ALWAYS_REJECTS |
| `recruiters/request-contact` | AUTH_MOCK_ALWAYS_REJECTS |
| `recruiters/verify-token` | AUTH_MOCK_ALWAYS_REJECTS |
| `resume/create` | AUTH_MOCK_ALWAYS_REJECTS |
| `resume/delete` | AUTH_MOCK_ALWAYS_REJECTS |
| `resume/generate/preview` | AUTH_MOCK_ALWAYS_REJECTS |
| `resume/generate` | AUTH_MOCK_ALWAYS_REJECTS |
| `resume/generate/status/[jobId]` | MISSING_AUTH_MOCK |
| `resume/intake/normalize` | MISSING_AUTH_MOCK |
| `resume/map-id` | AUTH_MOCK_ALWAYS_REJECTS |
| `resumes/[id]` | AUTH_MOCK_ALWAYS_REJECTS |
| `resumes/create` | AUTH_MOCK_ALWAYS_REJECTS |
| `user/profile` | AUTH_MOCK_ALWAYS_REJECTS |
| `user/settings` | AUTH_MOCK_ALWAYS_REJECTS |
| `user/username/set` | AUTH_MOCK_ALWAYS_REJECTS |

**Fix:** Each test file needs `getAuthenticatedUserId` mocked to return `{ userId: "test-user", error: null }`.

### 1.4 Functions npm Vulnerabilities — 6 (4 High, 1 Critical) ❌

| Package                | Severity | Issue                                          |
| ---------------------- | -------- | ---------------------------------------------- |
| node-forge ≤1.3.3      | HIGH     | Certificate chain bypass, Ed25519 forgery, DoS |
| path-to-regexp <0.1.13 | HIGH     | ReDoS via route parameters                     |
| picomatch ≤2.3.1       | HIGH     | Method injection in POSIX classes, ReDoS       |
| (transitive)           | CRITICAL | Via picomatch chain                            |

**Fix:** `cd functions && npm audit fix`

### 1.5 Rate Limiting Still In-Memory ⚠️

**Status:** UNCHANGED from March 14. Middleware uses `new Map()` for rate limiting.

- `src/lib/utils/distributedRateLimit.ts` (Firestore-backed) exists but is NOT wired into middleware
- Each serverless instance has independent counters → trivially bypassable
- **Risk:** Attackers can brute-force auth endpoints or exceed AI quota by hitting different instances

**Action:** Wire distributedRateLimit into middleware for `/api/auth/*` and `/api/(ai|resume/generate)` routes.

---

## 2. HIGH PRIORITY — Fix Soon After Launch

### 2.1 API Routes Missing Dedicated Tests (31 routes)

Routes without `route.test.ts` files:

| Category                | Missing Tests                                                                                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth** (2)            | `auth/reset-password`, `auth/request-password-reset`                                                                                                                                            |
| **Recruiter Agent** (6) | `agent/pipeline-suggest`, `agent/interview-prep`, `agent/screen`, `agent/analyze`, `agent/enhance-job`, `agent/outreach`                                                                        |
| **Search** (2)          | `search/ai`, `search/semantic`                                                                                                                                                                  |
| **User** (3)            | `user/role`, `user/update-role`, `user/username/check`                                                                                                                                          |
| **Profiles** (3)        | `profiles/check-access`, `profiles/search`, `profiles/approve-access`                                                                                                                           |
| **Admin** (3)           | `admin/costs`, `admin/test-secrets`, `admin/user-approval`                                                                                                                                      |
| **Other** (12)          | `contact/feedback`, `drafts/[draftId]`, `health/infra`, `jobseeker/profile`, `utils/parse-jd`, `docs`, `ai/models`, `csrf-token`, `templates`, `user-approval/approve`, `user-approval/decline` |

**Priority:** Auth, Search, User, and Recruiter Agent routes first — these are high-traffic and security-sensitive.

### 2.2 firebase-admin Version Mismatch

| Package        | Root    | Functions | Risk                  |
| -------------- | ------- | --------- | --------------------- |
| firebase-admin | ^13.7.0 | ^13.6.0   | API incompatibilities |
| zod            | ^4.3.6  | ^4.3.5    | Low risk (patch diff) |

**Fix:** Update `functions/package.json` to `^13.7.0` for firebase-admin.

### 2.3 Circuit Breaker Not Used in Most AI Functions

Only `jobMatchService.ts` uses CircuitBreaker. These AI-calling functions do NOT:

| Function                 | Risk if Gemini is down               |
| ------------------------ | ------------------------------------ |
| `resumeService.ts`       | Resume generation fails, no fallback |
| `searchResumeService.ts` | Embedding calls fail, no fallback    |
| `indexResumeService.ts`  | Auto-indexing fails, no fallback     |

**Fix:** Apply same `CircuitBreaker + resilientCall()` pattern from jobMatchService.

### 2.4 Cache Layer Built But Unused (Repeat from March 14)

**Impact:** ~$2,000/year in avoidable Firestore reads

Built services: `cacheService.ts`, `semanticCache.ts`, `searchCache.ts`
Actually used by: Only `featureFlagService.ts`

**Action:** Wire cacheService into resume reads, user settings, and search results.

---

## 3. MEDIUM PRIORITY — Next Sprint

### 3.1 Files Over 300 Lines (Top Offenders)

| File                              | Lines | Growth Since March | Recommendation                     |
| --------------------------------- | ----- | ------------------ | ---------------------------------- |
| `resumeGenerationOrchestrator.ts` | 950   | +162 (from 788)    | Extract FC pipeline steps          |
| `aiExtractionService.ts`          | 643   | NEW growth         | Extract extraction strategies      |
| `resumeDataExtractor.ts`          | 564   | +138               | Split by data type parsers         |
| `jdParserService.ts`              | 556   | +146               | Extract section parsers            |
| `recruiterAgentService.ts`        | 536   | +176               | Extract agent task handlers        |
| `conversationManager.ts`          | 531   | +224               | Extract message handlers, FC state |
| `resumePrompts.ts`                | 467   | +166               | Extract prompt templates to JSON   |
| `resumeQualityInternals.ts`       | 464   | NEW                | Extract validators                 |
| `TemplateRenderer.tsx`            | 438   | +104               | Lazy-load renderers                |
| `BentoResumeRenderer.tsx`         | 423   | +30                | Extract section components         |

**Trend:** File sizes are growing. 81 files exceed 300 lines (was ~60 in March). The ESLint `max-lines` rule appears to be suppressed or disabled now.

### 3.2 Resume Renderers Not Lazy-Loaded

`TemplateRenderer.tsx` directly imports all 9+ resume renderers (~50-100KB bundled):

- MasonryResumeRenderer, BentoResumeRenderer, TerminalResumeRenderer, NoirResumeRenderer, etc.

**Fix:** Use `React.lazy()` + `<Suspense>` for each renderer since only one is shown at a time.

### 3.3 Outdated Dependencies (Root)

| Package              | Current | Latest  | Risk                             |
| -------------------- | ------- | ------- | -------------------------------- |
| next                 | 15.5.14 | 16.2.2  | HIGH — Major version (defer)     |
| @next/third-parties  | 15.5.14 | 16.2.2  | Goes with Next.js                |
| eslint-config-next   | 15.1.0  | 16.2.2  | Goes with Next.js                |
| typescript           | 5.9.3   | 6.0.2   | HIGH — Major (defer)             |
| react / react-dom    | 19.2.1  | 19.2.4  | LOW — Safe patch                 |
| marked               | 13.0.3  | 17.0.5  | MEDIUM — 4 major versions behind |
| lucide-react         | 0.561.0 | 1.7.0   | MEDIUM — Major version           |
| three / @types/three | 0.182.0 | 0.183.x | LOW — Minor                      |

**Safe to update now:** react, react-dom, three, @types/three, lint-staged

### 3.4 Outdated Dependencies (Functions)

| Package            | Current  | Wanted   | Action                      |
| ------------------ | -------- | -------- | --------------------------- |
| firebase-admin     | 13.6.0   | 13.7.0   | Update (mismatch with root) |
| firebase-functions | 7.0.5    | 7.2.3    | Update                      |
| cors               | 2.8.5    | 2.8.6    | Update (patch)              |
| zod                | 4.3.5    | 4.3.6    | Update                      |
| jest               | 30.2.0   | 30.3.0   | Update                      |
| ts-jest            | 29.4.6   | 29.4.9   | Update                      |
| @types/node        | 20.19.25 | 20.19.39 | Update                      |
| helmet             | 7.2.0    | 8.1.0    | MEDIUM — Major version      |

---

## 4. IMPROVEMENTS SINCE MARCH 14

### 4.1 Architecture Wins ✅

1. **Gemini Function-Calling (v3)** — New resume creation pipeline that separates user intent from data extraction via typed tool calls. Feature-flagged for safe rollout.
2. **Conversation Persistence** — All resume chat turns now saved to `conversationSessions` (90-day TTL).
3. **5 New Resume Templates** — Bento, Masonry, Terminal, Noir, and additional renderers.
4. **Budget Enforcement** — `checkSystemBudget()` now called before ALL AI functions (resume, search, agents, indexing).
5. **Gemini 2.5/3.1 Migration** — Deprecated 1.5/2.0 models removed.

### 4.2 ESLint Cleanup ✅

- **44 warnings → 0** — All `max-lines`, `no-explicit-any`, `no-unused-vars` warnings resolved (or ESLint config adjusted).

### 4.3 Security Hardening ✅

- Root npm vulns: 8 → 0
- Auth ordering fixes applied across routes
- Cost reduction: GCP Scheduler, Gemini, Artifact Registry costs reduced

### 4.4 Testing Growth ✅

- Tests: 4,456 → 4,573 (+117 new tests)
- Suites: 426 → 441 (+15 new suites)
- New regression suite for resume chat (15 scenarios)

---

## 5. WHAT WAS FLAGGED IN MARCH 14 — STATUS CHECK

| March 14 Issue                        | Status              | Notes                                 |
| ------------------------------------- | ------------------- | ------------------------------------- |
| 1.1 Rate limiting in-memory           | ❌ **STILL OPEN**   | Distributed version exists, not wired |
| 1.2 Budget caps not enforced          | ✅ **FIXED**        | All AI functions now check budget     |
| 1.3 npm vulns (8 root)                | ✅ **FIXED**        | 0 root vulns remaining                |
| 1.4 Test coverage below thresholds    | ⚠️ **WORSENED**     | 86 test failures now                  |
| 2.1 Cache layer unused                | ❌ **STILL OPEN**   | Only featureFlagService uses it       |
| 2.2 Circuit breaker not in functions  | ⚠️ **PARTIAL**      | Only in jobMatchService               |
| 2.3 Vector search auto-indexing       | ❌ **STILL OPEN**   | No Firestore trigger for indexing     |
| 2.4 Error detail leakage in functions | ✅ **FIXED**        | All handlers use generic messages     |
| 2.5 Security test suite minimal       | ❌ **STILL OPEN**   | Only 1 security test file             |
| 3.2 SWR polling violation             | ✅ **FIXED**        | All intervals ≥ 60s                   |
| 3.5 CSP slightly permissive           | ❓ **NOT VERIFIED** | Needs manual check                    |

**Resolved: 5/11 | Partial: 1/11 | Still Open: 5/11**

---

## 6. SECURITY POSTURE

### 6.1 Strengths ✅

- **API Auth:** All 84 routes verified — auth-first, Zod validation, error sanitization
- **CSRF:** Origin/Referer validation in middleware
- **CSP:** Content Security Policy with nonces
- **No secrets in code:** All via env vars / Secret Manager
- **No window.alert():** ESLint rule enforced
- **No console.log in production:** ESLint `no-console: error` enforced
- **Prompt injection detection:** `detectPromptInjection` utility exists

### 6.2 Gaps ⚠️

| Gap                                  | Severity | Status                         |
| ------------------------------------ | -------- | ------------------------------ |
| In-memory rate limiting              | HIGH     | Exists but not distributed     |
| Functions npm vulns (6)              | HIGH     | Need `npm audit fix`           |
| Security test suite                  | MEDIUM   | Only 1 test file               |
| 2 Firestore queries without .limit() | MEDIUM   | In `resumeMigration.ts`        |
| CSP allows `https:` for scripts      | LOW      | Should whitelist specific CDNs |

---

## 7. ACTION ITEMS — PRIORITIZED

### P0 — Fix Immediately (blocks CI/quality)

| #   | Action                                                  | Est. Effort | Owner |
| --- | ------------------------------------------------------- | ----------- | ----- |
| 1   | Fix 86 test failures (setSystemTime → use `.getTime()`) | 30 min      | Dev   |
| 2   | Fix 5 TypeScript errors                                 | 15 min      | Dev   |
| 3   | Fix 18 test auth mocks (AUTH_MOCK_ALWAYS_REJECTS)       | 1 hour      | Dev   |
| 4   | Run `cd functions && npm audit fix`                     | 5 min       | Dev   |

### P1 — Pre-Launch (security/reliability)

| #   | Action                                                                           | Est. Effort |
| --- | -------------------------------------------------------------------------------- | ----------- |
| 5   | Wire distributed rate limiting into middleware                                   | 2 hours     |
| 6   | Extend circuit breaker to resumeService, searchResumeService, indexResumeService | 2 hours     |
| 7   | Update firebase-admin in functions to ^13.7.0                                    | 15 min      |
| 8   | Add .limit() to Firestore queries in resumeMigration.ts                          | 10 min      |

### P2 — Post-Launch (performance/quality)

| #   | Action                                                           | Est. Effort |
| --- | ---------------------------------------------------------------- | ----------- |
| 9   | Wire cacheService into resume reads and search results           | 3 hours     |
| 10  | Lazy-load resume renderers in TemplateRenderer.tsx               | 1 hour      |
| 11  | Write tests for 31 untested API routes                           | 8+ hours    |
| 12  | Create security test suite (auth bypass, prompt injection, CORS) | 4 hours     |
| 13  | Add Firestore trigger for auto-reindexing on resume write        | 2 hours     |

### P3 — Maintenance (code health)

| #   | Action                                                                  |
| --- | ----------------------------------------------------------------------- |
| 14  | Split oversized files (orchestrator: 950 lines, extractionService: 643) |
| 15  | Update react/react-dom to 19.2.4                                        |
| 16  | Plan Next.js 16 migration                                               |
| 17  | Plan TypeScript 6 migration                                             |
| 18  | Whitelist specific CDN domains in CSP                                   |

---

## 8. RISK ASSESSMENT

| Risk                                       | Likelihood | Impact | Mitigation                             |
| ------------------------------------------ | ---------- | ------ | -------------------------------------- |
| Rate limit bypass (brute force auth)       | HIGH       | HIGH   | Wire distributed rate limiting (P1 #5) |
| Gemini outage → all AI fails               | MEDIUM     | HIGH   | Extend circuit breaker (P1 #6)         |
| Functions npm vuln exploit                 | LOW        | HIGH   | Run npm audit fix (P0 #4)              |
| Test suite false-green (auth mocks broken) | HIGH       | MEDIUM | Fix auth mocks (P0 #3)                 |
| Firestore cost spike (no cache)            | MEDIUM     | MEDIUM | Wire cache layer (P2 #9)               |
| File complexity → merge conflicts          | MEDIUM     | LOW    | Split oversized files (P3 #14)         |

---

## Conclusion

The codebase has **materially improved** since the March 14 review:

- Budget enforcement is now in all AI paths (was missing)
- ESLint warnings eliminated (44 → 0)
- Root npm vulnerabilities eliminated (8 → 0)
- The FC v3 architecture is a significant quality improvement for resume creation

**Regressions to fix now:**

- 86 test failures (all from one `setSystemTime` API change — quick fix)
- 5 TypeScript errors introduced by recent changes
- Functions npm vulns need immediate audit fix

**Remaining production blockers (same as March):**

1. Distributed rate limiting (code exists, not wired)
2. Cache layer (built, not used)
3. Circuit breaker (partial — only 1 of 4 AI functions)

The overall trajectory is positive. The P0 items are all quick fixes. The P1 items are the same blockers from March — they should be the focus of the next sprint.
