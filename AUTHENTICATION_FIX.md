# Authentication Login Issue - Resolution Guide

## Problem Summary

Users unable to login even after creating accounts. Root cause identified:

1. **Email Verification Required**: App requires email verification for password-based accounts
2. **All Test Accounts Unverified**: 18 accounts exported from Firebase Auth, all have `emailVerified: false`
3. **Email Delivery Not Working**: Verification emails not being sent/received

## Immediate Fix Applied

Added to `.env.local`:

```bash
NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true
```

This allows development/testing without email verification.

## How to Login Now

### Option 1: Restart Dev Server (Required)

```bash
# Kill any existing dev servers
lsof -ti:3000 | xargs kill -9

# Start fresh
npm run dev
```

### Option 2: Use Existing Accounts

You can now login with any of your existing accounts:

- anilalapati.66+jan01@gmail.com
- anilalapati.66+anil_jan01.2@gmail.com
- anilalapati.66+dev12@gmail.com
- (and 15 others)

### Option 3: Create New Account

New signups will work immediately without email verification.

## Long-Term Solutions

### For Production Deployment

**CRITICAL**: Remove `NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true` before deploying to production!

Choose one of these approaches:

### Solution A: Fix Email Delivery (Recommended)

1. **Verify SMTP Credentials**:

   ```bash
   cd functions
   node -e "
   const nodemailer = require('nodemailer');
   (async () => {
     const transporter = nodemailer.createTransporter({
       host: 'smtp.gmail.com',
       port: 587,
       secure: false,
       auth: {
         user: 'switchcvs@gmail.com',
         pass: process.env.SMTP_PASS
       }
     });
     try {
       await transporter.verify();
       console.log('✅ SMTP connection successful');
     } catch (err) {
       console.error('❌ SMTP failed:', err.message);
     }
   })();
   "
   ```

2. **Check Cloud Function Deployment**:

   ```bash
   firebase deploy --only functions:resendVerificationEmail,functions:onUserCreated
   ```

3. **Test Email Sending**:

   ```bash
   # Create test account and check logs
   firebase functions:log --only resendVerificationEmail,onUserCreated
   ```

4. **Gmail App Password**:
   - Ensure app password is still valid
   - Check if 2FA is enabled on switchcvs@gmail.com
   - Generate new app-specific password if needed

### Solution B: Manual Email Verification

Manually verify existing test accounts:

```bash
# Export users
firebase auth:export users.json --format=JSON --project switchcv-dev

# Use Firebase Console to manually verify emails:
# https://console.firebase.google.com/project/switchcv-dev/authentication/users
```

### Solution C: Use Social Auth (Google)

Google OAuth doesn't require email verification:

- Click "Continue with Google" on login page
- Automatically verified and ready to use

## Testing Verification

After applying the fix:

1. **Restart Dev Server**:

   ```bash
   npm run dev
   ```

2. **Test Login**:

   - Navigate to http://localhost:3000/auth
   - Use existing credentials
   - Should bypass verification and login successfully

3. **Verify Dashboard Access**:
   - After login, should redirect to `/dashboard`
   - No "Verify Email" banner should appear

## Related Files

- [src/hooks/useAuth.tsx](src/hooks/useAuth.tsx#L127-L133) - Email verification logic
- [src/app/auth/page.tsx](src/app/auth/page.tsx) - Auth page UI
- [functions/src/services/emailService.ts] - Email sending logic (if exists)
- [docs/EMAIL_TROUBLESHOOTING.md](docs/EMAIL_TROUBLESHOOTING.md) - Email configuration guide

## Security Notes

⚠️ **Development Only**:

- `NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true` should NEVER be in production
- Add to `.gitignore` or use separate `.env.development.local`
- Production must use proper email verification or OAuth

## Monitoring

Check these after deploying email fixes:

1. **Cloud Function Logs**:

   ```bash
   firebase functions:log --only onUserCreated
   ```

2. **Email Delivery**:

   - Check spam folder
   - Verify sender reputation for switchcvs@gmail.com
   - Test with different email providers (Gmail, Outlook, etc.)

3. **User Feedback**:
   - Monitor support requests about verification emails
   - Track verification completion rates in analytics

## Next Steps

- [ ] Restart development server
- [ ] Test login with existing account
- [ ] Fix email delivery for production (see Solution A)
- [ ] Remove skip flag before production deployment
- [ ] Document email verification process for users
