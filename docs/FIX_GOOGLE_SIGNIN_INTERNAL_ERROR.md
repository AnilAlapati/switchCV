# Fix: Google Sign-In Internal Error

## Error

```
Firebase: Error (auth/internal-error)
```

## Root Cause

The Google OAuth provider is **enabled** in Firebase Console, but the **OAuth client configuration is incomplete or missing**.

---

## Solution: Configure OAuth Client ID

### Step 1: Go to Firebase Console

1. Open: https://console.firebase.google.com/
2. Select project: **switchcv-dev**
3. Navigate to: **Authentication** → **Sign-in method**
4. Find **Google** provider (should show as "Enabled")

### Step 2: Edit Google Provider Settings

1. **Click on the Google row** to edit
2. You should see a section called **Web SDK configuration**
3. Look for:
   - **Web client ID**
   - **Web client secret**

### Step 3: Check if OAuth Client Exists

There are two scenarios:

#### Scenario A: OAuth Client Already Exists

- If you see a **Web client ID** filled in → Continue to Step 4
- If fields are empty → Continue to Scenario B

#### Scenario B: Create New OAuth Client (MOST LIKELY YOUR ISSUE)

1. In the Google provider edit dialog, you'll see a link or button that says:

   - **"Create OAuth client ID in Google Cloud Console"** or
   - **"Configure OAuth consent screen"**

2. **Click that link** - it will open Google Cloud Console

3. In Google Cloud Console:

   **A. Configure OAuth Consent Screen:**

   - Navigate to: **APIs & Services** → **OAuth consent screen**
   - Click **Edit App** (or Create if new)
   - Fill in:
     - **App name**: `SwitchCV` (or your app name)
     - **User support email**: Your email
     - **Developer contact email**: Your email
   - Under **Authorized domains**, add:
     - `switchcv-dev.firebaseapp.com`
     - `switchcv-dev.web.app`
   - Click **Save and Continue**
   - Skip the Scopes section (click Save and Continue)
   - Add yourself as a test user if in Testing mode
   - Click **Save and Continue**

   **B. Create OAuth 2.0 Client ID:**

   - Navigate to: **APIs & Services** → **Credentials**
   - Click **+ Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `SwitchCV Web Client` (or any name)
   - Under **Authorized JavaScript origins**, add:
     ```
     http://localhost:3000
     https://switchcv-dev.firebaseapp.com
     https://switchcv-dev.web.app
     ```
   - Under **Authorized redirect URIs**, add:
     ```
     http://localhost:3000/__/auth/handler
     https://switchcv-dev.firebaseapp.com/__/auth/handler
     https://switchcv-dev.web.app/__/auth/handler
     ```
   - Click **Create**
   - You'll see a dialog with **Client ID** and **Client Secret**
   - **Copy both values**

4. **Go back to Firebase Console**:
   - Paste the **Client ID** into the **Web client ID** field
   - Paste the **Client Secret** into the **Web client secret** field
   - Click **Save**

---

## Step 4: Verify API is Enabled

While in Google Cloud Console:

1. Navigate to: **APIs & Services** → **Library**
2. Search for: **"Identity Toolkit API"**
3. Make sure it's **ENABLED** (should be already if you're using Firebase Auth)

---

## Step 5: Test the Fix

1. **Wait 1-2 minutes** for changes to propagate
2. **Clear browser cache**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Go to: http://localhost:3000/auth
4. Click the **Debug button** (🔍) in bottom-right
5. Click **"🧪 Test Google Sign-In"**
6. Should now work! ✅

---

## Alternative: Use Firebase's Auto-Generated OAuth Client

If you want Firebase to auto-generate the OAuth client:

1. In Firebase Console → Authentication → Sign-in method
2. **Disable** the Google provider
3. **Enable** it again
4. Firebase will automatically:
   - Create an OAuth client in Google Cloud
   - Configure redirect URIs
   - Link everything together

**However**, you'll still need to:

- Configure the OAuth consent screen (name, support email, etc.)
- Add authorized domains
- Add yourself as a test user if in Testing mode

---

## Common Issues

### Issue: "OAuth client ID is invalid"

**Solution**: Make sure the Client ID in Firebase matches exactly with Google Cloud Console

### Issue: "Redirect URI mismatch"

**Solution**: Add all redirect URIs in Google Cloud Console:

- `http://localhost:3000/__/auth/handler`
- `https://switchcv-dev.firebaseapp.com/__/auth/handler`
- `https://switchcv-dev.web.app/__/auth/handler`

### Issue: Still getting internal-error

**Solution**:

1. Check browser console for more details
2. Make sure OAuth consent screen is fully configured
3. Wait 5 minutes for DNS/cache propagation
4. Try in incognito mode

---

## Quick Checklist

- [ ] OAuth consent screen configured in Google Cloud Console
- [ ] OAuth client ID created in Google Cloud Console
- [ ] Authorized JavaScript origins include localhost and Firebase domains
- [ ] Authorized redirect URIs include `/__/auth/handler` paths
- [ ] Web client ID and secret copied to Firebase Console
- [ ] Google provider saved in Firebase Console
- [ ] Identity Toolkit API enabled in Google Cloud
- [ ] Waited 1-2 minutes for propagation
- [ ] Cleared browser cache
- [ ] Tested with debug tool

---

## What This Error Means

`auth/internal-error` happens when:

1. ✅ Google provider is enabled in Firebase
2. ❌ But Firebase can't complete the OAuth flow because:
   - No OAuth client ID configured, OR
   - OAuth client ID is invalid/expired, OR
   - Redirect URIs don't match, OR
   - OAuth consent screen incomplete

This is why it's an "internal" error - the Firebase SDK itself is fine, but the backend Google OAuth configuration is broken.

---

**You're connecting to the right project (`switchcv-dev`), and Google provider is enabled. You just need to complete the OAuth client configuration in Google Cloud Console.**
