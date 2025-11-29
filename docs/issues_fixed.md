# Issues Fixed - November 29, 2025

## Critical Auth Flow Bugs

### Issue 1: "Missing or insufficient permissions" During Signup

**Symptoms:**

- Users clicking "Create Account" would see "Missing or insufficient permissions" error after a few seconds
- The error appeared even though Firebase Auth user was created successfully
- The verification email was sent but the user profile in Firestore was not created

**Root Cause: Firebase Auth-to-Firestore Propagation Delay**

When a user is created with `createUserWithEmailAndPassword()`:

1. Firebase Auth creates the user and assigns a UID
2. The client gets the credential immediately
3. The code tries to write to Firestore (`usernames` and `users` collections)
4. **PROBLEM**: Firestore's security rules validate `request.auth.uid`, but there's a 0-2 second propagation delay before Firestore can recognize the just-created auth token

Even calling `getIdToken(true)` to refresh the token on the client doesn't guarantee that Firestore's backend has received and can validate the authentication.

**Fix Applied:**

Added **retry logic with exponential backoff** in `src/hooks/useAuth.helpers.ts`:

```typescript
// Retry logic with exponential backoff (3 attempts: 1s, 2s, 4s delays)
for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    // Write to Firestore...
    break; // Success
  } catch (error) {
    if (isPermissionError && attempt < maxRetries - 1) {
      const delayMs = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue; // Retry
    }
    throw error;
  }
}
```

**Files Modified:**

- `src/hooks/useAuth.helpers.ts` - Added retry logic to `reserveUsername()` function

---

### Issue 2: "Verification link expired" When Clicking Email Link

**Symptoms:**

- Users clicking the email verification link would see "Your request to verify your email has expired or the link has already been used"
- This happened even with freshly sent verification emails
- Users could not complete the email verification process

**Root Cause 1: Aggressive Rollback Deleted User Accounts**

The original code had this logic:

```typescript
// If ANY error occurred during signup (including Firestore permission error)
if (credential?.user) {
  await credential.user.delete(); // DELETE THE USER!
}
```

When the Firestore write failed due to the propagation delay (Issue 1), the code would **delete the just-created user**. Since verification emails are tied to specific user accounts, deleting the user immediately invalidated the verification link.

**Root Cause 2: Missing `applyActionCode` Handler**

The auth page was configured with `handleCodeInApp: true`, which means the app is responsible for processing the verification link. However, the `/auth` page had **no code to handle the `oobCode` parameter** and call `applyActionCode()` to actually verify the email.

**Fixes Applied:**

1. **Smart Rollback Logic** in `src/hooks/useAuth.tsx`:

   - Only delete user for non-permission errors
   - For permission errors (which might be transient), keep the user account so verification links remain valid

2. **Added Email Verification Handler** in `src/app/auth/page.tsx`:

   ```typescript
   // Handle email verification link (oobCode from Firebase)
   useEffect(() => {
     const mode = searchParams.get("mode");
     const oobCode = searchParams.get("oobCode");

     if ((mode === "verifyEmail" || mode === "verify-email") && oobCode) {
       await applyActionCode(auth, oobCode);
       await auth.currentUser?.reload();
       await auth.currentUser?.getIdToken(true);
       setVerificationSuccess(true);
     }
   }, [searchParams]);
   ```

3. **Added Visual Feedback**:
   - Processing spinner while verification is in progress
   - Success message when verification completes
   - Clear error messages for expired/invalid links

**Files Modified:**

- `src/hooks/useAuth.tsx` - Fixed rollback logic
- `src/app/auth/page.tsx` - Added `applyActionCode` handler and UI states

---

### Issue 3: Email Verification Notice Showing on Signup Page

**Symptom:**

- When navigating to `/auth`, the email verification notice was showing even before signing up
- This confused users who hadn't created an account yet

**Root Cause:**

- Browser auto-fill credentials would log in an existing user with unverified email
- The verification notice was shown regardless of whether user was on signup or signin page

**Fix Applied:**

- Added condition to only show verification notice when `!isSignUp`
- Notice now only appears on the sign-in page for users who need to verify

**Files Modified:**

- `src/app/auth/page.tsx` - Added `!isSignUp` condition to verification notice

---

### Issue 4: "I verified already" Button Not Working

**Symptom:**

- After verifying email by clicking the link, clicking "I verified already" button didn't update the UI
- User was stuck on the verification notice screen

**Root Cause:**

- `refreshUser()` called `auth.currentUser.reload()` but didn't force a token refresh
- The `emailVerified` claim is stored in the ID token, which needed to be refreshed

**Fix Applied:**

- Added `getIdToken(true)` after `reload()` in `refreshUser()`:

```typescript
const refreshUser = async () => {
  await auth.currentUser.reload();
  await auth.currentUser.getIdToken(true); // Force token refresh
  setUser({ ...auth.currentUser });
};
```

**Files Modified:**

- `src/hooks/useAuth.tsx` - Added token refresh to `refreshUser()`

---

## Summary of Changes

| File                                          | Changes                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/hooks/useAuth.helpers.ts`                | Added retry logic with exponential backoff for Firestore writes                  |
| `src/hooks/useAuth.tsx`                       | Fixed rollback logic, added token refresh to `refreshUser()`                     |
| `src/app/auth/page.tsx`                       | Added `applyActionCode` handler, verification UI states, fixed notice visibility |
| `src/__tests__/hooks/useAuth.helpers.tsx`     | Added `getIdToken` mock to test helpers                                          |
| `src/__tests__/hooks/useAuth.helpers.test.ts` | Added `getIdToken` mock to test user objects                                     |

## Testing Recommendations

1. **Test Signup Flow:**

   - Create new account with fresh email
   - Verify no permission errors appear
   - Check that verification email arrives

2. **Test Email Verification:**

   - Click verification link in email
   - Verify success message appears on auth page
   - Confirm redirect to dashboard works

3. **Test "I verified already" Button:**

   - Sign up with new email
   - Verify email via link (in another tab/browser)
   - Click "I verified already" on auth page
   - Verify it recognizes verification and redirects

4. **Test Edge Cases:**
   - Click old/expired verification links (should show clear error)
   - Navigate to `/auth` with auto-filled credentials
   - Test Google OAuth signup flow still works
