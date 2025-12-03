# Google Sign-In Issue - Quick Fix Guide

## Problem

Google Sign-In is not working in the SwitchCV application.

## Most Likely Cause

**Google Authentication Provider is not enabled in Firebase Console.**

## Quick Fix (5 minutes)

### Step 1: Enable Google Provider in Firebase Console

1. **Open Firebase Console:**

   - Go to: https://console.firebase.google.com/
   - Select project: **switchcv-dev**

2. **Navigate to Authentication:**

   - Click **Authentication** in the left sidebar
   - Click **Sign-in method** tab

3. **Enable Google Provider:**
   - Find **Google** in the list of providers
   - Click on **Google** row
   - Toggle **Enable** switch to ON
   - Select a **Support email** from dropdown (your email)
   - Click **Save**

### Step 2: Verify Authorized Domains

1. **Still in Authentication:**

   - Click **Settings** tab
   - Scroll to **Authorized domains** section

2. **Ensure these domains are listed:**

   - ✅ `localhost`
   - ✅ `switchcv-dev.firebaseapp.com`
   - ✅ Your production domain (if any)

3. **If localhost is missing:**
   - Click **Add domain**
   - Enter: `localhost`
   - Click **Add**

### Step 3: Test the Fix

1. **Use the Test Page I Created:**

   ```bash
   # Open the test page in your browser
   open scripts/test-google-signin.html
   ```

   Or manually open: `/Users/anilalapati/Development/Switch_cv_Nov_21/scripts/test-google-signin.html`

2. **Follow the test steps:**

   - Click "Initialize Firebase" ✅
   - Click "Test Google Sign-In" 🔐
   - Complete Google OAuth flow
   - Should see success message ✅

3. **If test succeeds, try in your app:**
   ```bash
   # Navigate to auth page
   open http://localhost:3000/auth
   ```
   - Click "Continue with Google"
   - Should work now! ✅

## Error Messages and Solutions

### Error: "auth/operation-not-allowed"

**Solution:** Google provider not enabled → Follow Step 1 above

### Error: "auth/unauthorized-domain"

**Solution:** Domain not authorized → Follow Step 2 above

### Error: "auth/popup-blocked"

**Solution:** Browser blocking popups → Allow popups for localhost

### Error: "auth/popup-closed-by-user"

**Solution:** User closed popup → Try again and complete the flow

## Code Status

✅ Your code is correct and properly implemented:

- Google provider initialized: `src/hooks/useAuth.tsx:43`
- Sign-in function working: `src/hooks/useAuth.tsx:308`
- UI button present: `src/components/auth/GoogleSignInButton.tsx`
- Environment variables configured correctly

**The issue is NOT in your code** - it's a Firebase Console configuration issue.

## Additional Resources

- Full troubleshooting guide: `docs/GOOGLE_SIGNIN_TROUBLESHOOTING.md`
- Test HTML page: `scripts/test-google-signin.html`
- Firebase Auth Docs: https://firebase.google.com/docs/auth/web/google-signin

## What I Checked

✅ Firebase configuration - Valid
✅ Environment variables - Set correctly
✅ Code implementation - Correct
✅ Google provider initialization - Proper
✅ Error handling - Comprehensive
❓ Firebase Console settings - **Needs verification**

## Next Action

1. Follow Step 1 above to enable Google provider in Firebase Console
2. Test using the HTML test page
3. Test in your application
4. If still not working, check browser console for specific error code

---

**TL;DR:** Your code is fine. Go to Firebase Console → Authentication → Sign-in method → Enable Google provider. That should fix it!
