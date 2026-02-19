# Long-Term Fix Summary: Production Deployment Environment

## Problem

Production build was using **development** Firebase credentials (`switchcv-dev`) instead of **production** (`switchcv-e5136`), causing:

- `auth/unauthorized-domain` errors
- App talking to wrong Firebase project
- Manual env var switching issues

## Root Cause

1. Build process didn't distinguish between dev and prod
2. `.env.local` (dev config) was always used, even in production
3. No `.env.production` file existed
4. Deploy script didn't set `NODE_ENV=production` during build

## Solutions Implemented

### 1. **Code-level Fix** (Immediate)

📄 [src/lib/firebase.ts](../src/lib/firebase.ts)

Added `resolveAuthDomain()` function to detect custom domain and use it as authDomain:

```typescript
const resolveAuthDomain = (): string => {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "switchcv.com" || hostname === "www.switchcv.com") {
      return hostname; // ← Google's recommended approach
    }
  }
  return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "";
};
```

### 2. **Environment Configuration** (Long-term)

✅ **Created** `.env.production`

- Contains correct `switchcv-e5136` Firebase project config
- Tracked in Git (public Firebase config only)
- Updated `.gitignore` to NOT ignore `.env.production`

### 3. **Build Pipeline** (Long-term)

📄 [scripts/deploy.sh](../scripts/deploy.sh)

Updated to set `NODE_ENV=production` during build:

```bash
# Before
npm run build --silent

# After
NODE_ENV=production npm run build --silent
```

This ensures Next.js loads `.env.production` instead of `.env.local`.

### 4. **Documentation** (Long-term)

- 📄 [docs/PRODUCTION_DEPLOYMENT.md](../docs/PRODUCTION_DEPLOYMENT.md) - Comprehensive guide
- 📄 [DEPLOYMENT.md](../DEPLOYMENT.md) - Quick reference

## How It Works Now

### Build Flow

```
npm run deploy:prod
    ↓
validate_inputs() ← checks git is clean
    ↓
handle_version_bump("prod") ← bumps version
    ↓
run_quality_checks()
    ↓
NODE_ENV=production npm run build ← ✨ NEW ✨
    ↓
Next.js reads .env.production ← (switchcv-e5136 Firebase config)
    ↓
JavaScript bundle contains prod credentials ✅
```

### Runtime Flow

```
User opens https://switchcv.com
    ↓
App loads prod Firebase SDK config from bundle
    ↓
resolveAuthDomain() detects "switchcv.com"
    ↓
Sets authDomain = "switchcv.com" ← Google recommended
    ↓
Google Sign-In popup opens on same domain
    ↓
No more auth/unauthorized-domain errors ✅
```

## File Changes Summary

| File                            | Change     | Impact                                        |
| ------------------------------- | ---------- | --------------------------------------------- |
| `.env.production`               | ✨ Created | Production builds use correct Firebase config |
| `.gitignore`                    | Updated    | `.env.production` now tracked                 |
| `src/lib/firebase.ts`           | Enhanced   | Auto-detects production domain                |
| `scripts/deploy.sh`             | Enhanced   | Sets `NODE_ENV=production` during build       |
| `docs/PRODUCTION_DEPLOYMENT.md` | ✨ Created | Comprehensive deployment guide                |
| `DEPLOYMENT.md`                 | ✨ Created | Quick reference card                          |

## Verification Steps

```bash
# 1. Verify production build uses correct Firebase config
NODE_ENV=production npm run build

# 2. Check bundle has prod Firebase project
grep "switchcv-e5136" .next/ -r | head -3
# Should show switchcv-e5136 multiple times

# 3. Deploy to production
npm run deploy:prod:hotfix

# 4. Test production
curl https://switchcv.com/__/firebase/init.json | grep projectId
# Should return: "projectId": "switchcv-e5136"

# 5. Test Google Sign-In
open https://switchcv.com/auth?mode=signup
# Click "Continue with Google" - should work now!
```

## Prevention

For future deployments:

1. **Always use the deployment script**: `npm run deploy:prod`
2. **Never manually edit `.env.local` for production**: It's for local dev only
3. **Production builds automatically use `.env.production`** when running via deploy script
4. **Verify**: `curl https://switchcv.com/__/firebase/init.json` returns `switchcv-e5136`

## Key Takeaway

**Environment variables are now properly isolated:**

- 💻 Local dev: `.env.local` → `switchcv-dev`
- 🌍 Production: `.env.production` → `switchcv-e5136`
- 🔄 Auto-switching: Deploy script handles environment context
- ✅ Build correctness: `NODE_ENV=production` ensures right config is used
