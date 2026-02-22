# Google Sign-In Production Bug — Full Investigation & Fix Log

**Period:** 19–21 February 2026  
**Status:** ✅ Resolved  
**Affected environment:** Production only (`switchcv.com`)  
**Dev was fine throughout:** Dev correctly redirected to `switchcv-dev.firebaseapp.com` auth handler

---

## Timeline of Symptoms

| Date                   | Error                              | User Impact                                                                                                       |
| ---------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| ~Feb 19                | `auth/unauthorized-domain`         | Google sign-in popup redirected to `switchcv-dev.firebaseapp.com` instead of prod auth handler — blocked entirely |
| Feb 21 (first deploy)  | `Error 400: redirect_uri_mismatch` | Popup opened with correct **prod** project but OAuth rejected the callback                                        |
| Feb 21 (second deploy) | `auth/popup-closed-by-user`        | Popup opened and showed Google account picker correctly — minor UX issue                                          |

---

## Bug 1: Wrong Firebase Project in Production

### Symptom

Production (`switchcv.com`) was using the **dev** Firebase project (`switchcv-dev`).  
The Google Sign-In popup redirected to `switchcv-dev.firebaseapp.com/__/auth/handler` with the dev API key (`AIzaSyCm1wvOw1fLZssQiJcgL0cDGyIxSH8Ytls`).

Error in browser console:

```
code: "auth/unauthorized-domain"
message: "Firebase: Error (auth/unauthorized-domain)."
source: "useAuth.googleSignIn"
```

### Root Cause

1. This project uses **Firebase Framework-Aware Hosting** (`firebase.json` → `"source": "."` + `frameworksBackend`).
2. When `firebase deploy --only hosting` runs, Firebase CLI **rebuilds Next.js itself**.
3. `scripts/deploy.sh` moved `.env.local` (dev config) out of the way for a **pre-check build**, then **restored it before the Firebase hosting deploy**.
4. When Firebase CLI rebuilt Next.js, `.env.local` was present — and per [Next.js env precedence](https://nextjs.org/docs/basic-features/environment-variables#default-environment-variables), `.env.local` overrides `.env.production`.
5. Result: prod bundle contained dev Firebase credentials (`switchcv-dev` project ID, dev API key).

### Fix

**File:** `scripts/deploy.sh`

```bash
# BEFORE (broken):
# .env.local restored BEFORE firebase deploy --only hosting
# → Firebase's internal Next.js build used dev config

# AFTER (fixed):
# For prod deployments, .env.local is hidden during the hosting deploy step
if [ "$TARGET_ENV" == "prod" ] && [ -f .env.local ]; then
  mv .env.local .env.local.deploy_backup
fi

firebase deploy --only hosting $FLAG

# Restore immediately after
if [ -f .env.local.deploy_backup ]; then
  mv .env.local.deploy_backup .env.local
fi
```

A **double-check guard** was also added: if `.env.local` still exists after the move attempt, the deploy aborts rather than silently shipping dev config.

### Permanent Safety Net

**File:** `src/lib/firebase.ts`

A build-time check was added that throws a fatal error if `NODE_ENV=production` but `projectId === "switchcv-dev"`:

```typescript
if (
  process.env.NODE_ENV === "production" &&
  firebaseConfig.projectId === "switchcv-dev"
) {
  throw new Error(
    "FATAL: Production build is using DEV Firebase config (switchcv-dev). " +
      "Ensure .env.local is removed before running `firebase deploy --only hosting` for prod.",
  );
}
```

This makes the failure **loud and immediate** at build time instead of silently shipping wrong config.

---

## Bug 2: `redirect_uri_mismatch` (Error 400 from Google OAuth)

### Symptom

After Bug 1 was fixed, Google Sign-In showed the correct prod sign-in popup but then displayed:

```
Access blocked: This app's request is invalid
Error 400: redirect_uri_mismatch
```

### Root Cause

`.env.production` had `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=switchcv.com` (custom domain).

Firebase uses `authDomain` to construct the OAuth **redirect URI**:  
`https://<authDomain>/__/auth/handler`

So Firebase was sending `https://switchcv.com/__/auth/handler` as the redirect URI to Google OAuth. But Google Cloud Console OAuth credentials for the `switchcv-e5136` project only had `https://switchcv-e5136.firebaseapp.com/__/auth/handler` registered — not the custom domain.

### Fix

**File:** `.env.production`

```diff
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=switchcv.com
+ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=switchcv-e5136.firebaseapp.com
```

Firebase **automatically registers** `<project-id>.firebaseapp.com` as an authorized OAuth redirect URI, so no Google Cloud Console changes are needed.

> **Note:** If you want to use `switchcv.com` as the `authDomain` (branded popup URL) in the future, you must:
>
> 1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials?project=switchcv-e5136) → edit the Web Client OAuth 2.0 credential
> 2. Add `https://switchcv.com/__/auth/handler` to **Authorized redirect URIs**
> 3. Add `https://switchcv.com` to **Authorized JavaScript origins**
> 4. Then change `authDomain` back to `switchcv.com` in `.env.production` and redeploy

---

## Bug 3: `auth/popup-closed-by-user` Shown as an Error

### Symptom

After Bugs 1 & 2 were fixed, clicking the Google Sign-In button, getting the popup, and then closing it (or occasionally on popup-close after successful auth on some browsers) showed a red error message to the user:

```
Google sign-in was closed before completion.
```

### Root Cause

`useAuthPage.ts` → `handleGoogleSignIn` was catching ALL errors from `signInWithGoogle()` and displaying them as UI errors via `setError()`. But `auth/popup-closed-by-user` is a **user-initiated action** (closing the popup), not an application error. Showing it as a red error message is misleading and creates unnecessary friction.

Additionally, `useAuth.tsx` was calling `reportError()` for `popup-closed-by-user`, which is noise in error monitoring.

### Fix

**File:** `src/hooks/useAuthPage.ts` — silently ignore `popup-closed-by-user`:

```typescript
const handleGoogleSignIn = useCallback(async () => {
  setError("");
  setLoading(true);
  try {
    const result = await signInWithGoogle();
    router.push(result.needsUsername ? "/auth/choose-username" : "/dashboard");
  } catch (err) {
    // Don't show "popup closed" as an error — it's user-initiated
    if (
      err instanceof Error &&
      err.message.includes("closed before completion")
    ) {
      return; // Silent - user closed the popup themselves
    }
    setError(
      err instanceof Error ? err.message : "Failed to sign in with Google",
    );
  } finally {
    setLoading(false);
  }
}, [signInWithGoogle, router]);
```

**File:** `src/hooks/useAuth.tsx` — skip `reportError` for popup-closed:

```typescript
} catch (error) {
  const authError = error as { code?: string; message?: string };
  // Don't report popup-closed — it's user-initiated, not an app error
  if (authError.code !== "auth/popup-closed-by-user") {
    reportError(error, {
      source: "useAuth.googleSignIn",
      severity: "warning",
      meta: { code: authError.code },
    });
  }
  throw new Error(getGoogleSignInErrorMessage(authError));
}
```

---

## How Google Sign-In Works (Sign-In AND Sign-Up — No Separate Step)

Google Sign-In on SwitchCV is a **combined sign-in and sign-up flow**:

- **Existing user** → authenticated immediately → redirected to `/dashboard`
- **New user** → account created automatically in Firebase Auth → profile created in Firestore → redirected to `/auth/choose-username` (one-time username selection) → then `/dashboard`

There is **no separate sign-up step** required for Google users. The Google button appears on the auth page in both sign-in and sign-up modes and handles both cases via `ensureUserProfile()` in `useAuth.tsx`.

---

## Commits

| Commit    | Description                                                                                |
| --------- | ------------------------------------------------------------------------------------------ |
| `49e0971` | `fix(deploy): hide .env.local during prod hosting deploy; add firebase build safety check` |
| `547ff45` | `fix(firebase): use logger.error in build safety check to avoid no-console`                |
| `6ba8d79` | `chore(release): commit version bump artifacts`                                            |
| `31be10f` | `fix(auth): use firebaseapp.com authDomain for prod to fix redirect_uri_mismatch`          |
| `eb8900a` | `style: format logger.error call in firebase build safety check`                           |
| `6fb9289` | `fix(auth): silent popup-closed-by-user; skip reportError for user-initiated close`        |

---

## Key Config Reference

| Setting                            | Dev (`.env.local`)                        | Prod (`.env.production`)                  |
| ---------------------------------- | ----------------------------------------- | ----------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  | `switchcv-dev`                            | `switchcv-e5136`                          |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `switchcv-dev.firebaseapp.com`            | `switchcv-e5136.firebaseapp.com`          |
| `NEXT_PUBLIC_FIREBASE_API_KEY`     | `AIzaSyCm1wvOw1fLZssQiJcgL0cDGyIxSH8Ytls` | `AIzaSyCTHP5C_Mg3kv0E1WGAxNmCAN0Mxb8zbZc` |

---

## Prevention

- `scripts/deploy.sh` now guards `.env.local` removal for ALL prod hosting deploys
- `src/lib/firebase.ts` safety check → build fails loudly if dev config leaks into prod
- `auth/popup-closed-by-user` is silenced in both error monitoring and UI display
