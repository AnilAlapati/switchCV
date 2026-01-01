# Email Verification Issue - Root Cause & Fix

## Problem Diagnosis

After reviewing the logs, I identified why email verification stopped working:

### What's Happening (Based on Logs)

1. **✅ Emails ARE being sent** - The Firebase extension `ext-firestore-send-email-processqueue` is successfully delivering welcome emails to users
2. **❌ Verification links are BROKEN** - The link in the email is static: `https://switchcv.com/auth?mode=verify-email` (missing the actual verification code)
3. **🔴 Root Cause**: Firebase API rate limiting

```
Error: TOO_MANY_ATTEMPTS_TRY_LATER
Code: auth/internal-error
```

Firebase's `generateEmailVerificationLink()` API hit rate limits due to multiple test signups.

### Why It Worked Before

- Firebase's daily/hourly quota for verification links wasn't exhausted
- You likely hadn't created 18 test accounts in a short timeframe
- Rate limits reset daily, so it was working intermittently

## Solutions Implemented

### 1. Immediate Fix (TEMPORARY)

Added to `.env.local`:

```bash
NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true
```

This allows development/testing to continue while we fix the underlying issue.

**⚠️ This MUST be removed before production deployment!**

### 2. Long-Term Fix (Cloud Functions)

I've updated `functions/src/emailFunctions.ts` to:

**A. Use Custom Tokens First** (not rate-limited):

- Generate UUID-based verification tokens
- Store in Firestore `verificationTokens` collection
- Use custom API endpoint `/api/auth/verify?token=xxx`
- 24-hour expiration window

**B. Firebase API as Fallback**:

- If custom token fails, try Firebase's built-in link
- Better error handling for rate limit errors
- Improved logging to track which method is used

**C. Better Error Logging**:

```typescript
console.log(
  `Welcome email sent to ${user.email} with verification method: ${verificationMethod}`
);
```

Track which verification method succeeded:

- `custom_token` - Our UUID-based system (preferred)
- `firebase_with_redirect` - Firebase's built-in link
- `static_fallback` - Generic link (user must manually click resend)

## Deployment Steps

### Step 1: Verify Custom Token Endpoint Works

The custom verification endpoint is already implemented at:
[src/app/api/auth/verify/route.ts](src/app/api/auth/verify/route.ts)

It handles:

- ✅ Token validation
- ✅ Expiration checking
- ✅ User email verification update
- ✅ Token marking as used
- ✅ Redirect to auth page with success message

### Step 2: Deploy Updated Functions

```bash
cd functions
npm run build
firebase deploy --only functions:onUserCreated --project switchcv-dev
```

### Step 3: Test the Flow

```bash
# 1. Remove skip verification flag
# Edit .env.local and remove or comment out:
# NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true

# 2. Restart dev server
npm run dev

# 3. Create new test account
# - Should receive email
# - Click verification link
# - Should redirect to /auth?verificationSuccess=true
# - Should be able to login

# 4. Check function logs
firebase functions:log --project switchcv-dev
# Look for: "Welcome email sent to ... with verification method: custom_token"
```

### Step 4: Monitor Firebase Quotas

Check Firebase quotas to prevent future rate limiting:
https://console.firebase.google.com/project/switchcv-dev/usage

Limits:

- **Email verification links**: 100/hour (shared across all Firebase Auth operations)
- **Custom tokens**: No Firebase-imposed limit (we control this)

## Why Custom Tokens Are Better

| Feature           | Firebase Built-in  | Custom Tokens         |
| ----------------- | ------------------ | --------------------- |
| **Rate Limits**   | ❌ 100/hour        | ✅ Unlimited          |
| **Customization** | ❌ Limited         | ✅ Full control       |
| **Expiration**    | 1 hour fixed       | ✅ Configurable (24h) |
| **Branding**      | ❌ Firebase domain | ✅ Your domain        |
| **Analytics**     | ❌ Limited         | ✅ Full tracking      |

## Testing Checklist

- [ ] Build functions: `cd functions && npm run build`
- [ ] Deploy to dev: `firebase deploy --only functions:onUserCreated --project switchcv-dev`
- [ ] Create test account with new email
- [ ] Check email received
- [ ] Click verification link
- [ ] Verify redirects to success page
- [ ] Confirm can login without barriers
- [ ] Check function logs show `custom_token` method
- [ ] Test with 5+ signups to verify no rate limiting

## Monitoring

After deployment, monitor these:

### 1. Function Logs

```bash
firebase functions:log --project switchcv-dev | grep "verification method"
```

Expected output:

```
Welcome email sent to user@example.com with verification method: custom_token
```

### 2. Firestore Collection

Check `verificationTokens` collection:

- Should have new documents for each signup
- `used: false` initially
- `used: true` after verification
- `expiresAt` 24 hours from creation

### 3. User Verification Status

```bash
firebase auth:export users.json --project switchcv-dev
cat users.json | jq '.users[] | select(.emailVerified == true) | .email'
```

Should show newly verified users.

## Rollback Plan

If custom tokens fail:

1. **Revert function changes**:

   ```bash
   git checkout HEAD~1 functions/src/emailFunctions.ts
   cd functions && npm run build
   firebase deploy --only functions:onUserCreated --project switchcv-dev
   ```

2. **Wait for Firebase quota reset** (next day at midnight PST)

3. **Use skip verification** temporarily in dev:
   ```bash
   NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true
   ```

## Production Deployment

Before deploying to production:

1. **Remove skip flag** from all environment variables
2. **Deploy functions** to production project:
   ```bash
   firebase deploy --only functions:onUserCreated --project switchcv-e5136
   ```
3. **Test thoroughly** with real email addresses
4. **Monitor logs** for first 24 hours
5. **Set up alerts** for verification failures

## Related Files

- [functions/src/emailFunctions.ts](functions/src/emailFunctions.ts#L55-L120) - Email verification logic
- [src/app/api/auth/verify/route.ts](src/app/api/auth/verify/route.ts) - Custom token verification
- [src/hooks/useAuth.tsx](src/hooks/useAuth.tsx#L127-L133) - Skip verification flag
- [extensions/firestore-send-email.env.switchcv-dev](extensions/firestore-send-email.env.switchcv-dev) - Email extension config

## Support

If issues persist:

1. **Check SMTP credentials** are valid
2. **Verify Firebase extension** is enabled and configured
3. **Check Gmail security** settings for switchcvs@gmail.com
4. **Review Firebase quotas** haven't been exceeded
5. **Test with different email providers** (Gmail, Outlook, etc.)
