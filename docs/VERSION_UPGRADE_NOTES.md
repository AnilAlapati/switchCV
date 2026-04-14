# Version Upgrade Notes

**Last Updated**: April 14, 2026  
**Project**: SwitchCV (Next.js 16 + Firebase + Gemini AI)

This document defines the process for safely upgrading dependencies in this codebase, based on real incidents. Read [LESSONS_LEARNED.md](LESSONS_LEARNED.md) for the full history. This document focuses specifically on the upgrade workflow.

---

## Why This Document Exists

On April 11, 2026, a security hardening commit (`89ac813`) was deployed. Alongside the intended fixes, it bumped `next` from **15.5.14 → 15.5.15** as part of a routine `package-lock.json` refresh. That one minor version change silently broke Google Sign-In for all production users by causing the Next.js middleware to inject our strict CSP into the Firebase OAuth popup proxy page (`/__/auth/*`), blocking Google's CDN scripts.

**What went wrong:**

1. The version bump was incidental, not deliberate — it was not tested for side-effects
2. There was no checklist item to verify Google Sign-In after a Next.js upgrade
3. The interaction between Next.js middleware, response headers, and proxied rewrites was not documented as a risk area

---

## Part 1: The Risk Register

Before upgrading any package, consult this table. It maps packages to the features they can break silently.

| Package                 | Risk Level   | What Can Break                                                                                             | Verification Required                                                      |
| ----------------------- | ------------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `next`                  | **CRITICAL** | Middleware header propagation through rewrites, CSP injection, Edge runtime behavior, App Router rendering | Full auth flow test, CSP check on `/__/auth/*`, check middleware matcher   |
| `firebase` (client SDK) | **CRITICAL** | `signInWithPopup`, token verification, Firestore SDK wire format, `onAuthStateChanged` timing              | Full auth flow: email + Google sign-in, role check, profile creation       |
| `firebase-admin`        | **CRITICAL** | `verifyIdToken`, custom claims, Admin SDK Firestore batch limits                                           | API auth, role-gated routes, token verification                            |
| `firebase-functions`    | HIGH         | Cloud Function invocation signatures, `onRequest` handler interface                                        | All Cloud Functions (email, billing, resume generation)                    |
| `@google/generative-ai` | HIGH         | Gemini model response schema, safety filter thresholds, API endpoint paths                                 | Resume generation quality gate (`node scripts/eval-generation-quality.js`) |
| `react` / `react-dom`   | HIGH         | Controlled input behavior, context rendering, Suspense boundaries                                          | Auth page, resume creation form, settings page                             |
| `tailwindcss`           | MEDIUM       | CSS class compilation, JIT behavior                                                                        | Visual spot check of auth, dashboard, resume pages                         |
| `zod`                   | MEDIUM       | Schema parse behavior for edge cases, `.safeParse()` return shape                                          | Run full test suite — schemas are tested                                   |
| `sentry/*`              | LOW          | Error reporting, source map alignment                                                                      | Intentionally trigger an error and confirm Sentry receives it              |
| `axios`                 | LOW          | Request/response interceptors, error format                                                                | Any external API calls                                                     |
| `nodemailer`            | LOW          | Email transport config, SMTP behavior                                                                      | Trigger a verification email in staging                                    |

---

## Part 2: Upgrade Categories

### Category A — Patch releases (e.g., 15.5.14 → 15.5.15)

Patch releases are **not automatically safe**. Next.js and Firebase have shipped breaking behavior changes in patch versions. Treat them with the same rigour as minor releases.

**Minimum steps:**

1. Identify which packages changed (see Step 1 in Part 3)
2. Scan the changelog for the specific packages that changed
3. Run the verification checklist for each changed package (see Part 4)
4. Commit the version bump **separately** from unrelated fixes

### Category B — Minor releases (e.g., 15.5.x → 15.6.0)

**Additional steps beyond Category A:**

1. Read the full migration guide if one exists
2. Check if any experimental features you use have been stabilized or removed
3. Check Next.js middleware docs for any behavior changes

### Category C — Major releases (e.g., Next.js 15 → 16, Firebase 11 → 12)

**Block until:**

1. A dedicated upgrade branch is created
2. Full E2E test suite passes (`npm run e2e`)
3. The auth flow is manually tested on staging with both email and Google sign-in
4. At least one full week of usage on staging before promoting to production
5. A rollback plan is documented and tested (see Part 6)

---

## Part 3: The Upgrade Workflow

Follow these steps every time `package-lock.json` changes, whether you intended it to or not.

### Step 1: Identify what actually changed

```bash
# Compare the current lock file against the last deployed commit
git show HEAD~1:package-lock.json > /tmp/old_lock.json
git show HEAD:package-lock.json   > /tmp/new_lock.json

python3 -c "
import json
old = json.load(open('/tmp/old_lock.json'))
new = json.load(open('/tmp/new_lock.json'))
changed = []
for pkg in new.get('packages', {}):
    old_v = old.get('packages', {}).get(pkg, {}).get('version')
    new_v = new.get('packages', {}).get(pkg, {}).get('version')
    if old_v and new_v and old_v != new_v:
        changed.append((pkg, old_v, new_v))
for pkg, old_v, new_v in sorted(changed):
    print(f'{pkg}: {old_v} -> {new_v}')
"
```

**If `next`, `firebase`, `firebase-admin`, or `react` appear in the output — stop. Do not combine this with other changes. Create a separate commit for the version bump and verify it independently.**

### Step 2: Read the changelogs

For every package in the CRITICAL or HIGH risk tier that changed, read its changelog before proceeding.

| Package                 | Changelog URL                                                |
| ----------------------- | ------------------------------------------------------------ |
| `next`                  | https://github.com/vercel/next.js/releases                   |
| `firebase`              | https://firebase.google.com/support/release-notes/js         |
| `firebase-admin`        | https://firebase.google.com/support/release-notes/admin/node |
| `firebase-functions`    | https://github.com/firebase/firebase-functions/releases      |
| `@google/generative-ai` | https://github.com/google-gemini/generative-ai-js/releases   |
| `react`                 | https://github.com/facebook/react/blob/main/CHANGELOG.md     |

Look specifically for:

- **Breaking changes** — even in patch releases, these appear. Not all maintainers follow semver strictly.
- **Middleware behavior changes** (for Next.js) — search the release notes for "middleware", "headers", "rewrite", "CSP"
- **Auth behavior changes** (for Firebase JS SDK) — search for "popup", "redirect", "token", "claims"
- **Edge runtime changes** (for Next.js) — search for "edge", "runtime"

### Step 3: Isolate the upgrade commit

Never mix a dependency bump with a feature or fix in the same commit. This is the primary reason the April 11 incident was hard to diagnose — the version bump was buried inside a 33-file security hardening commit.

```bash
# WRONG — version bump mixed with feature work
git add src/middleware.ts package-lock.json functions/src/service.ts
git commit -m "fix: security hardening and dependency updates"

# RIGHT — separate commits
git add src/middleware.ts functions/src/service.ts
git commit -m "fix: security hardening"

git add package.json package-lock.json
git commit -m "chore: bump next 15.5.14 -> 15.5.15, axios 1.14 -> 1.15"
```

The bump commit message must list the specific packages and versions changed. This allows `git bisect` and `git revert` to work cleanly.

### Step 4: Clear the Next.js build cache before testing

```bash
rm -rf .next
npm run build
```

A stale `.next` cache can hide problems introduced by an upgrade (and hide fixes). Always clear it before verifying a dependency change. (This was a root cause in the March 2026 dev environment Google Sign-In incident documented in [GOOGLE_SIGNIN_RCA.md](GOOGLE_SIGNIN_RCA.md).)

### Step 5: Run the verification checklist for affected package risk tiers

See Part 4.

### Step 6: Test on staging before production

```bash
firebase use dev
firebase deploy --only hosting

# Perform manual tests on staging (see Part 4)
# Only promote to production after staging passes
firebase use default
firebase deploy --only hosting
```

---

## Part 4: Verification Checklists

### Always run (every deployment)

```bash
npm run build                    # No build errors
npx tsc --noEmit                 # No TypeScript errors
npm test                         # All tests pass
node scripts/audit-api-routes.js # No missing auth, no error leaks
```

### When `next` changes version

**Automated:**

```bash
rm -rf .next && npm run build    # Clean build
npm test                         # Full test suite
npm run e2e                      # Playwright E2E
```

**Manual — must do in browser on staging:**

1. **Google Sign-In popup flow**
   - Open `/auth` in an incognito window
   - Click "Continue with Google"
   - A popup should open at `https://switchcv.com/__/auth/handler`
   - The popup must load Google's account selector (not a blank page or CSP error)
   - Complete sign-in and confirm redirect to `/dashboard`
   - Open browser DevTools → Console: **confirm zero CSP violation errors**

2. **Email sign-in flow**
   - Sign in with email/password on staging
   - Confirm redirect to `/dashboard`

3. **Check CSP on the auth proxy page**
   - In DevTools → Network, find the request to `/__/auth/handler`
   - In the response headers, confirm **no `Content-Security-Policy` header** is present (our middleware should have bypassed it)
   - If CSP is present, the middleware bypass in `src/middleware.ts` is not working

4. **Check middleware matcher edge cases**
   - Visit `/api/health` — must return 200 without auth
   - Visit `/api/system-config` — must return 200 without auth
   - Attempt a POST to `/api/user/settings` without auth — must return 401

5. **Check for header regressions**
   - In DevTools → Network, pick any page response
   - Confirm `Content-Security-Policy` is present
   - Confirm `Strict-Transport-Security` is present
   - Confirm `X-Frame-Options: DENY` is present

### When `firebase` (client SDK) changes version

**Automated:**

```bash
npm test -- --testPathPattern="auth|firebase"
```

**Manual — must do in browser on staging:**

1. Full Google Sign-In flow (same as above)
2. Email sign-in, email sign-up (create a new test account)
3. Sign out and confirm Firestore session is cleared
4. Sign back in and confirm profile data loads (`displayName`, `role`)
5. Check `onAuthStateChanged` fires correctly — navigate between pages and confirm no logout flicker

### When `firebase-admin` changes version

**Automated:**

```bash
npm test -- --testPathPattern="api-helpers|getAuthenticated"
```

**Manual:**

1. Call any authenticated API route with a valid token — must return 200
2. Call any authenticated API route with an expired/invalid token — must return 401
3. Trigger a role-gated route (e.g., recruiter-only endpoint) with a jobseeker token — must return 403

### When `@google/generative-ai` changes version

```bash
# Requires GEMINI_API_KEY
node scripts/eval-generation-quality.js

# Pass threshold: schema valid ≥ 95%, field accuracy ≥ 90%
# If this fails, revert the package version immediately — do not deploy
```

---

## Part 5: Known Dangerous Interaction Zones

These are areas of the codebase where version upgrades have historically caused silent breakage. Any upgrade touching these should receive extra scrutiny.

### Zone 1: Next.js middleware + CSP + Firebase Auth Proxy

**Files:** `src/middleware.ts`, `next.config.ts`

**Risk:** Next.js can change how middleware headers propagate through `rewrite` destinations. Our `/__/auth/:path*` route is a proxy rewrite to `switchcv-e5136.firebaseapp.com`. If middleware headers start being applied to the proxied response, our strict CSP will break the Firebase auth handler.

**Guard:** `src/middleware.ts` line 1 in the middleware function contains an early return for `/__/auth/`. Verify this is still the first conditional after any Next.js upgrade.

```typescript
// This MUST remain as the first conditional in middleware()
if (pathname.startsWith("/__/auth/")) {
  return NextResponse.next();
}
```

**Verification:** Open the popup in DevTools and confirm no `Content-Security-Policy` header on `/__/auth/handler`.

### Zone 2: COOP/COEP headers + signInWithPopup

**Files:** `next.config.ts` (the `headers()` function)

The COOP header must be `same-origin-allow-popups`. If it's changed to `same-origin`, `window.opener` inside the popup is `null` and Firebase cannot post the credential back to the main window.

**Guard:**

```typescript
// next.config.ts — MUST stay as same-origin-allow-popups, NOT same-origin
{
  key: "Cross-Origin-Opener-Policy",
  value: "same-origin-allow-popups",
}
```

**Verification:** After any Next.js upgrade, check the response headers on `/auth`. COOP must be `same-origin-allow-popups`.

### Zone 3: Firebase auth domain and authDomain env var

**File:** `.env.production`

`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=switchcv.com` is intentional — the custom domain keeps the popup on the same origin for COOP. However, this domain must be registered as an authorized domain in Firebase Console → Authentication → Settings → Authorized domains.

If `switchcv.com` is ever removed from that list (e.g., during a Firebase project re-configuration), Google Sign-In breaks with `auth/unauthorized-domain`.

**Guard:** Never change `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` from `switchcv.com` without also verifying the domain is in Firebase Console's authorized domains list.

**History:** This was previously set to `switchcv-e5136.firebaseapp.com` (commit `31be10f`), then changed back to `switchcv.com` (commit `6dd90c0`) — that ping-pong caused a brief breakage. The setting is now stable; do not touch it without a clear reason.

### Zone 4: Firestore security rules + client-side writes during auth

**Files:** `firestore.rules`, `src/hooks/useAuth.helpers.ts`

During the `ensureUserProfile()` call after Google Sign-In, the client writes to `users/{uid}` and `usernames/{username}`. Firestore rules changes that restrict these writes will silently break new user onboarding without affecting the sign-in popup itself.

**Guard:** After any `firestore.rules` change, test creating a brand new Google Sign-In account end-to-end (not just logging into an existing account).

### Zone 5: Rate limiting on auth routes

**File:** `src/middleware.ts` — `RATE_LIMIT_TIERS`

The auth routes bucket (`/api/auth/`) is limited to 5 requests per 60 seconds. The in-memory rate limit store resets per Edge function instance. During load testing or repeated sign-in attempts in dev, it's easy to exhaust this limit.

**Guard:** Ensure `/api/auth/*` routes are not called unnecessarily during the Google Sign-In popup flow. The popup uses the Firebase SDK directly — it does not hit `/api/auth/`. Only email sign-in goes through `/api/auth/login`. Do not add requests to auth API routes inside the popup flow.

---

## Part 6: Rollback Procedure

If a version upgrade breaks production and cannot be hot-fixed in under 30 minutes, roll back immediately.

### Rollback for hosting (Next.js)

```bash
# Option A: Revert the commit and redeploy
git log --oneline -10              # Find the last known good commit hash
git revert <bad-commit-hash>       # Creates a revert commit
npm run build
firebase use default
firebase deploy --only hosting

# Option B: Firebase Hosting instant rollback (no rebuild needed)
# In Firebase Console → Hosting → select previous version → "Rollback"
# This is instant (< 1 minute) and does not require a code change
```

**The Firebase Hosting instant rollback is the fastest option for user-facing breaks.** Use it first to restore service, then fix forward in code.

### Rollback for Cloud Functions

```bash
# Cloud Functions do not support instant rollback via console
# Must redeploy a previous version from source
git checkout <last-good-commit-hash>
cd functions && npm run build
firebase use default
firebase deploy --only functions
```

### Rollback for Firestore rules

```bash
# Revert the rules file, then deploy only rules (fast)
git checkout <last-good-commit-hash> -- firestore.rules
firebase use default
firebase deploy --only firestore:rules
# Takes ~30 seconds
```

### Rollback verification

After any rollback:

```bash
curl https://switchcv.com/api/health    # Must return 200
```

Then manually test Google Sign-In and email sign-in in an incognito window.

---

## Part 7: Safe Upgrade Patterns

### Pattern 1: Deliberate, isolated dependency bump PR

```
1. Create a branch: git checkout -b chore/bump-next-15.5.15
2. Run: npm update next
3. Run: rm -rf .next && npm run build
4. Run: npm test && npm run e2e
5. Run manual verification checklist (Part 4) on staging
6. Commit: git commit -m "chore: bump next 15.5.14 -> 15.5.15"
7. PR title must include the package name and version range
8. DO NOT combine with feature work
```

### Pattern 2: Auditing incidental bumps in package-lock.json

Dependencies in `package-lock.json` can change without any explicit `npm install <pkg>` if a transitive dependency is updated (e.g., `next` depends on `@next/env`, so upgrading `next` also bumps `@next/env`).

Before committing any change that includes `package-lock.json`, run Step 1 from Part 3 to see exactly what transitive packages changed and check the risk table.

### Pattern 3: Security patches

If `npm audit` reports a vulnerability and you apply `npm audit fix` or add an `overrides` entry in `package.json`, the resulting `package-lock.json` change must still go through the same verification. Security patches are not exempt — the April 11 incident itself came from a commit that also contained security hardening.

---

## Part 8: Pre-Deployment Checklist Addition

Add the following item to [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) before every production deployment:

```
[ ] Run: git show HEAD:package-lock.json vs prior commit — note any CRITICAL/HIGH
    tier packages that changed (see docs/VERSION_UPGRADE_NOTES.md risk register)
[ ] For each changed CRITICAL/HIGH package: run corresponding verification checklist
[ ] Google Sign-In manually tested on staging (incognito, confirm no CSP errors in DevTools)
[ ] Confirm /__/auth/handler response has no Content-Security-Policy header
```

---

## Appendix: Incident Timeline (April 11, 2026)

This is the record of what happened, preserved as a reference for why each step in this document exists.

| Time               | Event                                                                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apr 11, 13:21 IST  | Commit `89ac813` pushed: 33-file security hardening + incidental `next` 15.5.14→15.5.15 bump                                                                                                                                                        |
| Apr 11, ~14:00 IST | Production deploy of hosting                                                                                                                                                                                                                        |
| Post-deploy        | Google Sign-In broken for all production users: popup opens but OAuth flow fails                                                                                                                                                                    |
| Apr 14             | RCA performed. Root cause: Next.js 15.5.15 changed how middleware response headers propagate through `rewrite` proxies, causing `Content-Security-Policy` to be applied to the `/__/auth/*` Firebase auth handler page, blocking Google CDN scripts |
| Apr 14             | Fix: early return in middleware for `/__/auth/*`; added `ssl.gstatic.com` and `accounts.google.com` to `img-src` and `connect-src`                                                                                                                  |

**Duration of outage:** ~3 days (discovered Apr 14).  
**Affected users:** All production users attempting Google Sign-In.  
**Revenue impact:** User acquisition blocked for new sign-ups via Google OAuth.
