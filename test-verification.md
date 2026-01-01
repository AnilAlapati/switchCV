# Test Email Verification

## Test Steps

1. **Uncomment the skip flag to test real verification**:
   - Open `.env.local`
   - Keep `NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true` commented out
   - Restart dev server: `npm run dev`

2. **Create a new test account**:
   - Go to http://localhost:3000/auth
   - Click "Sign Up"
   - Use: `anilalapati.66+test_$(date +%H%M%S)@gmail.com`
   - Password: `TestPassword123!`
   - Username: `testuser$(date +%s)`

3. **Check email**:
   - Open Gmail for anilalapati.66@gmail.com
   - Should see "Welcome to SwitchCV - Verify Your Email"
   - Click "Verify Email" button

4. **Verify the link**:
   - Should redirect to `/auth?verificationSuccess=true`
   - Should show success message
   - Now try to login with the same credentials

5. **Check logs**:
   ```bash
   firebase functions:log --project switchcv-dev | grep "verification method"
   ```
   Should show: `verification method: custom_token`

## Expected Results

✅ Email received within 30 seconds
✅ Verification link contains `/api/auth/verify?token=xxx`
✅ Clicking link verifies email successfully
✅ Can login without "verify email" barrier
✅ Logs show `custom_token` method used

## If It Still Fails

Check:
1. Function logs: `firebase functions:log --project switchcv-dev`
2. Firestore collection `verificationTokens` has new document
3. Email extension logs in Firebase Console
4. SMTP credentials are valid
