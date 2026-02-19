# Deployment Quick Reference

## Quick Start

```bash
# Development
npm run deploy:dev              # Deploy to switchcv-dev

# Production
npm run deploy:prod             # Deploy to switchcv-e5136 (with version bump)
npm run deploy:prod:hotfix      # Deploy without version bump (hotfixes)

# Both
npm run deploy:sync             # DEV → PROD → DEV (interactive)
```

## Critical: Environment Variables

### For Production Deploys

✅ **Correct**: Uses `.env.production` (prod Firebase config)

```bash
npm run deploy:prod
```

❌ **Wrong**: Don't modify `.env.local` for production - it's for LOCAL DEV only

### Auto-Switching

The deployment script automatically:

1. Sets `NODE_ENV=production` during build → uses `.env.production`
2. Switches Firebase project to `switchcv-e5136`
3. Deploys to production

## Verify Deployment

```bash
# Check production is using correct Firebase project
curl https://switchcv.com/__/firebase/init.json | grep projectId

# Test Google Sign-In on production
open https://switchcv.com/auth?mode=signup
# Click "Continue with Google" - should NOT show auth/unauthorized-domain
```

## Key Files

- `.env.production` - Production Firebase config (tracked in Git)
- `.env.local` - Development config (ignored, local only)
- `docs/PRODUCTION_DEPLOYMENT.md` - Full deployment guide

## Common Issues

| Issue                                    | Fix                                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `auth/unauthorized-domain` on production | Check authorized domains in Firebase Console for `switchcv-e5136`, ensure `switchcv.com` (no `https://`) |
| Build has `switchcv-dev` in bundle       | Ensure `.env.production` has `switchcv-e5136` config                                                     |
| Wrong Firebase project deployed          | Run `firebase use` to check/switch project context                                                       |
