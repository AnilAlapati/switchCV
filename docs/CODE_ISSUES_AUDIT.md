# Codebase Audit & Issues Report (v4)

**Date:** November 30, 2025 (post-regression sweep)
**Scope:** Full Codebase Analysis (`src/`, `functions/`, `scripts/`, `firestore.rules`, root configs)
**Auditor:** GitHub Copilot

---

## Executive Summary

The remediation program from v3 is still holding, but the latest pass uncovered three high-severity regressions: multiple Next.js API routes pulled in the browser-only Firebase SDK, so production handlers either crash (`ReferenceError: self is not defined`) or attempt Firestore reads/writes as anonymous clients. In addition, recruiter-access workflows still lack role enforcement, and support feedback throttling is limited to a single server instance. These gaps were all introduced after the previous audit and require server-side fixes. Updated status counts:

| Severity    | Open Findings | Notes                                                                                                           |
| ----------- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| 🔴 Critical | 0             | No active privilege-escalation vectors detected.                                                                |
| 🟠 High     | 3             | Server API routes rely on the browser Firebase SDK, so Firestore requests fail and security rules are bypassed. |
| 🟡 Medium   | 5             | Access-control validation, local-only throttling, and legacy null-safety fixes remain outstanding.              |
| 🔵 Low      | 2             | Config refresh/analytics guardrails are still pending but low risk.                                             |

---

## 1. Remediation Highlights (✅ Completed Previously)

- Firestore privilege escalation paths remain sealed (`firestore.rules`, `functions/src/authFunctions.ts`).
- AI resume endpoints continue to enforce tier allowlists and distributed rate limits (`functions/src/resumeService.ts`).
- Resume creation writes through the sharded counter and fan-out flow (`src/app/api/resumes/create/route.ts`).
- Destructive git maintenance remains opt-in via `scripts/auto-maintain.sh`.

---

## 2. High Findings (🚨 New)

### H1. Server recruiter search still uses the browser Firebase SDK

- **Files:** `src/app/api/recruiter/search/route.ts`, `src/lib/firebase.ts`, `firestore.rules`
- **Issue:** The handler imports `db` from `@/lib/firebase` plus `collection/getDocs` from `firebase/firestore`. When this module loads on the Node runtime, `firebase.ts` eagerly calls `getAuth(app)` which dereferences `self/window`, producing `ReferenceError: self is not defined`. Even if the import succeeds, Firestore calls run without an ID token, while `firestore.rules` restrict `/resumes` reads to authenticated owners/recruiters. Production requests therefore fail with `Missing or insufficient permissions`, so recruiters cannot search.
- **Impact:** Resume search for recruiters is effectively down in server environments, and logs fill with 500 errors. The route also leaks public Firebase config into the serverless bundle, increasing cold-start size.
- **Recommendation:** Stop importing the web SDK in server code. Replace all `db` usage with the already-initialized `adminDb`, fetch user docs by `adminDb.collection("users").doc(userId)`, and keep rate limiting/quota enforcement as-is. This also needs a follow-up role check (see M1).

### H2. `/api/recruiters/verify-token` cannot read or update tokens

- **Files:** `src/app/api/recruiters/verify-token/route.ts`, `firestore.rules`
- **Issue:** The route pulls `doc/getDoc/updateDoc` from `firebase/firestore` and uses `db` from `@/lib/firebase`. Firestore security rules lock `/accessTokens` so only authenticated recruiters/candidates can read their documents. Because the server route runs without a Firebase user session, all `getDoc` and `updateDoc` calls reject with `Missing or insufficient permissions`, so looking up a token by `tokenId` or incrementing `usageCount` never works.
- **Impact:** Token verification silently falls back to signature-only mode, usage metrics & `lastUsedAt` timestamps never update, and revoked tokens remain indistinguishable from active ones because the backing document is unreachable.
- **Recommendation:** Use `adminDb.collection("accessTokens")` (and `adminDb.collection("accessTokenAudit")`) for all reads/writes, keeping Firestore security rules as a defense-in-depth for client access only. This also removes the browser SDK from the server bundle.

### H3. Analytics API still writes through the browser SDK

- **Files:** `src/app/api/profiles/analytics/route.ts`, `src/lib/services/analyticsService.ts`, `firestore.rules`
- **Issue:** Both `getAnalytics` and `trackAnalyticsEvent` call `collection/doc/setDoc` from `firebase/firestore` via `db` from `@/lib/firebase`. The surrounding Next.js route is server-only, so importing the service initializes the browser SDK (same `self` crash risk as above). When requests make it through, Firestore sees `request.auth == null`, yet the rules for `/analytics` require authentication for all reads/writes. Every analytics read/write therefore fails in production.
- **Impact:** Dashboard metrics, engagement tracking, and download counters all stay at zero, while the API responds with 500/403 errors. No telemetry reaches `analytics/*`, defeating downstream dashboards and billing heuristics.
- **Recommendation:** Port `analyticsService` to the Admin SDK (`adminDb`), or proxy it through an internal service that uses service-account credentials. Avoid importing `@/lib/firebase` from any server route.

---

## 3. Medium Findings (🟡)

### M1. Access-request endpoints never verify recruiter role (new)

- **Files:** `src/app/api/recruiter/request-access/route.ts`, `src/app/api/profiles/request-access/route.ts`
- **Issue:** After authentication these handlers immediately call `adminDb` but never confirm that the caller’s `role` (or custom claim) is `recruiter`. The only gating is a non-empty `companyName`. Because admin privileges bypass Firestore rules, any authenticated jobseeker can craft recruiter access requests, spam candidates, and generate admin notifications.
- **Recommendation:** Retrieve `role` via `getUserRole` or decoded custom claims and reject non-recruiter callers before touching Firestore. Consider double-checking `isRecruiter`/`tier` inside the transaction to prevent spoofing.

### M2. Profile search imports browser Firebase through shared utilities (new)

- **Files:** `src/app/api/profiles/search/route.ts`, `src/app/api/profiles/search/search-query.ts`, `src/lib/firebase.ts`
- **Issue:** The route reuses `buildNormalizedFilters` from `search-query.ts`. That module imports `collection/doc/getDoc` from `firebase/firestore` plus `db` from `@/lib/firebase` even though the server handler only needs pure string helpers. Importing the module on the server therefore spins up the browser SDK, triggering the same `self` reference errors and bundling all client-side Firebase code into the serverless artifact.
- **Recommendation:** Split `search-query.ts` into two files: one with pure normalization/matching helpers (safe for server imports) and one with client-only Firestore queries. Point the server route at the pure helper module.

### M3. Support feedback rate limiting is per-instance memory (new)

- **Files:** `src/lib/services/supportFeedbackService.ts`, `src/app/api/contact/feedback/route.ts`
- **Issue:** `checkRateLimit` stores counts in a module-level `Map`. Each serverless instance maintains its own counters, which reset on cold start or redeploy. Attackers can bypass the “5 submissions/hour per IP” guard by spraying requests across instances or waiting for a restart.
- **Recommendation:** Swap in the existing distributed limiter (`checkDistributedRateLimit`) or a Redis/Firestore counter keyed by IP, and persist the reset timestamp so limits survive process restarts.

### M4. Firebase client null-safety (carried forward)

- **Files:** `src/lib/firebase.ts`
- **Status:** _Open_
- **Summary:** The module still exports `auth`, `db`, etc. via casts, so misconfigured environments crash before any guard can run. Follow the accessor plan from v3 (throw descriptive errors or lazily init per call).

### M5. Email verification UX on localhost (carried forward)

- **Files:** `src/hooks/useAuth.tsx`
- **Status:** _Open_
- **Summary:** Without `NEXT_PUBLIC_AUTH_VERIFICATION_URL`, verification links fall back to Firebase defaults that point to production. Supply an origin-aware fallback or block signup when no callback URL is configured.

---

## 4. Low Findings (🔵)

### L1. System config cache TTL not tunable (carried forward)

- `src/context/SystemConfigProvider.tsx` still hardcodes a 5-minute `sessionStorage` cache, delaying emergency toggles. Externalize TTL and broadcast updates across tabs.

### L2. Firebase analytics init not guarded (carried forward)

- `src/lib/firebase.ts` still runs `isSupported().then(...)` without swallowing rejections during SSR. Guard on `typeof window !== "undefined"` and log-and-ignore failures.

---

## 5. Next Steps

1. **Replatform server routes off the browser SDK (H1–H3):** Use `adminDb` everywhere, add regression tests that stub `firebase-admin` only, and run an integration check to ensure Firestore reads succeed without client credentials.
2. **Enforce recruiter authorization (M1):** Require `role === "recruiter"` (or admin) before creating contact/access requests, and log violations.
3. **Ship distributed throttling for support feedback (M3):** Wire Firestore-backed rate limits or Redis before enabling the endpoint publicly.
4. **Close out legacy items (M4–L2):** Move Firebase client exports behind safe getters and finish the verification/config polish as part of the same refactor.

> ✅ _Verification:_ Please rerun the serverless smoke tests after replacing the browser SDK imports. The failures described above reproduce immediately when invoking the affected routes via `curl` because Firestore rejects unauthenticated requests.
