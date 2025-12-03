# Google Sign-In Troubleshooting Guide

## Issue: Google Sign-In Not Working

If Google Sign-In is not working in your application, follow these steps to diagnose and fix the issue.

---

## Quick Diagnosis Checklist

### ✅ Step 1: Verify Firebase Console Configuration

1. **Go to Firebase Console**

   - URL: https://console.firebase.google.com/
   - Select project: `switchcv-dev` (or your current project)

2. **Enable Google Authentication**

   - Navigate to: **Authentication** → **Sign-in method**
   - Find **Google** in the list of providers
   - Click on **Google**
   - Enable the toggle switch
   - Select a support email (required)
   - Click **Save**

3. **Verify Authorized Domains**
   - Navigate to: **Authentication** → **Settings** → **Authorized domains**
   - Ensure these domains are added:
     - ✅ `localhost`
     - ✅ Your production domain (if deploying)
   - If missing, click **Add domain** and add them

---

### ✅ Step 2: Check Environment Variables

Verify your `.env.local` file contains:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**How to verify:**

```bash
cat .env.local | grep FIREBASE
```

---

### ✅ Step 3: Check Browser Console for Errors

1. **Open the Application**

   ```bash
   npm run dev
   ```

   Navigate to: http://localhost:3000/auth

2. **Open Developer Tools**

   - Press `F12` or `Cmd+Option+I` (Mac)
   - Click on the **Console** tab

3. **Click "Continue with Google"**

4. **Look for Error Messages**

   Common errors and solutions:

   #### Error: "popup-closed-by-user"

   - **Cause**: User closed the popup before completing sign-in
   - **Solution**: Try again and complete the sign-in flow

   #### Error: "auth/unauthorized-domain"

   - **Cause**: Domain not authorized in Firebase Console
   - **Solution**: Add `localhost` to authorized domains (Step 1.3 above)

   #### Error: "auth/popup-blocked"

   - **Cause**: Browser is blocking popups
   - **Solution**: Allow popups for localhost in browser settings

   #### Error: "Configuration object is invalid"

   - **Cause**: Missing or incorrect Firebase configuration
   - **Solution**: Check environment variables (Step 2 above)

   #### Error: "API key not valid"

   - **Cause**: API key restrictions in Google Cloud Console
   - **Solution**: Check API key restrictions (see Step 4 below)

---

### ✅ Step 4: Check Google Cloud Console (Advanced)

If you're still having issues, check API key restrictions:

1. **Go to Google Cloud Console**

   - URL: https://console.cloud.google.com/
   - Select your Firebase project

2. **Navigate to APIs & Services → Credentials**

3. **Find your Browser API Key**

   - Click on the key used in `NEXT_PUBLIC_FIREBASE_API_KEY`

4. **Check Key Restrictions**
   - **Application restrictions**: Should be "None" or "HTTP referrers" with localhost added
   - **API restrictions**: Should be "Don't restrict key" or include:
     - ✅ Identity Toolkit API
     - ✅ Token Service API
     - ✅ Cloud Firestore API

---

## Testing the Fix

After making changes:

1. **Restart your development server:**

   ```bash
   # Kill existing process
   lsof -ti:3000 | xargs kill -9

   # Start fresh
   npm run dev
   ```

2. **Clear browser cache:**

   - `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)

3. **Try Google Sign-In again:**
   - Go to http://localhost:3000/auth
   - Click "Continue with Google"
   - Complete the OAuth flow

---

## Current Implementation Details

### Code Location

- **Auth Hook**: `src/hooks/useAuth.tsx`
- **Auth Page**: `src/app/auth/page.tsx`
- **Google Button**: `src/components/auth/GoogleSignInButton.tsx`

### How It Works

```typescript
// useAuth.tsx - Line ~43
const googleProvider =
  typeof window !== "undefined" ? new GoogleAuthProvider() : null;

if (googleProvider) {
  googleProvider.setCustomParameters({ prompt: "select_account" });
}

// useAuth.tsx - signInWithGoogle function
const signInWithGoogle = async () => {
  if (!googleProvider) {
    throw new Error("Google Sign-In is not available in this environment.");
  }

  const credential = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(credential.user);
  // ... handle username selection if needed
};
```

---

## Common Scenarios

### Scenario 1: First Time Setup

**Symptoms:**

- Google button appears but nothing happens when clicked
- No popup appears

**Solution:**

1. Enable Google provider in Firebase Console (Step 1.2)
2. Add `localhost` to authorized domains (Step 1.3)
3. Restart dev server

### Scenario 2: Works in Production but Not Locally

**Symptoms:**

- Google sign-in works on deployed site
- Doesn't work on localhost

**Solution:**

1. Ensure `localhost` is in authorized domains
2. Check that `.env.local` has correct configuration
3. Disable API key restrictions in Google Cloud Console

### Scenario 3: Popup Closes Immediately

**Symptoms:**

- Popup opens briefly then closes
- Console shows "popup-closed-by-user" error

**Solution:**

1. Check for JavaScript errors in console
2. Ensure Firebase is properly initialized
3. Check network connectivity
4. Try incognito/private mode to rule out extensions

---

## Production Deployment Checklist

Before deploying to production:

1. ✅ Add production domain to Firebase authorized domains
2. ✅ Update OAuth consent screen in Google Cloud Console
3. ✅ Set up proper API key restrictions
4. ✅ Test Google sign-in on production domain
5. ✅ Monitor authentication errors in Firebase Console

---

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth/web/google-signin)
- [Troubleshoot Authentication](https://firebase.google.com/docs/auth/web/start#troubleshooting)
- [OAuth 2.0 Errors](https://developers.google.com/identity/protocols/oauth2/web-server#handlingresponse)

---

## Still Having Issues?

If you've followed all steps and Google Sign-In still doesn't work:

1. **Check Firebase project status:**

   - Ensure billing is enabled (required for some features)
   - Check for any service outages

2. **Verify network connectivity:**

   ```bash
   curl https://accounts.google.com
   curl https://your-project.firebaseapp.com
   ```

3. **Check browser compatibility:**

   - Test in different browsers (Chrome, Firefox, Safari)
   - Disable browser extensions temporarily

4. **Review Firebase Console logs:**

   - Navigate to: **Authentication** → **Users**
   - Check for any failed sign-in attempts

5. **Create a minimal test case:**

   ```typescript
   // Test in browser console
   import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
   import { auth } from "@/lib/firebase";

   const provider = new GoogleAuthProvider();
   signInWithPopup(auth, provider)
     .then((result) => console.log("Success:", result))
     .catch((error) => console.error("Error:", error));
   ```

---

**Last Updated:** December 2, 2025
