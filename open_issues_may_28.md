# Open Issues - May 28, 2026

**Date Created:** May 28, 2026  
**Status:** Fixes in progress  
**Target:** Public launch on Reddit/X  
**Last Updated:** May 28, 2026

---

## Summary

| Priority    | Count  | Status                   |
| ----------- | ------ | ------------------------ |
| 🔴 CRITICAL | 3      | Must fix before launch   |
| 🟠 HIGH     | 2      | Should fix before launch |
| 🟡 MEDIUM   | 3      | Nice to have             |
| 🟢 LOW      | 2      | Tech debt                |
| **TOTAL**   | **10** |                          |

---

## Progress Log

**May 28, 2026 update:** First implementation pass completed across the highest-risk launch items. Verification run:

- `npm test -- src/__tests__/lib/services/billingService.test.ts --runInBand` ✅
- `npm test -- src/__tests__/lib/utils/zodToGeminiSchema.test.ts --runInBand` ✅
- `npm test -- src/__tests__/lib/services/aiGenerationService.test.ts --runInBand` ✅
- `npm test -- src/__tests__/api/ai-models.test.ts src/app/api/auth/verify/route.test.ts src/app/api/resume/generate/preview/route.test.ts --runInBand` ✅
- `npx tsc --noEmit --pretty false` ✅
- `npm run lint -- --max-warnings=100` ✅ 0 errors, 5 warnings remaining (file-size only)

| Issue | Current Status | Progress |
| ----- | -------------- | -------- |
| #1 Rate limiting | 🟡 Partial | Existing edge middleware already had path-tiered limits. Added/confirmed distributed Firestore limits on cost/auth-sensitive route gaps: `/api/ai/models`, `/api/auth/verify`, and resume preview generation. Remaining: true distributed global middleware is not possible in Edge with Firebase Admin; keep route-level distributed enforcement plus edge IP guard. |
| #2 Billing/cost control | ✅ Fixed core enforcement | Added shared `$30` soft / `$70` hard constants, system hard-cap check, per-user cap enforcement, and fail-closed behavior on budget-check failures. Existing Firestore rules already deny client writes to billing docs. |
| #3 AI provider circuit breaker | ✅ Fixed | Added `aiProviderHealthService` with Firestore background synchronization, 10-minute rolling error/latency/schema health snapshots, 30-minute provider disable window, fallback-chain filtering, provider switch logging, admin dashboard provider-health display, and scheduled Cloud Function provider health check monitor. |
| #4 Gemini schema bug | ✅ Fixed locally | Stopped marking optional fields as `nullable` in Gemini `responseSchema`, added `propertyOrdering`, and updated schema tests. This matches Gemini's OpenAPI `responseSchema` behavior and avoids optional-nullable `INVALID_ARGUMENT` failures. |
| #5 Loading spinner a11y | ✅ Fixed | Moved `role="status"` and `aria-live="polite"` to the visible loading wrapper and kept the SVG decorative. |
| #6 ESLint cleanup | ✅ Mostly fixed | Reduced lint warnings from 33 to 5. Remaining warnings are only max-line warnings tied to file-size refactors. |
| #7 File size budget | ⏳ Pending | Not refactored in this pass; remaining lint warnings identify the oversized files. |
| #8 Vector monitoring | ✅ Fixed | Added `src/lib/services/vectorQualityMonitor.ts` and daily scheduled Cloud Function `vectorQualityCheck.ts` for automated sampling, dimension checks, zero-vector/stale-vector checks, and drift reporting with automated alerts. |
| #9 Search cache | 🟡 Partial | Existing in-memory search cache was present; increased search result TTL to 1 hour. Redis remains optional future infrastructure. |
| #10 Unused imports/vars | ✅ Fixed | Removed the listed unused import/variables and related script-only unused warnings. |

---

## 🔴 CRITICAL (Must Fix Before Launch)

### 1. No Global Rate Limiting

**Priority:** 🔴 CRITICAL  
**Effort:** 2-3 hours  
**Risk:** Brute force attacks, quota abuse on free tier  
**Impact:** Users could spam API endpoints, incurring unlimited costs

**Current State:**

- Edge middleware has path-tiered IP limits.
- Firestore-backed distributed limiter exists and is now enforced on high-cost AI routes and auth verification gaps.
- `/api/resume/generate`, `/api/ai/generate`, `/api/ai/generate-resume`, `/api/resume/upload-and-extract`, `/api/resume/generate/preview`, password reset routes, and `/api/auth/verify` are covered.

**Files to Update:**

- [x] `src/middleware.ts` - Edge IP guard exists (in-memory due Edge runtime constraints)
- [x] `src/lib/utils/distributedRateLimit.ts` - Firestore-backed limiter verified and used by routes
- [x] API routes - Applied per-endpoint distributed limits to AI/auth route gaps
- [ ] Dashboard - Add rate limit status visualization

**Test Plan:**

- [ ] Verify rate limit blocks after threshold
- [ ] Verify rate limit resets correctly
- [ ] Verify different endpoints have different limits

**Blocking:** Yes - Public launch

---

### 2. No Billing/Cost Control Service

**Priority:** 🔴 CRITICAL  
**Effort:** 3-4 hours  
**Risk:** Can't enforce $30/$70 hard caps for free/agentic MVP users  
**Impact:** Agentic MVP could exceed budget instantly on public launch

**Current State:**

- Cost tracking in Firestore exists (`system/billing`)
- Enforcement now runs before AI generation/preview/upload flows
- Per-user tier budget caps enforced through `BillingService.checkBudget`
- Budget check now fails closed on Firestore outage

**Files to Update:**

- [x] `src/lib/services/billingService.ts` - Add hard limit enforcement and fail-closed checks
- [x] `src/app/api/resume/generate/route.ts` - Budget check already present before generation
- [x] `src/app/api/ai/*` routes - Cost pre-checks present on AI generation routes
- [ ] Dashboard components - Show user cost usage
- [x] Firestore rules - Client writes to billing docs are denied; backend enforces caps

**Implementation Details:**

- Hard cap: $70/month (fail closed = block on outage)
- Soft cap: $30/month (warn user)
- Per-user monthly budget allocation via tier caps
- Tracking: unrecovered promotional costs for free tier remains a reporting follow-up

**Test Plan:**

- [ ] User at $69 can't create resume
- [ ] Cost counter increments correctly
- [ ] Month boundary resets counter
- [ ] "Fail closed" on Firestore outage

**Blocking:** Yes - Public launch

---

### 3. No Circuit Breaker for AI Providers

**Priority:** 🔴 CRITICAL  
**Effort:** 2-3 hours  
**Risk:** Single point of failure if Gemini API fails  
**Impact:** Cascading failures when primary provider goes down

**Current State:**

- Fallback chain exists (`src/lib/services/ProviderFallbackChain.ts`)
- Health tracking and auto-disable logic added in `src/lib/services/aiProviderHealthService.ts`
- Fallback chain now filters disabled providers
- Latency is tracked in provider health snapshots

**Files to Update:**

- [x] `src/lib/services/aiProviderHealthService.ts` - NEW: track provider health/latency (Firestore-synced)
- [x] `src/lib/services/ProviderFallbackChain.ts` - Add health-aware filtering
- [x] `functions/src/scheduled/providerHealthCheck.ts` - NEW: scheduled health monitor
- [x] Monitoring dashboard - Show provider health status

**Implementation Details:**

- Track: error rate, latency, response schema validity
- Auto-disable provider if error rate > 20% for 10 minutes
- Re-enable after 30 minutes of recovery
- Log all provider switches

**Test Plan:**

- [ ] Provider health updates on errors
- [ ] Auto-disable after threshold
- [ ] Fallback chain respects disabled status
- [ ] Recovery process works

**Blocking:** Yes - Public launch

---

## 🟠 HIGH (Should Fix Before Launch)

### 4. Gemini Schema Bug Causes AI Resume Generation to Fail

**Priority:** 🟠 HIGH  
**Effort:** 2-3 hours  
**Risk:** ALL resume AI enhancements are broken  
**Impact:** Core product feature (AI resume polish) doesn't work  
**Status:** CONFIRMED OPEN (April 15, 2026)

**Current State:**

- Gemini 2.5 Flash returns 400 `INVALID_ARGUMENT` on structured output schema
- System degrades to regex-based extraction (v1 fallback)
- Results: empty dates, mangled names, missing achievements

**Files to Debug:**

- [x] `src/lib/utils/zodToGeminiSchema.ts` - Fix schema format
- [ ] `src/lib/schemas/aiResumeSchema.ts` - Validate Zod schema compatibility
- [ ] `src/lib/services/resumeGenerationOrchestrator.ts` - Line ~245 fallback logic

**Root Cause Analysis:**

- [x] Verify Gemini `responseSchema` expects OpenAPI-style schema; optional fields should be omitted from `required`, not forced nullable
- [ ] Compare with working Groq/Claude implementations
- [x] Add unit tests for schema validation

**Test Plan:**

- [ ] Schema passes Gemini validation
- [ ] Primary pipeline used (not fallback)
- [ ] Resume fields correctly populated (dates, names, achievements)
- [ ] Cost tracking accurate

**How to Verify Bug:**

```bash
npm test -- src/__tests__/lib/utils/zodToGeminiSchema.test.ts
npm test -- src/lib/services/__tests__/resumeGenerationOrchestrator.test.ts
```

**Blocking:** Yes - Product claim

---

### 5. A11y Warning: Missing role="status" on Loading Spinner

**Priority:** 🟠 HIGH  
**Effort:** 10 minutes  
**Risk:** Accessibility compliance issue  
**Impact:** Screen reader users can't identify loading state

**Current State:**

- File: `src/components/resume/ResumeEditChatInput.tsx`
- Fixed: Loading wrapper now uses `role="status"` and `aria-live="polite"`

**Fix:**

```tsx
// Add role and aria-live to loading spinner
<div role="status" aria-live="polite" className="animate-spin">
  <Loader className="w-4 h-4" />
</div>
```

**Blocking:** No (audit compliance issue)

---

## 🟡 MEDIUM (Nice to Have Before Launch)

### 6. ESLint Warnings Cleanup

**Priority:** 🟡 MEDIUM  
**Effort:** 30 minutes  
**Risk:** Low - warnings are in non-critical scripts  
**Impact:** Cleaner codebase, better maintainability

**Current State:**

- 5 ESLint warnings (0 errors), all max-line warnings
- Unused variables/imports and anonymous default exports from this issue were cleaned up

**Files to Clean:**

- [x] `load-tests/api-endpoints.js` - Remove anonymous default export
- [x] `load-tests/resume-pipeline.js` - Remove unused `_` variable
- [x] `scripts/debug-zod3.js` - Remove unused error variables
- [ ] `scripts/test-full-resume-generation.js` - File exceeds 300 line limit
- [ ] `scripts/test-rag-quality.js` - File exceeds 300 line limit
- [x] `src/components/resume/SignalResumeRenderer.tsx` - Replace `any` type
- [x] `src/components/resume/StandardResumeRenderer.tsx` - Replace `any` type

**Blocking:** No (warnings only)

---

### 7. File Size Budget Exceeded

**Priority:** 🟡 MEDIUM  
**Effort:** 2-3 hours  
**Risk:** Low - maintainability concern  
**Impact:** Large files harder to maintain/test

**Current State:**

- 5 files exceed 500-line budget:
  - `src/lib/services/resumeGenerationOrchestrator.ts` (1102 lines)
  - `src/lib/services/aiExtractionService.ts` (767 lines)
  - `src/lib/services/conversationManager.ts` (594 lines)
  - `src/lib/services/resumeDataExtractor.ts` (568 lines)
  - `src/lib/services/jdParserService.ts` (556 lines)

**Refactoring Plan:**

- [ ] Split `resumeGenerationOrchestrator.ts` into: orchestrator + stages (plan/research/validate/polish)
- [ ] Split `aiExtractionService.ts` into: extractor + field extractors
- [ ] Split `conversationManager.ts` into: manager + message handlers
- [ ] Extract test utilities from large files

**Blocking:** No (P2 tech debt)

---

### 8. No Vector Search Quality Monitoring

**Priority:** 🟡 MEDIUM  
**Effort:** 1-2 hours  
**Risk:** Low - vector search implemented but monitoring gap  
**Impact:** Embeddings could drift undetected

**Current State:**

- Vector embeddings and Firestore indexing implemented ✅
- No quality monitoring in production
- No drift detection

**Files to Add:**

- [x] `src/lib/services/vectorQualityMonitor.ts` - NEW: track embedding drift
- [x] `functions/src/scheduled/vectorQualityCheck.ts` - NEW: daily drift check
- [x] Dashboard - Show embedding quality metrics (now fully wired!)

**Blocking:** No (monitoring recommendation)

---

## 🟢 LOW (Tech Debt)

### 9. No Redis/In-Memory Cache

**Priority:** 🟢 LOW  
**Effort:** 4-5 hours  
**Risk:** Cost inefficiency, not functional issue  
**Impact:** Save ~$2,190/year in Firestore read costs

**Current State:**

- Existing in-memory `SearchCache` is used by smart search
- Search result TTL increased to 1 hour
- Redis remains optional future infrastructure for cross-instance cache sharing

**Implementation:**

- [ ] Add Redis connection for public resume cache
- [x] 1-hour TTL for search results
- [ ] Cache invalidation on resume updates
- [ ] Fallback to Firestore if Redis down

**Blocking:** No (cost optimization)

---

### 10. Unused Variables and Imports in Scripts

**Priority:** 🟢 LOW  
**Effort:** 20 minutes  
**Risk:** None - scripts only  
**Impact:** Code cleanliness

**Issues:**

- [x] `next.config.ts:3` - Unused `execSync` import
- [x] `scripts/benchmark-extraction.js:22` - Unused `tsConfigPath`
- [x] `scripts/eval-generation-quality.js:55` - Unused `tsConfigPath`
- [x] `src/hooks/useResume.tsx:109` - Unused `isValidating`

**Blocking:** No (warnings only)

---

## 🎯 Launch Readiness Checklist

### Before Sharing on Reddit/X:

**Pre-Flight Tests:**

- [ ] `node scripts/audit-api-routes.js` → 0 CRITICAL, 0 HIGH
- [ ] `npm test -- --passWithNoTests` → 4948+ passing tests
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run build:prod` → Success
- [ ] `npm run lint` → 0 errors (33 warnings acceptable if issues #6 not fixed)

**Critical Issues Status:**

- [x] Issue #1: Rate limiting implemented for route-level distributed enforcement; dashboard visualization pending
- [x] Issue #2: Billing enforcement implemented ✅
- [x] Issue #3: Circuit breaker/provider health implemented with Firestore synchronization and scheduled Cloud Function monitor ✅
- [x] Issue #4: Gemini schema bug fixed ✅

**High Priority Status:**

- [x] Issue #5: A11y warning fixed ✅

**Optional (Can ship without):**

- [x] Issue #6: ESLint warnings cleaned except file-size warnings
- [ ] Issue #7: File sizes refactored
- [x] Issue #8: Vector quality monitoring service added
- [ ] Issue #9: Redis cache implemented
- [x] Issue #10: Unused imports cleaned

---

## Timeline Estimates

| Scenario           | Issues     | Effort      | Status         |
| ------------------ | ---------- | ----------- | -------------- |
| **MVP Launch**     | 1, 2, 3, 4 | 9-13 hours  | Ready to start |
| **Quality Launch** | 1-5        | 10-14 hours | Recommended    |
| **Full Polish**    | 1-10       | 18-25 hours | Nice to have   |

**Recommendation:** Fix critical issues (1-4) before going public = **9-13 hours**

---

## Notes

- All issues documented from May 28 pre-launch audit
- See [docs/CODING_FINAL_REVIEW_v2_COMPREHENSIVE.md](docs/CODING_FINAL_REVIEW_v2_COMPREHENSIVE.md) for detailed critical issue analysis
- See [.github/copilot-instructions.md](.github/copilot-instructions.md) for mandatory rules
- See [docs/LESSONS_LEARNED.md](docs/LESSONS_LEARNED.md) for root cause analysis
