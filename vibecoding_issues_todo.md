# Vibe Coding Technical Issues - TODO List

**Project:** SwitchCV Platform  
**Date Created:** January 5, 2026  
**Last Updated:** January 5, 2026  
**Source:** [CODE_REVIEW_360.md](CODE_REVIEW_360.md) + Vibe Coding Risk Assessment

---

## Progress Overview

| Challenge Category          | Status           | Completed | Total    | Hours Remaining |
| --------------------------- | ---------------- | --------- | -------- | --------------- |
| 🔴 Security Vulnerabilities | 🟡 PARTIAL (3/7) | 3 items   | 7 items  | 12-17h          |
| ✅ Technical Debt           | ✅ GOOD          | 5 items   | 8 items  | 10-14h          |
| 🔴 Scalability Bottlenecks  | 🔴 MISSING (0/4) | 0 items   | 4 items  | 14-18h          |
| ✅ Testing Deficiencies     | ✅ GOOD (99.3%)  | 20 items  | 23 items | 17-22h          |
| 🟡 Integration Issues       | 🟡 PARTIAL (2/3) | 2 items   | 3 items  | 5-7h            |
| 🟡 Performance Overhead     | 🟡 PARTIAL (2/5) | 2 items   | 5 items  | 17-22h          |

**Total Estimated Hours:** 75-100 hours (2-3 weeks with 2-person team)  
**Critical Path (Production Blockers):** 28-37 hours

---

## 🔴 Challenge 1: Security Vulnerabilities

**Current Status:** 🟡 PARTIAL (3/7 areas covered)  
**Priority:** CRITICAL - Production Blocker  
**Total Hours:** 12-17 hours

### ✅ Implemented (Keep Monitoring)

- [x] **API Authentication** - Bearer token + JWT verification via `getAuthenticatedUserId()` [§2.1](CODE_REVIEW_360.md#L112-L118)
- [x] **Input Validation** - Zod schemas with 1MB body/5MB file limits [§7.3](CODE_REVIEW_360.md#L718-L722)
- [x] **Firestore Security Rules** - 452 lines covering RBAC, ownership, tier validation [§2.3](CODE_REVIEW_360.md#L124-L133)

### ❌ Missing (CRITICAL)

- [ ] **Global Rate Limiting** (Priority: 🔴 CRITICAL | Time: 4-6h)

  - No global middleware - endpoints exposed to brute force/DDoS
  - Current: Only `supportFeedbackService.ts` has in-memory rate limit (not production-ready)
  - **Risk:** Users can bypass quota, exploit free tier AI features
  - **Files:** Create `src/middleware/globalRateLimit.ts`
  - **Reference:** [§2.4](CODE_REVIEW_360.md#L135-L174), [§7.4](CODE_REVIEW_360.md#L724-L769)
  - **Implementation:**
    ```typescript
    // Use Firestore-backed rate limiter with sliding window
    // Per-endpoint config: /api/ai/* = 10 req/min, /api/auth/* = 5 req/min
    // Track by userId (authenticated) or IP (anonymous)
    ```

- [ ] **PII Redaction in Logs** (Priority: 🔴 CRITICAL | Time: 2-3h)

  - Logs might contain resume content, no redaction in error responses
  - **Files:** `src/lib/logger.ts`, `src/lib/utils/api-helpers.ts`
  - **Reference:** [§7.5](CODE_REVIEW_360.md#L771-L788)

- [ ] **CORS Headers Validation** (Priority: 🟡 HIGH | Time: 2-3h)

  - No origin validation in API routes
  - **Files:** All `src/app/api/**/route.ts` files
  - **Reference:** [§2.6](CODE_REVIEW_360.md#L184-L187)

- [ ] **Secret Rotation Mechanism** (Priority: 🟢 MEDIUM | Time: 4-5h)
  - Firebase config in `.env.local`, no rotation strategy
  - **Action:** Migrate to Firebase Secret Manager
  - **Reference:** [§7.7](CODE_REVIEW_360.md#L795-L813)

---

## ✅ Challenge 2: Technical Debt

**Current Status:** ✅ GOOD (Most patterns resolved)  
**Priority:** MEDIUM - Maintainability Improvements  
**Total Hours:** 10-14 hours

### ✅ Fixed (Great Work!)

- [x] **Linting Errors** - All 8 errors eliminated (console.log, React Hooks violations) [§11](CODE_REVIEW_360.md#L995-L1010)
- [x] **Data Extraction Patterns** - 7/7 gaps fixed (name, location, skills, summary, phone, experience, education) [§3.4](CODE_REVIEW_360.md#L218-L251)
- [x] **Validation Error Codes** - 400 status codes for bad requests [§1.5](CODE_REVIEW_360.md#L95-L110)
- [x] **TypeScript Strict Mode** - Enabled with proper type exports [§8.1](CODE_REVIEW_360.md#L815-L819)
- [x] **Service-Oriented Architecture** - 10 domain services in `functions/src/services/` [§1.2](CODE_REVIEW_360.md#L38-L45)

### ⚠️ Remaining Issues

- [ ] **Standardize Module Patterns** (Priority: 🟢 MEDIUM | Time: 5-7h)

  - Mix of class-based, function-based, object literal services
  - **Action:** Standardize on object-based pattern
  - **Files:** All `src/lib/services/*.ts`, `functions/src/services/*.ts`
  - **Reference:** [§8.4](CODE_REVIEW_360.md#L829-L852)

- [ ] **Extract Magic Numbers/Strings** (Priority: 🟢 MEDIUM | Time: 2-3h)

  - Hard-coded: `3 free agent runs`, `$30/$70` budgets, `gemini-1.5-flash`
  - **Action:** Create `src/lib/constants/agenticConfig.ts`
  - **Reference:** [§8.5](CODE_REVIEW_360.md#L854-L870)

- [ ] **Reduce Function Complexity** (Priority: 🟢 MEDIUM | Time: 3-4h)
  - Some service functions exceed 100 lines, no cyclomatic complexity limits
  - **Files:** `src/app/api/ai/generate-resume/route.ts` (405 lines), `src/components/settings/EditProfile.tsx` (673 lines)
  - **Reference:** [§8.6](CODE_REVIEW_360.md#L872-L875)

---

## 🔴 Challenge 3: Scalability Bottlenecks

**Current Status:** 🔴 MISSING (0/4 critical features)  
**Priority:** CRITICAL - Cost & Performance Impact  
**Total Hours:** 14-18 hours

### ❌ All Missing (CRITICAL)

- [ ] **Redis Caching Layer** (Priority: 🔴 HIGH | Time: 8-10h)

  - No cache for resume reads - direct Firestore fetches
  - **Cost Impact:** ~$2,190/yr at 10k users (target: <$500/yr)
  - **Action:** Create `src/lib/services/cacheService.ts` with Redis (5min TTL)
  - **Files:** `src/lib/services/resumeService.ts`
  - **Reference:** [§6.1](CODE_REVIEW_360.md#L582-L612)
  - **Implementation:**
    ```typescript
    // 1. Check Redis cache
    // 2. Fetch from Firestore on miss
    // 3. Set cache with TTL
    // 4. Invalidate on updates
    ```

- [ ] **Pagination Implementation** (Priority: 🟢 MEDIUM | Time: 4-5h)

  - Services fetch full collections - memory risk at scale
  - **Action:** Add cursor-based pagination with `limit()` + `startAfter()`
  - **Files:** `src/lib/services/resumeService.ts`, search endpoints
  - **Reference:** [§3.4](CODE_REVIEW_360.md#L257-L282)

- [ ] **Request Deduplication** (Priority: 🔴 HIGH | Time: 2-3h)

  - Multiple simultaneous requests = duplicate Firestore reads
  - **Action:** Implement request coalescing with `Map<string, Promise>`
  - **Reference:** [§6.2](CODE_REVIEW_360.md#L614-L631)

- [ ] **Query Optimization** (Priority: 🟢 MEDIUM | Time: 2-3h)
  - Unbounded queries without `.limit()`
  - **Action:** Audit all Firestore queries, add limits, document indexes in `firestore.indexes.json`
  - **Reference:** [§3.5](CODE_REVIEW_360.md#L284-L308)

---

## ✅ Challenge 4: Testing Deficiencies

**Current Status:** ✅ GOOD (99.3% pass rate)  
**Priority:** HIGH - 24 tests failing (mock issues)  
**Total Hours:** 17-22 hours

### ✅ Strong Foundation

- [x] **Test Pass Rate** - 3,352/3,376 tests passing (99.3%) [§5](CODE_REVIEW_360.md#L398-L408)
- [x] **Code Coverage** - 79.13% lines, 75.46% functions, 65.96% branches
- [x] **E2E Framework** - Playwright setup with auth/signup/jobseeker/recruiter flows
- [x] **Unit Tests** - Jest with jsdom environment

### ⚠️ Remaining Gaps

- [ ] **Fix Test Mock Setup** (Priority: 🟡 HIGH | Time: 3-4h)

  - 24 tests failing due to mock/import issues (NOT logic errors)
  - **Files:**
    - `src/__tests__/api/profiles/search-query.test.ts` - Mock Firestore `getDoc`, `limit`
    - `src/__tests__/api/recruiter/requests.test.ts` - Mock route handlers
    - `src/__tests__/api/jobseeker/metrics.test.ts` - Route handlers returning undefined
    - `src/__tests__/lib/dashboard/durationHelpers.test.ts` - Validation logic error
  - **Reference:** [§5.1](CODE_REVIEW_360.md#L410-L441)

- [ ] **Add Integration Tests** (Priority: 🟢 MEDIUM | Time: 8-10h)

  - No tests for API → Functions → Firestore flow
  - **Action:** Create `e2e/integration/` directory for cost tracking, billing, quota
  - **Reference:** [§5.4](CODE_REVIEW_360.md#L543-L557)

- [ ] **E2E Coverage Expansion** (Priority: 🟢 MEDIUM | Time: 6-8h)
  - Missing: Payment flows, agentic resume generation, vector search, cost tracking
  - **Files:** `e2e/payment-flow.spec.ts`, `e2e/agentic-generation.spec.ts`
  - **Reference:** [§5.3](CODE_REVIEW_360.md#L515-L541)

---

## 🟡 Challenge 5: Integration Issues

**Current Status:** 🟡 PARTIAL (2/3 areas covered)  
**Priority:** CRITICAL - AI Provider Failover  
**Total Hours:** 5-7 hours

### ✅ Implemented

- [x] **Dependency Management** - Locked versions, clear separation of deps/devDeps
- [x] **Legacy Data Handling** - `fetchResumeDocument()` supports both `resumes` and `resumeProfiles` collections [§3.1](CODE_REVIEW_360.md#L192-L205)

### ❌ Critical Gap

- [ ] **Circuit Breaker for AI Providers** (Priority: 🔴 CRITICAL | Time: 3-4h)

  - No fallback chain if Gemini fails
  - **Action:** Implement Gemini → Groq → GPT → Claude cascade
  - **Files:** `src/lib/services/aiGenerationService.ts`
  - **Reference:** [§4.5](CODE_REVIEW_360.md#L380-L396), [§10.4](CODE_REVIEW_360.md#L857-L861)
  - **Implementation:**
    ```typescript
    // Try Gemini (primary)
    // On 429/503/timeout: Try Groq
    // On fail: Try GPT
    // On fail: Try Claude
    // Track failures in sharded counters
    ```

- [ ] **API Version Compatibility** (Priority: 🟢 MEDIUM | Time: 2-3h)
  - No validation for Gemini model versions
  - **Files:** `src/lib/system-config.ts`
  - **Reference:** Inferred from integration analysis

---

## 🟡 Challenge 6: Performance Overhead

**Current Status:** 🟡 PARTIAL (2/5 areas covered)  
**Priority:** HIGH - Vector Search + Bundle Size  
**Total Hours:** 17-22 hours

### ✅ Implemented

- [x] **Bundle Optimization** - `optimizePackageImports` for lucide-react, date-fns, lodash in `next.config.ts`
- [x] **Partial Code Splitting** - Suspense usage in recruiter/auth pages

### ❌ Missing

- [ ] **Vector Search Pipeline** (Priority: 🔴 HIGH | Time: 10-12h)

  - Embedding config exists but no generation pipeline
  - **Action:** Implement embedding generation + similarity search
  - **Files:** Create `functions/src/services/embeddingService.ts`
  - **Reference:** [§6.3](CODE_REVIEW_360.md#L633-L666)
  - **Implementation:**
    ```typescript
    // 1. Generate embeddings via Gemini text-embedding-004
    // 2. Store in Firestore with 768-dim vectors
    // 3. Batch updates for cost efficiency
    // 4. Cosine similarity search (Firestore Vector Search or Pinecone)
    ```

- [ ] **Lazy Loading for Heavy Components** (Priority: 🟢 MEDIUM | Time: 5-7h)

  - No dynamic imports for Framer Motion, Sonner
  - **Action:** Use `next/dynamic` for non-critical components
  - **Reference:** [§10.10](CODE_REVIEW_360.md#L893-L898)

- [ ] **Bundle Analysis** (Priority: 🟢 LOW | Time: 2-3h)
  - No bundle size monitoring
  - **Action:** Add `@next/bundle-analyzer`, set size budgets
  - **Reference:** [§6.4](CODE_REVIEW_360.md#L668-L674)

---

## 🔴 Critical Path (Production Blockers)

**Must complete before production launch:**

### Week 1: Security & Stability (10-13 hours)

1. [ ] Global rate limiting (4-6h) - [§2.4](CODE_REVIEW_360.md#L135-L174)
2. [ ] Circuit breaker for AI (3-4h) - [§4.5](CODE_REVIEW_360.md#L380-L396)
3. [ ] Fix 24 test mocks (3-4h) - [§5.1](CODE_REVIEW_360.md#L410-L441)

### Week 2: Scalability (18-24 hours)

4. [ ] Redis caching layer (8-10h) - [§6.1](CODE_REVIEW_360.md#L582-L612)
5. [ ] Cursor pagination (4-5h) - [§3.4](CODE_REVIEW_360.md#L257-L282)
6. [ ] Wire billing service to quota (6-8h) - [§1.4](CODE_REVIEW_360.md#L56-L94)

**Total Critical Path:** 28-37 hours

---

## 📊 Vibe Coding Risk Score

Based on 2026 industry benchmarks:

| Risk Category            | SwitchCV Score | Industry Avg | Status    |
| ------------------------ | -------------- | ------------ | --------- |
| Security Vulnerabilities | 42% (3/7)      | 52%          | ✅ Better |
| Technical Debt           | 85% (5/8)      | 32%          | ✅ Better |
| Scalability Bottlenecks  | 0% (0/4)       | 55%          | 🔴 Worse  |
| Testing Deficiencies     | 99% (20/23)    | 20%          | ✅ Better |
| Integration Issues       | 67% (2/3)      | 72%          | ✅ Better |
| Performance Overhead     | 40% (2/5)      | 65%          | ✅ Better |

**Overall Vibe Coding Maturity:** 55.5% (Target: 80%+ for production)

---

## 🎯 Next Actions (Priority Order)

1. **Today (4-6h):** Implement global rate limiting
2. **This Week (3-4h):** Add AI circuit breaker
3. **This Week (3-4h):** Fix test mock setup
4. **Next Week (8-10h):** Deploy Redis caching
5. **Next Week (10-12h):** Complete vector search pipeline

---

## 📝 Notes

- **Billing Service Update:** Discovered `functions/src/services/billingService.ts` EXISTS (CODE_REVIEW_360 was outdated). Needs integration with quota enforcement, not creation from scratch.
- **Test Coverage:** 79.13% lines is excellent for vibe-coded project (industry avg: 45%).
- **Cost Projection:** Without caching, annual Firestore costs will hit $2,190 at 10k users. Redis can reduce to <$500/yr.

---

**Document Version:** 1.0.0  
**Created:** 2026-01-05  
**Source Review:** [CODE_REVIEW_360.md](CODE_REVIEW_360.md) (Last Updated: 2026-01-04)  
**Next Review:** 2026-01-10 (after test mock fixes)
