# Production Email Verification Setup

## Overview

This document outlines the steps required to deploy the custom email verification system to production (`switchcv-e5136`).

## Prerequisites

- ✅ Custom token verification system tested in dev
- ✅ Firestore security rules updated
- ✅ Cloud Functions updated with custom token logic

---

## Production Deployment Checklist

### 1. Update Environment Variables

#### Firebase Functions Environment (`functions/.env`)

Update the `WEBSITE_URL` to point to your production domain:

```bash
# Development
WEBSITE_URL=http://localhost:3000

# Production (update this)
WEBSITE_URL=https://switchcv.com  # or your actual production domain
```

**Important**: This determines where verification links point to!

#### Deploy Updated Functions Config

```bash
# Option A: Set via Firebase CLI (recommended for production)
firebase functions:config:set website.url="https://switchcv.com" --project switchcv-e5136

# Option B: Use .env file (if using dotenv in functions)
# Already set in functions/.env - just deploy
```

---

### 2. Firebase Admin SDK Authentication

You have **two options** for production authentication:

#### Option A: Service Account (Recommended for Production)

This is the **preferred method** for production deployments:

1. **Download Service Account Key**:

   ```bash
   # Go to Firebase Console → Project Settings → Service Accounts
   # Click "Generate New Private Key"
   # Save as: service-account-switchcv-e5136.json
   ```

2. **Set Environment Variable** (Vercel/Hosting Platform):

   ```bash
   # Base64 encode the service account file
   cat service-account-switchcv-e5136.json | base64 > service-account.b64

   # Set as environment variable in your hosting platform
   FIREBASE_SERVICE_ACCOUNT=<paste-base64-content>
   ```

3. **Code Already Supports This**:
   ```typescript
   // src/lib/firebase-admin.ts (already implemented)
   if (process.env.FIREBASE_SERVICE_ACCOUNT) {
     const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
     admin.initializeApp({
       credential: admin.credential.cert(serviceAccount),
       projectId,
     });
   }
   ```

**Advantages**:

- ✅ No quota project configuration needed
- ✅ More secure (scoped permissions)
- ✅ Works in any environment (Vercel, Cloud Run, etc.)
- ✅ No local credential files

#### Option B: Application Default Credentials (ADC)

If deploying to Google Cloud (Cloud Functions, Cloud Run):

```bash
# The deployment environment automatically has ADC
# No additional configuration needed - works out of the box
```

**Note**: If you see quota project errors in production, run:

```bash
gcloud auth application-default set-quota-project switchcv-e5136
```

---

### 3. Deploy Firestore Security Rules

```bash
# Deploy security rules to production
firebase deploy --only firestore:rules --project switchcv-e5136
```

**Verify rules include**:

```javascript
match /verificationTokens/{tokenId} {
  allow read, write: if false; // Only Admin SDK
}
```

---

### 4. Deploy Cloud Functions

```bash
# Build functions
cd functions
npm run build

# Deploy to production
firebase deploy --only functions --project switchcv-e5136
```

**Functions to verify**:

- ✅ `onUserCreated` - Generates custom tokens
- ✅ `resendVerificationEmail` - Resends verification (if implemented)

---

### 5. Deploy Frontend (Vercel/Next.js)

#### Set Production Environment Variables

```bash
# Vercel environment variables
NEXT_PUBLIC_FIREBASE_PROJECT_ID=switchcv-e5136
NEXT_PUBLIC_FIREBASE_API_KEY=<prod-api-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=switchcv-e5136.firebaseapp.com
NEXT_PUBLIC_BASE_URL=https://switchcv.com

# If using service account (recommended)
FIREBASE_SERVICE_ACCOUNT=<base64-encoded-service-account>

# If using ADC (Google Cloud deployments only)
GCLOUD_PROJECT=switchcv-e5136
```

#### Deploy

```bash
# Via Vercel CLI
vercel --prod

# Or via Git push (if connected to GitHub)
git push origin main
```

---

### 6. Test Production Verification Flow

#### Manual Test

1. **Sign up with a real email** (not +alias, use external email like Gmail)
2. **Check email inbox** for verification email
3. **Click verification link** → Should redirect to production domain
4. **Verify success message** appears on `/auth?verificationSuccess=true`
5. **Login with verified account** → Should work immediately

#### Automated Test Script

```bash
# Test production verification endpoint (after signup)
curl -v "https://switchcv.com/api/auth/verify?token=<test-token>"
```

**Expected Response**: 307 redirect to `/auth?verificationSuccess=true`

---

### 7. Monitor & Validate

#### Check Cloud Functions Logs

```bash
# View real-time logs
firebase functions:log --project switchcv-e5136

# Look for these log messages
# ✅ "Generated custom verification token for <email>"
# ✅ "Verification successful for user: <uid>"
# ❌ Any "Verification error" messages
```

#### Check Firestore

```bash
# Verify tokens are being created
firebase firestore:export gs://switchcv-e5136-backup/verification-check --project switchcv-e5136

# Or use Firebase Console → Firestore → verificationTokens collection
```

#### Monitor Error Tracking

- Check Sentry (if configured) for verification errors
- Monitor PostHog events for verification success/failure rates

---

## Common Production Issues

### Issue: Verification Link Points to Localhost

**Symptom**: Production emails have `http://localhost:3000/api/auth/verify` links

**Solution**:

1. Update `functions/.env`: `WEBSITE_URL=https://switchcv.com`
2. Or set: `firebase functions:config:set website.url="https://switchcv.com"`
3. Redeploy functions: `firebase deploy --only functions`

### Issue: "Quota Project Required" Error in Production

**Symptom**: Error when updating user's emailVerified status

**Solution A (Recommended)**: Use service account credentials

```bash
# Set FIREBASE_SERVICE_ACCOUNT environment variable
# See "Option A: Service Account" above
```

**Solution B**: Set quota project for ADC (Google Cloud deployments)

```bash
gcloud auth application-default set-quota-project switchcv-e5136
```

### Issue: Verification Token Not Found

**Symptom**: "Invalid or expired token" error

**Solution**:

1. Check Firestore rules are deployed
2. Verify Cloud Function is creating tokens (check logs)
3. Check token expiration (24 hours by default)
4. Ensure production Firestore has `verificationTokens` collection

---

## Rollback Plan

If verification breaks in production:

### Quick Fix: Enable Email Verification Skip

```bash
# Add to production environment variables
NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true
```

This allows users to login without email verification while you debug.

### Full Rollback

```bash
# Revert to previous Firebase Functions version
firebase functions:log --project switchcv-e5136  # Get version number
firebase rollback functions:onUserCreated@<version> --project switchcv-e5136
```

---

## Security Considerations

### Token Security

- ✅ Tokens are UUIDs (cryptographically random)
- ✅ 24-hour expiration enforced
- ✅ Single-use only (marked as `used: true` after verification)
- ✅ Firestore rules prevent client access
- ✅ HTTPS-only in production

### Email Security

- ✅ SPF/DKIM configured for switchcvs@gmail.com
- ✅ Rate limiting via Cloud Functions (future enhancement)
- ✅ Email templates sanitized (no user-generated content)

---

## Performance Monitoring

### Metrics to Track

- Verification email delivery time (should be < 30 seconds)
- Verification success rate (target: > 95%)
- Token validation latency (target: < 500ms)
- Firestore read/write costs for verificationTokens collection

### Expected Costs

- **Firestore**: ~2 writes + 1 read per verification = ~$0.0001 per user
- **Cloud Functions**: Minimal (already running onUserCreated trigger)
- **Email**: Covered by Gmail SMTP (free tier)

---

## Future Enhancements

### Optional Improvements

1. **Token Cleanup**: Scheduled function to delete expired tokens (> 24h old)
2. **Rate Limiting**: Prevent abuse (max 3 resends per email per hour)
3. **Email Delivery Tracking**: Track bounce/spam rates via SendGrid/Mailgun
4. **Magic Link Login**: Allow users to login via email link (no password)

### Implementation Priority

- **High**: Token cleanup (prevents Firestore bloat)
- **Medium**: Rate limiting (prevents abuse)
- **Low**: Delivery tracking (nice-to-have analytics)

---

## Support & Troubleshooting

### Debug Production Issues

1. Check Cloud Functions logs: `firebase functions:log --project switchcv-e5136`
2. Check Firestore data: Firebase Console → Firestore → verificationTokens
3. Test SMTP: Use test email script in EMAIL_TROUBLESHOOTING.md
4. Check environment variables: Verify WEBSITE_URL is set correctly

### Contact Information

- **Firebase Project**: switchcv-e5136
- **Email Service**: switchcvs@gmail.com
- **Primary Domain**: switchcv.com

---

## Deployment Timeline

### Pre-Deployment (1 hour)

- [ ] Update `functions/.env` with production WEBSITE_URL
- [ ] Test dev environment one final time
- [ ] Create service account key for production
- [ ] Set production environment variables

### Deployment (30 minutes)

- [ ] Deploy Firestore rules
- [ ] Deploy Cloud Functions
- [ ] Deploy frontend to Vercel/hosting
- [ ] Verify environment variables are set

### Post-Deployment (1 hour)

- [ ] Manual test with real email
- [ ] Monitor Cloud Functions logs
- [ ] Check Firestore for token creation
- [ ] Verify email delivery
- [ ] Test end-to-end flow (signup → verify → login)

### Monitoring (24 hours)

- [ ] Track verification success rate
- [ ] Monitor for quota/permission errors
- [ ] Check email delivery rates
- [ ] Review Sentry error reports

---

**Last Updated**: January 1, 2026  
**Status**: Ready for production deployment  
**Tested In**: switchcv-dev environment  
**Production Target**: switchcv-e5136
