# SwitchCV 360° Codebase Review — March 14, 2026

> **Version:** 0.1.55 | **Branch:** develop | **Commit:** 2a0ca48

---

## Executive Summary

| Area                     | Score | Verdict                                                             |
| ------------------------ | ----- | ------------------------------------------------------------------- |
| **API Route Compliance** | 10/10 | ✅ All 83 routes pass audit — auth, Zod, error handling             |
| **TypeScript**           | 10/10 | ✅ Zero type errors (`tsc --noEmit` clean)                          |
| **ESLint**               | 8/10  | ⚠️ 0 errors, 44 warnings (mostly `max-lines` + 3 `no-explicit-any`) |
| **Test Suite**           | 8/10  | ✅ 4,456 pass / 0 fail / 67 skipped / 426 suites                    |
| **Test Coverage**        | 6/10  | ⚠️ 68.6% stmts / 62.4% branches (below 75%/65% thresholds)          |
| **Security**             | 7/10  | ⚠️ Strong defaults, but rate limiting is in-memory only             |
| **Dependencies**         | 7/10  | ⚠️ 8 audit vulnerabilities (5 high), 29 outdated packages           |
| **Performance**          | 6/10  | ⚠️ Cache layer built but NOT wired into services                    |
| **Architecture**         | 8/10  | ✅ Clean separation, but cost enforcement gaps                      |
| **Frontend Quality**     | 9/10  | ✅ 98% rule compliance, all contexts properly memoized              |
| **Firebase/Firestore**   | 9/10  | ✅ Strict rules, 15 composite indexes, proper field validation      |

**Overall Health: 7.5/10** — Production-capable with specific gaps to close.

---

## 1. CRITICAL — Must Fix Before Production Launch

### 1.1 Rate Limiting is In-Memory Only

- **Risk:** HIGH — Each serverless instance has independent counters. Attackers bypass by hitting different instances.
- **Location:** [src/middleware.ts](../src/middleware.ts) uses in-memory `Map`
- **Fix exists:** [src/lib/utils/distributedRateLimit.ts](../src/lib/utils/distributedRateLimit.ts) (Firestore-backed, transactional) — but middleware doesn't use it
- **Action:** Replace middleware rate limiter with distributed version, OR ensure critical routes (auth, AI) explicitly call `checkDistributedRateLimit()`

### 1.2 Budget Hard Caps NOT Enforced Before AI Calls

- **Risk:** HIGH — Can exceed $30/$70 monthly caps on agentic MVP
- **Location:** [functions/src/resumeService.ts](../functions/src/resumeService.ts) — no `checkSystemBudget()` before calling Gemini
- **What works:** Search routes check budget. Resume generation does NOT.
- **Action:** Add `checkSystemBudget()` + `checkUserBudget()` before all AI model calls in resumeService, jobMatchService, and agent endpoints

### 1.3 npm Audit — 8 Vulnerabilities (5 High)

- **express-rate-limit 8.2.0-8.2.1** — IPv4-mapped IPv6 bypass (HIGH)
- **flatted <3.4.0** — Unbounded recursion DoS (HIGH)
- **tar <=7.5.10** — Symlink path traversal (HIGH) → affects node-gyp → re2
- **hono <4.12.7** — Prototype pollution (MODERATE) → affects @modelcontextprotocol/sdk
- **Action:** Run `npm audit fix` — all have fixes available

### 1.4 Test Coverage Below Thresholds

- **Statements:** 68.6% (threshold: 75%) — **shortfall: 6.4%**
- **Branches:** 62.4% (threshold: 65%) — **shortfall: 2.6%**
- **Lines:** 69.2% (threshold: 75%) — **shortfall: 5.8%**
- **AI Generation Service:** 58.8% branches (threshold: 85%), 66.7% functions (threshold: 90%)
- **Action:** Add tests for uncovered API routes (~34 routes without dedicated test files) and services

---

## 2. HIGH PRIORITY — Fix Soon After Launch

### 2.1 Cache Layer Built But Unused

- **Impact:** ~$2,000/year in avoidable Firestore reads
- **What exists:**
  - [src/lib/services/cacheService.ts](../src/lib/services/cacheService.ts) — Dual-tier L1 (in-memory) + L2 (Firestore)
  - [src/lib/services/semanticCache.ts](../src/lib/services/semanticCache.ts) — Query normalization + similarity matching
  - [src/lib/services/searchCache.ts](../src/lib/services/searchCache.ts) — LRU with TTL
- **What uses it:** Only [featureFlagService.ts](../src/lib/services/featureFlagService.ts)
- **Action:** Wire cacheService into resume reads, user settings fetches, and search results

### 2.2 Circuit Breaker Not Used in Cloud Functions

- **Risk:** Single point of failure if Gemini API goes down
- **What exists:**
  - [src/lib/services/ai/CircuitBreaker.ts](../src/lib/services/ai/CircuitBreaker.ts) — failureThreshold=3, resetTimeout=60s
  - [src/lib/services/ai/ProviderFallbackChain.ts](../src/lib/services/ai/ProviderFallbackChain.ts) — Health-scored provider selection
- **Problem:** These are client-side only. Cloud Functions don't import them.
- **Action:** Integrate ProviderFallbackChain into Cloud Functions AI handlers

### 2.3 Vector Search Auto-Indexing Missing

- **Risk:** Stale search results when resumes are updated
- [functions/src/indexResumeService.ts](../functions/src/indexResumeService.ts) — manual `reindexResume()` callable only
- **Action:** Add Firestore trigger to auto-reindex on resume document write

### 2.4 Error Detail Leakage in Cloud Functions

- [functions/src/utils/validation.ts](../functions/src/utils/validation.ts) — `throw new functions.https.HttpsError("invalid-argument", error.message)` exposes Zod internals
- **Action:** Audit all `HttpsError` calls to use generic messages, log details server-side

### 2.5 Security Test Suite is Minimal

- **Current:** 1 test file ([tests/security/backup-files.test.ts](../tests/security/backup-files.test.ts))
- **Missing:**
  - Auth bypass tests
  - Prompt injection tests (utilities exist, no tests)
  - Rate limiting enforcement tests
  - CORS validation tests
  - CSP header tests (existing test fails — header undefined in mock)
- **Action:** Create comprehensive security test suite

---

## 3. MEDIUM PRIORITY — Next Sprint

### 3.1 ESLint Warnings (44 Total)

| Category                 | Count | Files                                                                                |
| ------------------------ | ----- | ------------------------------------------------------------------------------------ |
| `max-lines` (>300 lines) | 20    | Resume renderers, services, types                                                    |
| `no-explicit-any`        | 3     | [accessService.ts](../src/lib/services/accessService.ts) lines 341-348               |
| `no-unused-vars`         | 2     | [HeroReveal.tsx](../src/components/demo/HeroReveal.tsx) `_role`, `_onRevealComplete` |

**Files exceeding 300-line limit (top offenders):**

| File                                                                                   | Lines | Action                                        |
| -------------------------------------------------------------------------------------- | ----- | --------------------------------------------- |
| [resumeGenerationQuality.ts](../src/lib/services/resumeGenerationQuality.ts)           | 802   | Split: validation vs scoring vs formatting    |
| [resumeGenerationOrchestrator.ts](../src/lib/services/resumeGenerationOrchestrator.ts) | 788   | Extract: pipeline steps into separate modules |
| [resumeDataExtractor.ts](../src/lib/services/resumeDataExtractor.ts)                   | 426   | Extract: parsers by data type                 |
| [jdParserService.ts](../src/lib/services/jdParserService.ts)                           | 410   | Extract: section parsers                      |
| [BentoResumeRenderer.tsx](../src/components/resume/BentoResumeRenderer.tsx)            | 393   | Extract: section components                   |
| [MasonryResumeRenderer.tsx](../src/components/resume/MasonryResumeRenderer.tsx)        | 392   | Extract: section components                   |
| [recruiterAgentService.ts](../src/lib/services/recruiterAgentService.ts)               | 360   | Extract: agent task handlers                  |
| [NoirResumeRenderer.tsx](../src/components/resume/NoirResumeRenderer.tsx)              | 353   | Extract: section components                   |
| [useResumeCreation.ts](../src/hooks/useResumeCreation.ts)                              | 348   | Extract: step handlers                        |
| [system-config.ts](../src/lib/system-config.ts)                                        | 340   | Split: config definition vs defaults          |
| [TemplateRenderer.tsx](../src/components/resume/TemplateRenderer.tsx)                  | 334   | Extract: template mapping                     |
| [resumeSeedGenerator.ts](../src/lib/services/resumeSeedGenerator.ts)                   | 329   | Extract: seed data templates                  |
| [resumeIntakeNormalizer.ts](../src/lib/services/resumeIntakeNormalizer.ts)             | 361   | Extract: field normalizers                    |
| [interviewQuestions.ts](../src/lib/interviewQuestions.ts)                              | 318   | Move: data to JSON or constants file          |
| [types/index.ts](../src/types/index.ts)                                                | 310   | Split: by domain (resume, user, recruiter)    |
| [conversationManager.ts](../src/lib/services/conversationManager.ts)                   | 307   | Extract: message handlers                     |
| [PrivacyPolicyContent.tsx](../src/components/legal/PrivacyPolicyContent.tsx)           | 307   | OK (legal content)                            |
| [TermsOfServiceContent.tsx](../src/components/legal/TermsOfServiceContent.tsx)         | 335   | OK (legal content)                            |
| [useAuthPage.ts](../src/hooks/useAuthPage.ts)                                          | 303   | Extract: validation logic                     |
| [resumePrompts.ts](../src/lib/services/resumePrompts.ts)                               | 301   | Extract: prompt templates                     |
| [JDUpload.tsx](../src/components/recruiter/JDUpload.tsx)                               | 344   | Extract: upload + preview                     |

### 3.2 SWR Polling Interval Violation

- [src/hooks/useAiMonitoring.ts](../src/hooks/useAiMonitoring.ts) line 41 — `dedupingInterval: 30000` (30s)
- **Rule 7:** Minimum 60 seconds for Firestore reads
- **Action:** Change to `dedupingInterval: 60000`

### 3.3 Outdated Dependencies (29 packages)

**Major version upgrades available:**
| Package | Current | Latest | Risk |
|---------|---------|--------|------|
| next | 15.5.12 | 16.1.6 | HIGH — Major version (defer) |
| @next/third-parties | 15.5.12 | 16.1.6 | Goes with Next.js |
| eslint-config-next | 15.1.0 | 16.1.6 | Goes with Next.js |
| nodemailer | 7.0.13 | 8.0.2 | MEDIUM — Breaking changes |
| lint-staged | 15.5.2 | 16.4.0 | LOW — Build tool only |
| @types/node | 20.19.33 | 25.5.0 | LOW — Types only |

**Safe minor/patch upgrades (do now):**
| Package | Current | Wanted |
|---------|---------|--------|
| @sentry/nextjs | 10.38.0 | 10.43.0 |
| firebase-admin | 13.6.1 | 13.7.0 |
| firebase-tools | 15.5.1 | 15.10.0 |
| posthog-js | 1.345.5 | 1.360.2 |
| react | 19.2.1 | 19.2.4 |
| react-dom | 19.2.1 | 19.2.4 |
| swr | 2.4.0 | 2.4.1 |
| tailwindcss | 4.1.18 | 4.2.1 |
| jest | 30.2.0 | 30.3.0 |
| motion | 12.34.0 | 12.36.0 |

### 3.4 Load Tests Only Cover /api/health

- [load-tests/load-test.js](../load-tests/load-test.js) — k6 script targets health endpoint only
- **Action:** Add load test scenarios for:
  - `/api/profiles/search` (recruiter heavy path)
  - `/api/resume/generate` (most expensive AI operation)
  - `/api/search/ai` (vector search)
  - `/api/analytics/dashboard` (Firestore aggregation)

### 3.5 CSP Slightly Permissive

- [src/middleware.ts](../src/middleware.ts) line ~267: `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: http:`
- **Issue:** `https:` and `http:` allow scripts from ANY domain
- **Action:** Replace with exact CDN domains used by the app

---

## 4. LOW PRIORITY — Nice to Have

### 4.1 Skipped Tests (20)

- 8 HuggingFace/Gemini edge cases in aiGenerationService.test.ts
- 4 retry/backoff edge cases
- Various integration tests
- **Action:** Re-enable as integration test suite (separate CI job)

### 4.2 E2E Test Coverage Expansion

- Current: 4 spec files (auth, jobseeker flow, recruiter flow, unauth)
- **Missing:** Error scenarios, tier restriction flows, admin workflows
- **Action:** Add E2E specs per user journey

### 4.3 VERCEL_BRANCH_URL in CORS

- [src/lib/utils/cors.ts](../src/lib/utils/cors.ts) — Auto-adds Vercel preview URLs
- **Risk:** LOW — Standard Vercel pattern
- **Action:** Document explicitly which preview URLs are allowed

### 4.4 Firestore Role Transition Validation

- [firestore.rules](../firestore.rules) lines 21-26 — Allows any jobseeker ↔ recruiter transition
- Backend API (`/api/user/update-role`) has additional checks
- **Action:** Consider adding approval requirement in rules for recruiter role

### 4.5 Unused Variables in HeroReveal

- [src/components/demo/HeroReveal.tsx](../src/components/demo/HeroReveal.tsx) line 14 — `_role` and `_onRevealComplete` defined but unused
- **Action:** Remove or prefix with `_` properly to silence linter

---

## 5. Architecture Health Summary

### What's Working Well ✅

1. **API route compliance** — 83/83 routes pass all audit checks (auth, Zod, error handling)
2. **TypeScript strictness** — Zero type errors across entire codebase
3. **Context providers** — All 4 providers properly memoized (Rule 4)
4. **Form handling** — All inputs properly initialized (Rule 8)
5. **Accessibility** — Zero `window.alert()` calls, auth forms WCAG-compliant
6. **Firestore rules** — 452 lines of comprehensive access control
7. **Security headers** — HSTS, CSP (nonce-based), X-Frame-Options, Permissions-Policy
8. **Firebase config safety** — Dev config blocked in production builds
9. **Data access layer** — Enforces `.limit()` and pagination on all queries
10. **Scheduled functions** — Budget monitor (hourly), health monitor (30-min), cleanup

### What Needs Work ⚠️

1. Rate limiting distributed version not wired to middleware
2. Budget enforcement gaps on AI calls
3. Cache layer built but sitting idle
4. Circuit breaker client-side only, not in Cloud Functions
5. Test coverage 6-7% below thresholds
6. Several services exceed 300-line limit
7. npm vulnerabilities need `npm audit fix`

---

## 6. Quick Wins — Immediate Actions

| #   | Action                                         | Effort | Impact                  |
| --- | ---------------------------------------------- | ------ | ----------------------- |
| 1   | Run `npm audit fix`                            | 5 min  | Fixes 8 vulnerabilities |
| 2   | Fix useAiMonitoring dedupingInterval 30s → 60s | 1 min  | Rule 7 compliance       |
| 3   | Remove unused vars in HeroReveal.tsx           | 1 min  | 2 fewer lint warnings   |
| 4   | Update safe dependencies (`npm update`)        | 10 min | 15+ packages refreshed  |
| 5   | Fix `any` types in accessService.ts            | 5 min  | 3 fewer lint warnings   |

---

## 7. Metrics Snapshot

| Metric                      | Value                      |
| --------------------------- | -------------------------- |
| API Routes                  | 83                         |
| Components                  | 253                        |
| Custom Hooks                | 43                         |
| Services                    | 92                         |
| Cloud Functions             | 50+                        |
| Scheduled Functions         | 7                          |
| Test Suites                 | 426 passing / 2 skipped    |
| Tests                       | 4,456 passing / 67 skipped |
| Prod Dependencies           | 35                         |
| Dev Dependencies            | 29                         |
| Firestore Composite Indexes | 15                         |
| Firestore Rules             | 452 lines                  |
| ESLint Errors               | 0                          |
| ESLint Warnings             | 44                         |
| TypeScript Errors           | 0                          |
| npm Vulnerabilities         | 8 (5 high, 3 moderate)     |
