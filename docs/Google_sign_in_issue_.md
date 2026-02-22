# Google Sign-In Issue — Full Post-Mortem

> **Timeline**: Feb 20–22, 2026  
> **Status**: ✅ Resolved  
> **Impact**: Google Sign-In/Sign-Up was completely non-functional on `switchcv.com`

---

## Symptom

Users clicking "Continue with Google" on `switchcv.com/auth` experienced:

- A Google popup would open, the user would select their account, but the parent page would **hang indefinitely** in a loading state.
- No visible error appeared on screen (the error was silently swallowed).
- Browser console showed no obvious error unless closely inspected.

---

## Root Causes (3 Layered Issues)

The outage was caused by **three independent but compounding issues** that had to be resolved in sequence. Fixing any one alone was insufficient.

### Issue 1: `auth/unauthorized-domain` Error

**When**: Feb 20  
**Symptom**: Google Sign-In failed with `auth/unauthorized-domain` in the browser console.  
**Root Cause**: The production domain `switchcv.com` was configured as `authDomain` in the Firebase SDK, but the `switchcv.com` domain was not added to **Firebase Console → Authentication → Settings → Authorized Domains**.  
**Fix**: Added `switchcv.com` to the Firebase Authorized Domains list.

**Files Changed**: None (Firebase Console config only)

---

### Issue 2: `redirect_uri_mismatch` and Cross-Origin Cookie Blocking

**When**: Feb 20–22  
**Symptom**: After fixing Issue 1, the popup would open but still fail silently. The error `auth/popup-closed-by-user` appeared even though the user did not close the popup.  
**Root Cause**: Modern browsers (Chrome 120+, Safari) block **third-party cookies**. When `authDomain` was set to `switchcv-e5136.firebaseapp.com` (the default Firebase domain), the popup opened on a different origin than the parent page (`switchcv.com`). The browser blocked the cross-origin `postMessage` communication needed to pass the OAuth token back.  
**Fix** (two parts):

1. **Code**: Changed `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` from `switchcv-e5136.firebaseapp.com` to `switchcv.com` in `.env.production`. This makes the popup same-origin.
2. **Google Cloud Console**: Added `https://switchcv.com/__/auth/handler` to the OAuth 2.0 Client's **Authorized redirect URIs** and `https://switchcv.com` to **Authorized JavaScript origins**.
3. **Next.js Rewrite**: Added a rewrite rule in `next.config.ts` to proxy `/__/auth/:path*` requests to the Firebase project domain (`switchcv-e5136.firebaseapp.com/__/auth/:path*`), since `switchcv.com` doesn't natively serve Firebase's auth handler.

**Files Changed**:
- `.env.production` — `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=switchcv.com`
- `next.config.ts` — Added `rewrites()` for `/__/auth/:path*`

---

### Issue 3: `Cross-Origin-Opener-Policy: same-origin` Severing Popup Connection

**When**: Feb 22  
**Symptom**: Even after fixing Issues 1 and 2, the popup STILL failed. The error message was now visible: "Sign-in popup closed prematurely or failed to communicate."  
**Root Cause**: The app's `next.config.ts` was sending strict security headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The `same-origin` COOP header tells the browser to **completely sever the `window.opener` connection** whenever a popup navigates to a different origin. Since the Google Sign-In popup redirects to `accounts.google.com`, the browser cut the link between `switchcv.com` and the popup. Firebase Auth relies on `window.opener` and `postMessage` to pass the credential back — without it, the sign-in silently fails.

**Additionally**, the `require-corp` COEP header was blocking external images (avatars, background textures) from loading.

**Fix**: Changed the security headers in `next.config.ts`:

```diff
- Cross-Origin-Opener-Policy: same-origin
+ Cross-Origin-Opener-Policy: same-origin-allow-popups

- Cross-Origin-Embedder-Policy: require-corp
+ Cross-Origin-Embedder-Policy: unsafe-none
```

`same-origin-allow-popups` explicitly allows the parent window to maintain a reference to popups that navigate cross-origin — exactly what OAuth flows need.

**Files Changed**:
- `next.config.ts` — Relaxed COOP and COEP headers
- `src/__tests__/security/headers.test.ts` — Updated expected header values

---

## Additional Improvements Made

### Silent Error Swallowing Fix
The `useAuthPage.ts` handler was catching the `auth/popup-closed-by-user` error and returning silently without showing anything to the user. This made the failure invisible. Updated to display a clear error message.

**File**: `src/hooks/useAuthPage.ts`

### Timeout Protection
Added a 15-second timeout wrapper around `ensureUserProfile()` Firestore calls to prevent indefinite hangs if Firestore becomes unresponsive.

**File**: `src/hooks/useAuth.helpers.ts`

### Background Texture COEP Error
Removed a `background-image: url(...)` CSS reference to an external texture that was being blocked by the strict COEP header and causing console errors.

**File**: `src/app/auth/page.tsx`

---

## Configuration Checklist

For Google Sign-In to work correctly, ALL of the following must be true:

### Firebase Console (`console.firebase.google.com`)
- [ ] `switchcv.com` is in **Authentication → Settings → Authorized Domains**
- [ ] Google sign-in provider is enabled in **Authentication → Sign-in method**

### Google Cloud Console (`console.cloud.google.com`)
- [ ] `https://switchcv.com/__/auth/handler` is in OAuth Client → **Authorized redirect URIs**
- [ ] `https://switchcv.com` is in OAuth Client → **Authorized JavaScript origins**
- [ ] `https://switchcv-e5136.firebaseapp.com/__/auth/handler` is also kept (original Firebase default)

### Code Configuration
- [ ] `.env.production`: `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=switchcv.com`
- [ ] `next.config.ts`: Rewrite rule for `/__/auth/:path*` → Firebase project domain
- [ ] `next.config.ts`: `Cross-Origin-Opener-Policy: same-origin-allow-popups` (NOT `same-origin`)
- [ ] `next.config.ts`: `Cross-Origin-Embedder-Policy: unsafe-none` (NOT `require-corp`)
- [ ] `useAuthPage.ts`: Errors from popup closure are surfaced to the UI, not silently swallowed

---

## Lessons Learned

1. **Security headers can break OAuth flows.** `Cross-Origin-Opener-Policy: same-origin` is the strictest COOP setting and will break any popup-based OAuth (Google, GitHub, Facebook, etc.). Always use `same-origin-allow-popups` when using `signInWithPopup`.

2. **Third-party cookies affect Firebase Auth.** When `authDomain` differs from the app domain, the popup is cross-origin and modern browsers block the token transfer. Always set `authDomain` to your custom domain.

3. **Never silently swallow auth errors.** The original code caught `auth/popup-closed-by-user` and returned without showing any error. This made debugging nearly impossible. Always surface errors to the user, even if they seem benign.

4. **Multiple root causes can stack.** This issue had three independent causes. Fixing only one or two still left the system broken, making it appear like the fixes "didn't work."

---

## Timeline

| Date | Action | Result |
|------|--------|--------|
| Feb 20 | Investigated `auth/unauthorized-domain` | Added domain to Firebase Console |
| Feb 20 | Attempted `authDomain: switchcv.com` | Got `redirect_uri_mismatch` — reverted |
| Feb 22 | Re-attempted with Google Cloud Console redirect URI config | Popup still failed silently |
| Feb 22 | Tried `signInWithRedirect` as alternative | `getRedirectResult` returned null |
| Feb 22 | Reverted to `signInWithPopup` + custom `authDomain` | Still broken — discovered COOP header issue |
| Feb 22 | Browser diagnostic identified COOP header | Found `same-origin` severing popup connection |
| Feb 22 | Changed COOP to `same-origin-allow-popups` | ✅ **Sign-in works!** |
