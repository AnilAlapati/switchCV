# Codebase Audit & Issues Report (v3)

**Date:** November 29, 2025 (post-remediation refresh)
**Scope:** Full Codebase Analysis (`src/`, `functions/`, `scripts/`, `firestore.rules`, root configs)
**Auditor:** GitHub Copilot

---

## Executive Summary

The remediation plan captured in `docs/CODE_REMEDIATION_PLAN.md` has landed. All previously documented 🔴 critical and 🟠 high findings are now mitigated in code:

- Field-level Firestore enforcement locks down privileged attributes, and `setUserRole` is callable-admin only.
- Resume AI endpoints now validate subscription tiers, rate-limit usage, and restrict expensive models.
- Automated git maintenance hooks are opt-in; destructive cleanup is gone.
- Resume creation uses a sharded ID counter and single-writer fan-out pipeline.

Only a handful of 🟡/🔵 issues remain from the earlier audit, mostly usability or resiliency concerns that were not in scope for the security sprint. Updated status counts:

| Severity    | Open Findings | Notes                                                                                    |
| ----------- | ------------- | ---------------------------------------------------------------------------------------- |
| 🔴 Critical | 0             | All privilege escalation & billing bypass vectors addressed.                             |
| 🟠 High     | 0             | Architectural hotspots (data duplication, ID bottleneck, server-only secrets) mitigated. |
| 🟡 Medium   | 2             | Runtime guardrails and verification UX need final polish.                                |
| 🔵 Low      | 2             | Configurability/observability gaps remain optional improvements.                         |

---

## 1. Remediation Highlights (✅ Completed)

### 1.1 Firestore Privilege Escalation Blocked

- **Files:** `firestore.rules`, `functions/src/authFunctions.ts`
- **What changed:** Rules now whitelist allowed keys, lock `role`/`subscriptionTier`/`isRecruiter`, and deny all access to `config/system`. Role changes go through the new callable admin endpoint, so users can no longer self-promote.

### 1.2 AI Resume Endpoint Hardening

- **Files:** `functions/src/resumeService.ts`, `functions/src/middleware/rateLimiter.ts`
- **What changed:** Tier-specific model allowlists, hourly/daily rate limits, and structured logging prevent free users from invoking premium models or spiking spend. CORS config now rejects wildcard origins.

### 1.3 Resume Pipeline Consistency

- **Files:** `src/app/api/resumes/create/route.ts`, `src/lib/numericIdGenerator.ts`, Cloud Function fan-out
- **What changed:** Writes are centralized server-side with sharded counters and background fan-out to `allResumes`, eliminating the previous multi-client race conditions and single-document ID bottleneck.

### 1.4 Developer Tooling Safety

- **Files:** `scripts/auto-maintain.sh`, Husky config
- **What changed:** The precommit hook no longer runs destructive git maintenance automatically; the script is now opt-in (`--git-maintenance`) and limited to cache cleanup.

### 1.5 Test & Type Stability

- **Files:** `src/__tests__/app/auth/page.test.tsx`, `tsconfig.json`, `package.json`
- **What changed:** Tests inject `SystemConfigProvider` mocks, React 19 JSX typing errors are resolved, and duplicated dependencies (e.g., `firebase-tools`, placeholder `k6`) were removed.

---

## 2. Open Findings (🟡 Medium)

### M1. Firebase Client Null-Safety

- **Location:** `src/lib/firebase.ts`
- **Status:** _Open_
- **Issue:** The module still exports `auth`, `db`, etc. by casting possibly-null singletons (`const authClient = auth as Auth`). When Firebase config is missing (e.g., mis-set env in staging) the module reports `firebaseStatus.isReady = false` yet downstream consumers will still dereference the casted objects and crash.
- **Impact:** Any environment bootstrap regression translates into an immediate runtime failure before graceful degradation or feature flag checks can run.
- **Recommendation:** Export accessors (e.g., `getAuthClient()`), throw descriptive errors when `firebaseStatus.isReady` is false, or lazily initialize clients per call rather than relying on module-level casts.

### M2. Email Verification UX on Localhost

- **Location:** `src/hooks/useAuth.tsx` (`getActionCodeSettings`)
- **Status:** _Open_
- **Issue:** When running on localhost without `NEXT_PUBLIC_AUTH_VERIFICATION_URL`, the helper returns `undefined`, so `sendEmailVerification` silently uses Firebase defaults that point to production. This was the original "fails silently on localhost" bug.
- **Impact:** Developers cannot validate the verification flow locally, and QA environments risk sending users to the wrong domain.
- **Recommendation:** Always supply an environment-aware URL via config (falls back to origin), and block signup in dev if neither env var nor origin is available so the failure is explicit.

---

## 3. Open Findings (🔵 Low)

### L1. System Config Cache TTL Not Tunable

- **Location:** `src/context/SystemConfigProvider.tsx`
- **Status:** _Partially addressed_
- **Issue:** The provider now fetches via `/api/system-config` but still relies on a hardcoded `CONFIG_CACHE_TTL_MS` (5 minutes) stored in `sessionStorage`. Operators cannot shorten/extend the cache without a redeploy, and multi-tab coherence still depends on session storage rather than broadcast channels/local storage.
- **Impact:** Emergency toggles (maintenance mode, feature kills) may take up to five minutes to propagate on long-lived sessions.
- **Recommendation:** Move TTL to remote config or env, broadcast updates via `BroadcastChannel`, and consider falling back to `localStorage` to share cache across tabs.

### L2. Firebase Client Analytics Not Guarded

- **Location:** `src/lib/firebase.ts`
- **Status:** _Open_
- **Issue:** Analytics initialization still runs `isSupported().then(...)` without cancellation and caches the promise globally. During SSR or when the window object disappears (Next.js fast refresh), the promise may reject noisily.
- **Impact:** Low-severity console noise; however, it complicates diagnosing real auth init failures.
- **Recommendation:** Gate analytics init behind `if (typeof window === "undefined") return;` (already partially present) and swallow promise rejections with logging.

---

## 4. Next Steps

1. **Prioritize M1 + M2** — these are the only remaining user-facing risks. Move null-safe Firebase exports and verification URL config into the next sprint.
2. **Optional polish for L1/L2** — address cache configurability and analytics logging when touching the config stack.
3. **Keep this report in sync** — after each remediation PR merges, update both this audit and `CODE_REMEDIATION_PLAN.md` so product/security stakeholders have a single source of truth.

> ✅ _Verification:_ Firestore simulator and manual endpoint tests confirm all previously critical paths are sealed. Re-run automated security tests before the next release to guard against regressions.
