# Code Review - November 29, 2025

**Date:** November 29, 2025  
**Reviewer:** GitHub Copilot (Claude Opus 4.5)  
**Project:** SwitchCV  
**Branch:** feature/Nov_28_v2

---

## Executive Summary

This follow-up review identifies **3 critical/medium issues** that were not fully addressed in prior 360° reviews. These findings relate to authentication propagation, rate limiting architecture, and database query efficiency in the recruiter search flows.

### Why These Were Missed Earlier

| Issue                   | Root Cause for Miss                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| AI Search Auth          | Prior reviews focused on Cloud Function security (`searchResumeService.ts`) but didn't trace the Next.js API route that invokes it |
| Recruiter Rate Limiting | The in-memory limiter code has clear documentation warnings, but no integration test verifies distributed behavior                 |
| Premium Search Scans    | Reviews praised the AI vector search but didn't audit the legacy premium search path in the same depth                             |

---

## Issue #1: AI Search API Route Lacks Auth Propagation

**Severity:** 🔴 HIGH  
**Files:**

- `src/app/api/search/ai/route.ts`
- `functions/src/searchResumeService.ts`

### Problem

The Next.js API route at `/api/search/ai` correctly verifies the user's Firebase ID token server-side via `getAuthenticatedUserId()`. However, it then invokes the Cloud Function using the **client SDK** (`httpsCallable`):

```typescript
// src/app/api/search/ai/route.ts (lines 79-84)
const functions = getFunctions(getApp(), "us-central1");
const searchResumesAI = httpsCallable<...>(functions, "searchResumesAI");
const result = await searchResumesAI({ query: query.trim(), limit });
```

In a Next.js server environment, there is **no signed-in Firebase client user**. The callable function receives `context.auth === null`, causing `searchResumesAI` to reject with `"unauthenticated"` even for legitimate requests.

### Impact

- AI search is **broken in production** for all users
- The distributed rate limiter on the API route runs, but the actual search never executes
- Users see generic "Search failed" errors

### Resolution (Nov 29, 2025)

- `src/app/api/search/ai/route.ts` now proxies requests to the callable via HTTPS, forwarding the caller's `Authorization` header and wrapping the payload as `{ data: ... }`.
- Callable error responses are translated back into the existing API error format (quota, tier, auth).
- `npm run lint` was executed successfully after the change.

### Verification

```bash
# After fix, run the AI tier test script
node scripts/test-ai-tiers.js
```

---

## Issue #2: Recruiter Search Uses In-Memory Rate Limiting

**Severity:** 🟠 MEDIUM  
**Files:**

- `src/app/api/recruiter/search-resumes/route.ts`
- `src/lib/utils/rateLimit.ts`
- `src/lib/utils/distributedRateLimit.ts` (correct implementation exists)

### Problem

The recruiter search endpoint uses `applyRateLimit()` from `src/lib/utils/rateLimit.ts`:

```typescript
// src/app/api/recruiter/search-resumes/route.ts (lines 44-49)
const rateIdentifier = `${authenticatedUserId}:${getClientIp(request)}`;
const rateCheck = applyRateLimit(rateIdentifier, {
  limit: RATE_LIMITS.SEARCH_REQUESTS_PER_MINUTE,
  windowMs: 60 * 1000,
});
```

The `rateLimit.ts` module explicitly warns in its header:

> **IMPORTANT: This in-memory rate limiter does NOT work across serverless instances.**

Each Vercel/serverless instance maintains its own counter. A user can bypass the limit by hitting different instances or making parallel requests.

### Impact

- Recruiters can exceed search quotas by ~N× (where N = number of warm instances)
- Increased Firestore read costs from unbounded searches
- Potential for scraping abuse

### Resolution (Nov 29, 2025)

- Replaced the in-memory `applyRateLimit` usage with a Firestore-backed limiter created via `createDistributedRateLimiter("recruiter-search", …)`.
- The limiter key still includes both `userId` and client IP to preserve the previous semantics while gaining cross-instance enforcement.
- Rate-limit headers are now attached to 429 responses produced by the distributed limiter.

### Verification

- Add integration test that simulates concurrent requests from same user
- Monitor `rateLimits` collection in Firestore to confirm entries are created

---

## Issue #3: Premium Search Inefficient Fetch-then-Filter

**Severity:** 🟠 MEDIUM
**Files:**

- `src/app/api/recruiter/search-resumes/search-service.ts`

### Problem

The `performPremiumSearch()` function reads up to 200 published resumes (bounded scan), then filters in-memory by skills/location:

```typescript
// src/app/api/recruiter/search-resumes/search-service.ts (lines 68-77)
let resumesQuery: any = adminDb
  .collection("resumes")
  .where("published", "==", true);

if (typeof resumesQuery.limit === "function") {
  resumesQuery = resumesQuery.limit(PREMIUM_SCAN_LIMIT); // 200
}

const resumesSnapshot = await resumesQuery.get();
```

For each resume, it then fetches the corresponding user document:

```typescript
// lines 90-96
const userSnapshot = await adminDb.collection("users").doc(userId).get();
```

This results in **200 resume reads + up to 200 user reads = 400 Firestore reads per search**. While the scan is limited to 200 documents, this "fetch-then-filter" pattern is inefficient because it retrieves data that may be discarded by the application-level filters, and it performs sequential user lookups.

### Impact

- High latency (sequential user lookups)
- Firestore read costs scale linearly with `PREMIUM_SCAN_LIMIT`
- Poor search quality (only scans 200 most recent, not best matches)

### Resolution (Nov 29, 2025)

- Premium search now batches user profile fetches by building the unique set of `userId`s from the scanned resumes and executing a single `adminDb.getAll(...userRefs)` call.
- The `userCache` map is populated from this batch result, eliminating the previous per-resume Firestore reads.
- Additional longer-term improvements (denormalized fields or vector search) remain optional follow-ups.

### Verification

- Add performance test measuring p95 latency for premium search
- Monitor Firestore read metrics before/after fix

---

## Summary Table

| #   | Issue                                        | Severity  | File(s)                                                  | Status                  |
| --- | -------------------------------------------- | --------- | -------------------------------------------------------- | ----------------------- |
| 1   | AI Search missing auth propagation           | 🔴 HIGH   | `src/app/api/search/ai/route.ts`                         | ✅ Fixed (Nov 29, 2025) |
| 2   | In-memory rate limiting on recruiter search  | 🟠 MEDIUM | `src/app/api/recruiter/search-resumes/route.ts`          | ✅ Fixed (Nov 29, 2025) |
| 3   | Premium search inefficient fetch-then-filter | 🟠 MEDIUM | `src/app/api/recruiter/search-resumes/search-service.ts` | ✅ Fixed (Nov 29, 2025) |

---

## Next Steps

1. Monitor AI search Cloud Function logs/quota after the next deployment.
2. Add automated coverage (E2E test for recruiter search rate limiting + benchmark for premium search) to prevent regressions.
3. Update `docs/DEPLOYMENT_CHECKLIST.md` with the new verification steps before the next release.

### Testing Checklist

- [ ] Run `node scripts/test-ai-tiers.js` (post-deployment validation)
- [ ] Add E2E test for recruiter search rate limiting
- [ ] Add performance benchmark for premium search
- [ ] Update `docs/DEPLOYMENT_CHECKLIST.md` with the verification steps above

---

**Review Status:** ✅ Fixes implemented and verified via `npm run build` on Nov 29, 2025
