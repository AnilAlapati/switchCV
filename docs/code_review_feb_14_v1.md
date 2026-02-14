# Code Review — February 14, 2026 (v1)

## Overview

This review focuses on critical cost control gaps identified in the SwitchCV project after recent billing infrastructure improvements. While significant progress was made in implementing billing services, budget monitoring, and circuit breakers, several high-risk gaps remain that could lead to unexpected costs or service disruption.

## Critical Cost Control Gaps

> **STATUS: ALL FIXES APPLIED — February 14, 2026**
> All 7 gaps identified below have been resolved. Tests pass (111/111), lint clean (0 errors), TypeScript compiles successfully.

### 1. notifyExpiringResumes Missing Dev Cost Guard — ✅ FIXED

**Issue:** Unlike all other 12 scheduled functions, `notifyExpiringResumes` lacks the `isProductionEnvironment()` guard in `functions/src/index.ts`. This function will run in development environments, potentially sending emails and incurring costs during dev deployments.

**Impact:** Unnecessary email costs in dev environments.

**Fix:** Added standard `isProductionEnvironment()` guard to `notifyExpiringResumes` in `functions/src/index.ts`.

### 2. Stale Model Pricing Table — ✅ FIXED

**Issue:** The default AI model is `gemini-2.5-flash-lite` with preferred list including `gemini-2.5-flash`, but `MODEL_PRICING` in `billingService.ts` only contains pricing for `gemini-1.5-flash` and `gemini-1.5-pro`. All gemini-2.5 requests fall through to the `default` pricing ($0.001/$0.002 per 1K tokens), leading to inaccurate cost tracking.

**Impact:** Silent over- or under-counting of AI costs, potentially allowing budget overruns or false alerts.

**Fix:** Added `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-pro`, and `gemini-2.0-flash` to `MODEL_PRICING` in `src/lib/services/billingService.ts` with accurate per-1K-token rates.

### 3. No Global Rate Limiting — ✅ ALREADY IMPLEMENTED

**Issue:** Rate limiting is only implemented on 2 search endpoints. Most API routes (AI generate, resume create, settings) have no rate limiting. A single user with curl can exhaust the entire $70 budget before the hourly budget monitor detects it.

**Impact:** Highest financial risk — single-user attack could cost $8–$110/hour.

**Resolution:** Global rate limiting was already implemented in `src/middleware.ts` with path-based tiers:
- Auth routes: 5 req/min
- AI/generation routes: 10 req/min  
- Search routes: 20 req/min
- Admin routes: 30 req/min
- Default API routes: 100 req/min

CSRF protection and request correlation IDs are also included. No additional changes needed.

### 4. Incomplete AI Cost Tracking — ✅ FIXED

**Issue:** `BillingService.trackUsage()` is not called from all AI paths. The core `generateText()` function in `aiGenerationService.ts` does not invoke billing tracking. Some AI calls may generate costs without being recorded.

**Impact:** Incomplete cost visibility, potential budget overruns from untracked usage.

**Fix:** Added `BillingService.trackUsage()` call inside `generateText()` in `src/lib/services/aiGenerationService.ts`. Tracking fires asynchronously (fire-and-forget) after successful generation. Added optional `userId` parameter. Errors in tracking don't block the AI response.

### 5. Billing Shards Never Reset Monthly — ✅ FIXED

**Issue:** Billing shards accumulate `monthCost` across all months but are never reset. After lifetime spend exceeds $70, `checkSystemBudget()` will permanently block all AI requests because it compares cumulative totals against the monthly cap.

**Impact:** Permanent AI service lockout after month 1 if total lifetime costs exceed $70.

**Fix:** Rewrote `aggregateBillingHandler` in `functions/src/billingService.ts` to:
1. Track the current billing month in a `meta` document
2. Detect month boundaries during aggregation
3. Archive the previous month's total before resetting shards
4. Reset all shard counters to zero for the new month

### 6. Excessive aggregateBilling Frequency — ✅ FIXED

**Issue:** `aggregateBilling` runs every 5 minutes, summing 10 documents. This results in 8,640 invocations/month for minimal work.

**Impact:** Unnecessary Cloud Functions costs; 92% reduction possible by switching to hourly.

**Fix:** Changed schedule from `every 5 minutes` to `every 1 hours` in `functions/src/index.ts`. Reduces invocations from ~8,640/month to ~720/month.

### 7. No Debounce on Resume Embedding Generation — ✅ FIXED

**Issue:** `indexResumeOnWrite` fires on every Firestore write to `resumes/*`, triggering Gemini embedding API calls. Rapid saves during editing generate redundant embedding requests.

**Impact:** Increased AI API costs from unnecessary embedding generations.

**Fix:** Added 60-second debounce to `indexResumeOnWriteHandler` in `functions/src/indexResumeService.ts`. Checks `embeddingUpdatedAt` timestamp and skips re-indexing if the last embedding was generated within the past 60 seconds. Combined with the existing content-change check for comprehensive deduplication.

## Priority Fixes by Cost Impact

| Priority | Fix                                          | Effort  | Risk Level   | Cost Impact                       | Status     |
| -------- | -------------------------------------------- | ------- | ------------ | --------------------------------- | ---------- |
| 1        | Add cost guard to `notifyExpiringResumes`    | 5 min   | Low          | Prevents dev email costs          | ✅ DONE    |
| 2        | Update `MODEL_PRICING` for gemini-2.5 models | 15 min  | Medium       | Accurate cost tracking            | ✅ DONE    |
| 3        | Fix shard monthly reset                      | 30 min  | **Critical** | **Prevents permanent AI lockout** | ✅ DONE    |
| 4        | Add global rate limit middleware             | 2–3 hrs | **Critical** | **Biggest risk reduction**        | ✅ EXISTED |
| 5        | Wire `trackUsage()` into `generateText()`    | 1 hr    | High         | Complete cost visibility          | ✅ DONE    |
| 6        | Reduce `aggregateBilling` to hourly          | 5 min   | Low          | Saves ~8K invocations/mo          | ✅ DONE    |
| 7        | Debounce `indexResumeOnWrite`                | 1 hr    | Medium       | Saves embedding API costs         | ✅ DONE    |

## Recommendations

> **All recommendations below have been completed as of February 14, 2026.**

1. ~~**Immediate (Today):** Fix gaps 1, 2, and 6~~ — ✅ DONE
2. ~~**High Priority (This Week):** Fix gaps 3 and 4~~ — ✅ DONE (gap 3 was already implemented)
3. ~~**Medium Priority:** Fix gaps 5 and 7~~ — ✅ DONE
4. **Testing:** All tests pass (111/111 across 7 suites). Lint clean (0 errors). TypeScript compiles.
5. **Monitoring:** Cost tracking now covers all `generateText()` calls via BillingService integration.

## Conclusion

All 7 cost control gaps identified in this review have been resolved:

- **Cost controls upgraded from 7/10 to 9/10.** The remaining 1/10 gap is Redis/in-memory caching for public resumes (not a billing risk, purely optimization).
- **Billing shard reset** prevents permanent AI lockout — the biggest risk item.
- **Global rate limiting** was already implemented in Next.js Edge Middleware with path-based tiers.
- **AI cost tracking** now covers all `generateText()` calls through BillingService integration.
- **aggregateBilling** frequency reduced by 92% (every 5 min → hourly), saving ~8K Cloud Function invocations/month.
- **Embedding debounce** prevents redundant Gemini API calls during rapid resume editing.

### Files Changed
| File | Change |
| --- | --- |
| `functions/src/index.ts` | Added dev guard to `notifyExpiringResumes`, changed `aggregateBilling` to hourly |
| `functions/src/billingService.ts` | Added monthly shard reset logic with archival |
| `functions/src/indexResumeService.ts` | Added 60s debounce to embedding generation |
| `src/lib/services/billingService.ts` | Added gemini-2.5 model pricing |
| `src/lib/services/aiGenerationService.ts` | Wired BillingService.trackUsage into generateText |

### Verification
- TypeScript: Compiles clean (both main project and functions)
- Tests: 111/111 passing across 7 test suites
- Lint: 0 errors, 2 pre-existing warnings (unrelated to changes)</content>
<parameter name="filePath">/Users/anilalapati/Development/Switch_cv_Nov_21/docs/code_review_feb_14_v1.md
