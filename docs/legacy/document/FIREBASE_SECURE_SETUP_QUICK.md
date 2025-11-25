# 🔒 Quick Setup: Secure Firebase Admin SDK

## TL;DR - 3 Steps to Fix

### Step 1️⃣ Install gcloud (once)

```bash
brew install --cask google-cloud-sdk
```

### Step 2️⃣ Authenticate (one-time)

```bash
gcloud auth application-default login
```

Browser opens → Sign in → Done! Credentials saved securely.

### Step 3️⃣ Restart your dev server

```bash
npm run dev
```

✅ **Done!** No keys downloaded. No `.env.local` changes needed.

---

## What Just Happened?

Your settings API now uses **Firebase Admin SDK** with **Application Default Credentials (ADC)**:

- **Before:** Client SDK → Firestore rules rejected it → ❌ Error
- **After:** Admin SDK with ADC → Authenticated as your Google account → ✅ Works

---

## Test It

1. Go to http://localhost:3000/dashboard
2. Scroll to "Profile Settings"
3. Toggle "Recruiter Account"
4. Should see: **"Settings updated successfully!"** ✅

---

## Why This Approach?

| Aspect            | ADC + gcloud | Service Account Keys |
| ----------------- | ------------ | -------------------- |
| Security          | ⭐⭐⭐⭐⭐   | ⭐⭐                 |
| Keys Downloaded   | ❌           | ✅                   |
| Easy Setup        | ✅           | ⚠️                   |
| Production Ready  | ✅           | ❌                   |
| Workload Identity | ✅           | ❌                   |

---

## Production / Deployment

For Cloud Run, Cloud Functions, or CI/CD:

- No setup needed for Cloud Run/Functions (built-in service account)
- Use Workload Identity Federation for GitHub Actions (no keys, most secure)

See `FIREBASE_ADMIN_FIX_SUMMARY.md` for production setup details.

---

## Troubleshooting

| Problem                | Fix                                          |
| ---------------------- | -------------------------------------------- |
| `Failed to initialize` | Run: `gcloud auth application-default login` |
| `Permission denied`    | Check: `gcloud auth list`                    |
| Still getting errors   | Restart terminal and dev server              |

---

## Files Modified

- ✅ `/src/lib/firebase-admin.ts` - Secure Admin SDK init
- ✅ `/src/app/api/user/settings/route.ts` - Uses Admin SDK
- ✅ `/src/components/dashboard/UserProfileSettings.tsx` - Better errors

That's it! 🎉
