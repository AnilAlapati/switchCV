# Firebase Admin SDK Setup Guide (Secure Approach)

## Issue Fixed

The API was failing with "Missing or insufficient permissions" because it was using the client SDK which respects Firestore security rules. The fix uses the Firebase Admin SDK on the server-side with elevated permissions.

## 🔒 Recommended Setup: Application Default Credentials (ADC)

The code is already configured to use the **most secure approach** - no hardcoded keys!

### For Local Development

**Option A: Using gcloud CLI (Recommended) ⭐**

1. **Install Google Cloud CLI:**

   ```bash
   # macOS with Homebrew
   brew install --cask google-cloud-sdk

   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticate with Google Cloud:**

   ```bash
   gcloud auth application-default login
   ```

   - A browser window will open
   - Sign in with your Google account
   - Approve the permissions
   - Credentials saved to: `~/.config/gcloud/application_default_credentials.json`

3. **Set the default project:**

   ```bash
   gcloud config set project switchcv-e5136
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

The Admin SDK will automatically use the authenticated credentials.

### For Production Deployment (Cloud Run / Cloud Functions)

**Workload Identity Federation (Recommended - No Keys!) ⭐⭐⭐**

✅ **Most Secure Option**

- No long-lived service account keys
- No private key files to manage or rotate
- Automatic credential refresh
- Audit trail of who accessed what

Setup:

1. Configure WIF in Cloud Console
2. Bind your GitHub Actions / CI/CD to WIF
3. Cloud Run automatically uses built-in service account
4. Admin SDK gets credentials from metadata service

[Learn more](https://cloud.google.com/docs/authentication/workload-identity-federation)

**Traditional Service Account (Fallback)**

Only if WIF is not available:

1. Create a service account in Cloud Console
2. Download key (store in secret manager, not in code)
3. Set env var: `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`

⚠️ **Never download keys for development** - Use gcloud auth instead!

## Verification

Test the settings API works:

```bash
# 1. Ensure gcloud is authenticated
gcloud auth list

# 2. Start dev server
npm run dev

# 3. Go to http://localhost:3000/dashboard

# 4. Toggle "Recruiter Account" switch
# Should see: "Settings updated successfully!" ✅
```

## ✅ Security Best Practices Implemented

| Approach             | Local Dev | Production | Keys? | Secure?    |
| -------------------- | --------- | ---------- | ----- | ---------- |
| ADC + gcloud         | ✅        | ❌         | ❌    | ⭐⭐⭐⭐⭐ |
| Workload Identity    | ❌        | ✅         | ❌    | ⭐⭐⭐⭐⭐ |
| Service Account JSON | ⚠️        | ❌         | ✅    | ⭐⭐       |

## Files Modified

- `/src/lib/firebase-admin.ts` - Admin SDK with secure initialization
- `/src/app/api/user/settings/route.ts` - Uses Admin SDK
- `/src/components/dashboard/UserProfileSettings.tsx` - Better error handling

## Troubleshooting

| Error                                     | Solution                                                           |
| ----------------------------------------- | ------------------------------------------------------------------ |
| "Failed to initialize Firebase Admin SDK" | Run `gcloud auth application-default login`                        |
| "Permission denied"                       | Verify: `gcloud auth list` and project: `gcloud config list`       |
| Credentials not found                     | Check: `cat ~/.config/gcloud/application_default_credentials.json` |

## Next Steps

1. Install gcloud: `brew install --cask google-cloud-sdk`
2. Authenticate: `gcloud auth application-default login`
3. Set project: `gcloud config set project switchcv-e5136`
4. Restart dev: `npm run dev`
5. Test toggle in dashboard ✅
