# Production Deployment Guide

## Overview

SwitchCV uses **two separate Firebase projects**:

- **Development**: `switchcv-dev` (for testing at localhost)
- **Production**: `switchcv-e5136` (for https://switchcv.com)

The deployment process automatically switches between these projects and uses the **correct environment variables** for each.

---

## Environment Variable Setup

### Development (`.env.local`)

Used for local development and testing. Contains credentials for the **`switchcv-dev`** Firebase project:

```dotenv
NEXT_PUBLIC_FIREBASE_PROJECT_ID=switchcv-dev
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=switchcv-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCm1wvOw1fLZssQiJcgL0cDGyIxSH8Ytls
# ... other dev credentials
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**Status**: Ignored by Git (local development only)

### Production (`.env.production`)

Used when building for production deployment. Contains credentials for the **`switchcv-e5136`** Firebase project:

```dotenv
NEXT_PUBLIC_FIREBASE_PROJECT_ID=switchcv-e5136
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=switchcv-e5136.firebaseapp.com
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCTHP5C_Mg3kv0E1WGAxNmCAN0Mxb8zbZc
# ... other prod credentials
NEXT_PUBLIC_BASE_URL=https://switchcv.com
```

**Status**: Tracked in Git (public Firebase config, no secrets)

---

## How Next.js Loads Env Files

Next.js **automatically** selects the correct environment file:

1. When `NODE_ENV=development` (local dev):
   - Loads `.env` → `.env.local` → `.env.development`
   - `.env.local` has precedence (used for dev)

2. When `NODE_ENV=production` (builds for production):
   - Loads `.env` → `.env.production`
   - `.env.local` is IGNORED
   - `.env.production` is used

### Build Behavior

```bash
# Local development build
npm run build
# Uses: .env.local (dev Firebase config)

# Production build
NODE_ENV=production npm run build
# Uses: .env.production (prod Firebase config)
```

---

## Deployment Process

### Automatic Env Switching

The `npm run deploy:prod` command:

1. **Sets `NODE_ENV=production`** during the build
2. Next.js reads `.env.production` → prod Firebase config injected into bundle
3. Firebase project context switches to `switchcv-e5136`
4. Deploys to production

### Manual Deployment

```bash
# Deploy to production
npm run deploy:prod

# Deploy to development
npm run deploy:dev

# Deploy to both (sync: dev → prod → dev)
npm run deploy:sync
```

---

## Fixing the Google Sign-In Domain Issue

### Root Cause

Production site was using **dev** Firebase credentials (`switchcv-dev`) instead of **prod** (`switchcv-e5136`). This caused `auth/unauthorized-domain` errors because:

- `switchcv.com` was authorized in `switchcv-e5136`
- But the site was talking to `switchcv-dev` (where it wasn't authorized)

### Solutions Applied

#### 1. Auto-Detection in Code (✅ Done)

Updated [src/lib/firebase.ts](../src/lib/firebase.ts) to use the custom domain as `authDomain` when running on production:

```typescript
const resolveAuthDomain = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "switchcv.com" || hostname === "www.switchcv.com") {
      return hostname; // ← Google recommended approach
    }
  }
  return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "";
};
```

#### 2. Correct Env Files (✅ Done)

- Created `.env.production` with correct prod Firebase config
- Removed `.env.production` from `.gitignore` (safe to track)
- Updated deploy script to use `NODE_ENV=production` during build

---

## Verification Checklist

Before deploying to production, verify:

```bash
# 1. Check that .env.production has correct project
grep "switchcv-e5136" .env.production

# 2. Build locally for production
NODE_ENV=production npm run build

# 3. Verify build is correct
grep "switchcv-e5136" .next/ -r | head -3

# 4. Run deployment
npm run deploy:prod:hotfix  # or npm run deploy:prod

# 5. Test on production
curl https://switchcv.com/__/firebase/init.json | grep projectId
# Should return: "projectId": "switchcv-e5136"

# 6. Test Google Sign-In
# Open https://switchcv.com/auth?mode=signup
# Click "Continue with Google"
# Should NOT show auth/unauthorized-domain error
```

---

## Firebase Configuration Summary

| Config               | Dev                            | Prod                               |
| -------------------- | ------------------------------ | ---------------------------------- |
| Project ID           | `switchcv-dev`                 | `switchcv-e5136`                   |
| Auth Domain          | `switchcv-dev.firebaseapp.com` | `switchcv-e5136.firebaseapp.com`   |
| Auth Domain (custom) | N/A                            | `switchcv.com` (set in code)       |
| Env File             | `.env.local`                   | `.env.production`                  |
| Base URL             | `http://localhost:3000`        | `https://switchcv.com`             |
| Authorized Domains   | `localhost`                    | `switchcv.com`, `www.switchcv.com` |
| Hosting URL          | `https://switchcv-dev.web.app` | `https://switchcv-e5136.web.app`   |
| Custom Domain        | N/A                            | `https://switchcv.com`             |

---

## Troubleshooting

### Build uses wrong Firebase project

**Symptom**: Production site has `switchcv-dev` in JS bundles

**Fix**:

```bash
# Ensure .env.production has prod config
cat .env.production | grep NEXT_PUBLIC_FIREBASE_PROJECT_ID

# Check build output
grep "switchcv-e5136\|switchcv-dev" .next/ -r | head -3
```

### Google Sign-In still fails

**Symptom**: `auth/unauthorized-domain` error on production

**Check**:

1. Is `switchcv.com` in authorized domains? (Firebase Console → Authentication → Settings)
2. Is it just the domain (no `https://`)?
3. Did production build use `.env.production`?
4. Did you redeploy after changes?

### Different Firebase project per environment

**Symptom**: Need to selectively deploy to different projects

**Current setup**: `.firebaserc` maps dev/prod to correct projects:

```json
{
  "projects": {
    "default": "switchcv-e5136",
    "dev": "switchcv-dev"
  }
}
```

Use `npm run deploy:dev` or `npm run deploy:prod` to deploy to the correct project.

---

## Key Files

| File                  | Purpose                                             |
| --------------------- | --------------------------------------------------- |
| `.env.local`          | Development env (ignored by Git)                    |
| `.env.production`     | Production env (tracked in Git)                     |
| `.firebaserc`         | Firebase project mapping                            |
| `scripts/deploy.sh`   | Main deployment script                              |
| `src/lib/firebase.ts` | Firebase client initialization + domain detection   |
| `.gitignore`          | What to ignore (updated to track `.env.production`) |

---

## Long-Term Notes

1. **Secrets Management**: Real API keys (AI providers, etc.) are managed via Firebase Secret Manager, not .env files
2. **Security**: `.env.production` only contains public Firebase config (no secrets)
3. **CI/CD**: If using GitHub Actions, configure secrets there; don't rely on .env files
4. **Local Dev**: Each developer has their own `.env.local` (not tracked)
