# Troubleshooting & Fixes

This guide provides solutions for common issues encountered during development and operation of SwitchCV.

## 1. Google Sign-In Issues

### Issue: "auth/internal-error" or "auth/operation-not-allowed"
- **Cause**: Google provider not enabled or OAuth client misconfigured in Firebase Console.
- **Fix**: 
  1. Go to Firebase Console > Authentication > Sign-in method.
  2. Enable **Google**.
  3. Ensure **Web Client ID** and **Secret** are configured if using a custom OAuth client.

### Issue: "auth/unauthorized-domain"
- **Cause**: The current domain (e.g., `localhost`) is not in the authorized list.
- **Fix**: Add your domain in Firebase Console > Authentication > Settings > Authorized domains.

### Issue: Popup Closes Immediately
- **Cause**: Often due to blocked popups or incorrect `REDIRECT_URI` configuration in Google Cloud Console.
- **Fix**: Ensure `http://localhost:3000/__/auth/handler` is added as an Authorized Redirect URI in the Google Cloud Console for your Client ID.

## 2. Environment & Build Issues

### Firebase Initialization Error
- **Cause**: Missing `NEXT_PUBLIC_FIREBASE_*` variables.
- **Fix**: Check your `.env.local` file and ensure it matches the keys in [ENV_VARIABLES.md](ENV_VARIABLES.md).

### Build Failures (Next.js)
- **Cause**: Often TypeScript errors in API routes or invalid generated types.
- **Fix**: Run `npm run lint` locally before pushing to identify type mismatches.
