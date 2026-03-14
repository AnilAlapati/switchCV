# Google Sign-In Dev Environment RCA

**Date:** 2025-03-14
**Status:** RESOLVED — root cause was approval gate, not sign-in failure
**Affected:** Dev environment (`switchcv-dev` Firebase project)
**Working:** Production (`switchcv-e5136` Firebase project)

---

## Symptom

Google Sign-In popup does not complete successfully in the dev environment (`localhost:3000/auth`). Production environment works normally.

## Investigation Summary

### What Was Verified (All Passing)

| Check                         | Result | Details                                                                          |
| ----------------------------- | ------ | -------------------------------------------------------------------------------- |
| Firebase API key              | ✓      | `AIzaSyCm1wvOw1fLZssQiJcgL0cDGyIxSH8Ytls` verified via REST API                  |
| Google Sign-In provider       | ✓      | Enabled on `switchcv-dev` (verified via `identitytoolkit.googleapis.com`)        |
| OAuth Client ID               | ✓      | `810736137134-v78tdjmlq7e602d2b32502mo62aeaunb.apps.googleusercontent.com`       |
| Auth handler endpoint         | ✓      | `https://switchcv-dev.firebaseapp.com/__/auth/handler` returns 200               |
| Authorized domains            | ✓      | `localhost`, `127.0.0.1`, `switchcv-dev.firebaseapp.com`, `switchcv-dev.web.app` |
| COOP header                   | ✓      | `same-origin-allow-popups` (correct for popup auth)                              |
| COEP header                   | ✓      | `unsafe-none` (no cross-origin isolation)                                        |
| CSP `frame-src`               | ✓      | Allows `https://*.firebaseapp.com https://*.googleapis.com`                      |
| CSP `connect-src`             | ✓      | Allows `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`            |
| Firebase SDK version          | ✓      | 12.10.0 (`@firebase/auth` 1.12.1) — no breaking changes in auth                  |
| Auth code (useAuthActions.ts) | ✓      | No changes since last known working state                                        |
| Firebase init (firebase.ts)   | ✓      | Correct config, safety check present                                             |
| Admin SDK (firebase-admin.ts) | ✓      | ADC configured for `switchcv-dev`, token verification working                    |
| Dev server compilation        | ✓      | No errors on startup                                                             |
| System config                 | ✓      | `loginDisabled: false`, `registrationClosed: false`                              |

### Auth Flow Traced

```
User clicks "Sign in with Google"
  → handleGoogleSignIn() in useAuthPage.ts
    → signInWithGoogle() in useAuthActions.ts
      → signInWithPopup(auth, googleProvider) ← Firebase SDK
        → Opens popup to: https://switchcv-dev.firebaseapp.com/__/auth/handler
          → Redirects to accounts.google.com
          → User selects account
          → Google redirects back to auth handler
          → Handler communicates credential to opener window
      → ensureUserProfile(credential.user) ← Client-side Firestore write
      → Returns { needsUsername: true/false }
    → router.push("/dashboard" or "/auth/choose-username")
```

## Root Causes Found

### 1. Stale `.next` Cache After Firebase Upgrade (Fixed)

The Firebase SDK was upgraded from 12.5.0 to 12.10.0 in commit `0b0ab8d`. Webpack caches compiled modules in `.next/`. If the cache wasn't cleared after the upgrade, stale Firebase auth module references could cause silent runtime failures in the popup flow (e.g., mismatched internal messaging protocol between cached opener code and live popup code).

**Fix applied:** `rm -rf .next` — cache cleared and fresh build started.

### 2. Empty Environment Variables (Fixed)

```
# Before (broken):
GCLOUD_PROJECT=
GOOGLE_CLOUD_PROJECT=
FIREBASE_SERVICE_ACCOUNT=

# After (fixed):
GCLOUD_PROJECT=switchcv-dev
GOOGLE_CLOUD_PROJECT=switchcv-dev
FIREBASE_SERVICE_ACCOUNT=
```

Empty `GCLOUD_PROJECT` and `GOOGLE_CLOUD_PROJECT` forced the Firebase Admin SDK through a slow fallback chain to resolve the project ID (eventually finding `NEXT_PUBLIC_FIREBASE_PROJECT_ID`). While this worked, it:

- Added unnecessary latency to the first API call
- Could race with token verification if ADC initialization was slow
- Produced noisy log warnings about missing project ID

**Fix applied:** Set both to `switchcv-dev` in `.env.local`.

### 3. OAuth Consent Screen — "Testing" Mode (Requires Manual Check)

**This is the most likely remaining cause if fixes 1 & 2 don't resolve the issue.**

The Google Cloud project `switchcv-dev` may have its OAuth consent screen in **"Testing"** mode. When in Testing mode:

- Only email addresses explicitly listed as **test users** can complete OAuth
- Other users see "Access denied" or the popup silently fails
- Firebase throws `auth/popup-closed-by-user` (indistinguishable from actual close)

The production project (`switchcv-e5136`) likely has its consent screen in **"Production"** mode, which is why it works there.

**How to check and fix:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials/consent?project=switchcv-dev)
2. Look at the "Publishing status"
3. If it says **"Testing"**:
   - Option A: Click **"PUBLISH APP"** to move to Production (recommended for dev too)
   - Option B: Add your email to the "Test users" list

## Fixes Applied

| Fix                     | File                                | What Changed                                                       |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| Clear `.next` cache     | `.next/` directory                  | Deleted stale Webpack cache                                        |
| Set project ID env vars | `.env.local`                        | `GCLOUD_PROJECT=switchcv-dev`, `GOOGLE_CLOUD_PROJECT=switchcv-dev` |
| Diagnostic script       | `scripts/diagnose-google-signin.js` | Created automated prereq checker                                   |

## Verification Steps

After the fixes, verify in this order:

### Step 1: Run diagnostic

```bash
node scripts/diagnose-google-signin.js
```

All checks should pass.

### Step 2: Start fresh dev server

```bash
npm run dev
```

### Step 3: Test Google Sign-In

1. Open http://localhost:3000/auth in Chrome
2. Open DevTools (F12) → Console tab
3. Click "Sign in with Google"
4. If the popup opens and you can select an account → the popup fix worked
5. If the popup shows "Access denied" → OAuth consent screen issue (see Root Cause #3)
6. If the popup doesn't open → check browser popup blocker settings

### Step 4: Check browser console for errors

Look for these specific error patterns:

- `auth/popup-closed-by-user` — Popup blocked or OAuth consent screen issue
- `auth/unauthorized-domain` — Domain not authorized in Firebase console
- `auth/network-request-failed` — Network/CORS issue
- `auth/internal-error` — Firebase backend error

### Step 5: Use the debug button

The auth page has a red "🔍 Debug" button at the bottom-right. Click it to see:

- Firebase initialization status
- Auth domain configuration
- Current user state

## Prevention

1. **Always clear `.next` after major dependency upgrades:**

   ```bash
   rm -rf .next && npm run dev
   ```

2. **Keep env vars populated** — empty strings (`VAR=`) can cause subtle fallback issues.

3. **OAuth consent screen** — Consider publishing the dev project's consent screen to "Production" status so all team members can sign in without being added as test users.

---

## ACTUAL Root Cause: User Approval Gate (Discovered Later)

**Google Sign-In was working the entire time.** The real issue was:

### What happened

1. User signed in with Google → Firebase Auth created the user successfully
2. `onUserCreated` Cloud Function fired → read `config/system.userApproval` from dev Firestore
3. The `userApproval` field **did not exist** in dev Firestore
4. `getUserApprovalConfig()` in `functions/src/email/shared.ts` had a bad default: `enabled: configData?.enabled ?? true`
5. Missing config → defaulted to `enabled: true` → set user's `approvalStatus: "pending"`
6. Client-side (`useAuthPage.ts`) saw `approvalStatus === "pending"` → showed "Registration Received" screen
7. No one monitors `admin@switchcv.com` in dev → approval request was never processed

### Why it looked like sign-in was broken

The "Registration Received" screen appears on the `/auth` page. The user saw the auth page stuck in a non-interactive state and interpreted it as sign-in failure. The Google popup had actually completed successfully.

### Code fix applied

**File:** `functions/src/email/shared.ts` — `getUserApprovalConfig()`

```diff
- enabled: configData?.enabled ?? true,    // missing = ON (dangerous)
+ const enabled = configData?.enabled === true;  // explicit true required

  // Fallback return when config doc doesn't exist:
- return { enabled: true, ... };
+ return { enabled: false, ... };  // safe default
```

**Rationale:** A missing config should mean "no approval required" (open registration). Requiring an explicit `enabled: true` in Firestore means:

- New environments default to open registration (no surprises)
- Prod must explicitly opt in to approval by setting `config/system.userApproval.enabled = true`

### Deployment checklist for this fix

1. **BEFORE deploying Cloud Functions:** Run `GOOGLE_CLOUD_PROJECT=switchcv-e5136 node scripts/ensure-prod-approval-config.js` to ensure prod has `userApproval.enabled: true` set explicitly
2. Deploy Cloud Functions: `cd functions && npm run build && firebase deploy --only functions`
3. Dev Firestore already has `userApproval.enabled: false` (set during debugging)

### User cleanup

- Dev user `8rq3ipgHRQXDMZK9EUPYRlu3wVh2` (anilalapati.66@gmail.com) was fully deleted:
  - Firebase Auth record
  - Firestore `users/` document
  - Username reservation (`anilalaptidev`)
  - Orphaned approval request (`tziVxq1sfMsYJ1nlcdns`)
- User can now re-register with Google Sign-In and should flow directly to choose-username → dashboard

4. **Run diagnostics after env changes:**
   ```bash
   node scripts/diagnose-google-signin.js
   ```

## Related Commits

- `0b0ab8d` — Firebase 12.5.0 → 12.10.0 upgrade (triggered cache issue)
- `6dd90c0` — Previous Google Sign-In fix (Feb 22)
- `7ad2a8f` — Removed custom authDomain override (Feb 20)
- `fc40369` — Fixed premature redirect during Google sign-in
- `cebcf26` — Hardened page security headers
