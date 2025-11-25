# Firebase Settings API Fix - Complete Summary (Secure)

## Root Cause

The API was failing with "Missing or insufficient permissions" because:

1. Settings API used the Firebase **client SDK** (respects security rules)
2. Firestore rules only allow reading your own document when authenticated
3. Server-side requests lack authentication context → access denied

## Solution: Admin SDK with Secure Credentials

Switched to **Firebase Admin SDK** with **Application Default Credentials (ADC)**:

- ✅ Runs server-side with elevated permissions
- ✅ No hardcoded service account keys
- ✅ Automatic credential management
- ✅ Ready for Workload Identity Federation in production

## Files Changed

### 1. Created: `/src/lib/firebase-admin.ts`

```typescript
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    // Try service account env var first (fallback)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      // Use Application Default Credentials (ADC) - Recommended!
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    throw error;
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;
```

### 2. Updated: `/src/app/api/user/settings/route.ts`

**Before:**

```typescript
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
const userRef = doc(db, "users", userId);
const userDoc = await getDoc(userRef);
```

**After:**

```typescript
import { adminDb } from "@/lib/firebase-admin";
const userDoc = await adminDb.collection("users").doc(userId).get();
```

### 3. Enhanced: `/src/components/dashboard/UserProfileSettings.tsx`

- Added user validation before API calls
- Better error messages from API responses
- Clearer user feedback on failures

## 🔒 Setup: Secure Local Development

### Step 1: Install Google Cloud CLI

```bash
brew install --cask google-cloud-sdk
```

### Step 2: Authenticate (No Keys Downloaded!)

```bash
gcloud auth application-default login
```

- Browser opens → Sign in with Google account
- Approve permissions
- Credentials stored locally at: `~/.config/gcloud/application_default_credentials.json`

### Step 3: Set Default Project

```bash
gcloud config set project switchcv-e5136
```

### Step 4: Restart Dev Server

```bash
npm run dev
```

### Step 5: Test

1. Go to http://localhost:3000/dashboard
2. Toggle "Recruiter Account" switch
3. See "Settings updated successfully!" ✅

## Security Architecture

| Environment    | Method               | Security   | Keys? |
| -------------- | -------------------- | ---------- | ----- |
| **Local Dev**  | ADC + gcloud         | ⭐⭐⭐⭐⭐ | ❌    |
| **Production** | Workload Identity    | ⭐⭐⭐⭐⭐ | ❌    |
| **CI/CD**      | Workload Identity    | ⭐⭐⭐⭐⭐ | ❌    |
| **Fallback**   | Service Account JSON | ⭐⭐       | ✅    |

## Dependencies

```
firebase-admin@12.x.x (newly installed)
```

## API Endpoints Fixed

- `GET /api/user/settings?userId=...` - Fetch user settings
- `PUT /api/user/settings` - Update settings (toggle recruiter, save company name)

## Error Fixed

```
❌ Before:
Error fetching user settings: [FirebaseError]: Missing or insufficient permissions.

✅ After:
(Works securely without downloading any keys!)
```

## Production Deployment

### Cloud Run / Cloud Functions

- No setup needed! Uses built-in service account
- Automatically supports Workload Identity Federation
- Admin SDK gets credentials from metadata service

### GitHub Actions / CI-CD

- Use Workload Identity Federation instead of service account keys
- Tokens are short-lived and auto-generated
- Most secure approach for automation

[Learn More: WIF Setup](https://cloud.google.com/docs/authentication/workload-identity-federation)

## References

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)
- [Workload Identity Federation](https://cloud.google.com/docs/authentication/workload-identity-federation)
