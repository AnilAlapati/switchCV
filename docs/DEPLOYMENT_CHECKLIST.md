# Deployment Checklist & Version Management

**Last Updated**: February 14, 2026  
**Current Version**: 0.1.20

---

## Pre-Deployment Checklist

### 1. Verify All Changes Are Committed

```bash
# Check for uncommitted changes
git status

# Output should show:
# "On branch main"
# "nothing to commit, working tree clean"
```

### 2. Verify Dependencies Are Complete

```bash
# Make sure both the code AND package.json are in same commit
git diff HEAD~1 --name-only | grep -E "package\.json|package-lock\.json|src/"

# Expected output should show:
# - If you added imports, package.json should also be in the changeset
# - Not just code files without package.json updates
```

**Common mistake to avoid:**

```bash
# ❌ BAD - creates deployment failure
git add src/lib/utils.ts          # Uses tailwind-merge
git commit -m "Add utils"
# (forgot to git add package.json changes!)

# ✅ GOOD - both files committed together
git add package.json package-lock.json src/lib/utils.ts
git commit -m "Add utils with tailwind-merge dependency"
```

### 3. Test Locally with Clean Install

```bash
# Simulate what CI/CD will do
npm ci                    # Clean install (like firebase deploy does)
npm run build             # Compile Next.js
npx tsc --noEmit          # Type check
npm run lint              # ESLint
npm test                  # Run tests (if applicable)
```

If any of these fail locally, they **will fail in Firebase deploy**.

### 4. Increment Version (Optional but Recommended)

Before pushing a release to production:

```bash
# This bumps 0.1.20 → 0.1.21
npm run release

# Output:
# Updated version from 0.1.20 to 0.1.21
# Updated RELEASE_NOTES.md

# Then commit and push
git add package.json docs/RELEASE_NOTES.md
git commit -m "chore: bump version to 0.1.21"
git push
```

**When to use `npm run release`:**

- ✅ Before deploying to production
- ✅ Before deploying to staging for testing
- ❌ Don't use for dev deployments (dev can stay on 0.1.20)

### 5. Verify No Stray Dependencies

```bash
# Check that all imported packages are in package.json
npm ls 2>&1 | grep -i "missing\|UNMET"

# Should output nothing if all is well
```

---

## Deployment Sequence (Dev)

```bash
# Step 1: Verify everything locally
npm run build
npm test

# Step 2: Deploy to dev (no version bump needed)
firebase use dev
firebase deploy --only firestore:indexes
firebase deploy --only functions
firebase deploy --only hosting

# Expected time: ~12 minutes total
#  - functions: 2-3 min
#  - hosting: 8-10 min (slow due to SSR bundle size)
```

---

## Deployment Sequence (Production)

```bash
# Step 1: Verify everything locally
npm run build
npm test

# Step 2: Bump version
npm run release
git add package.json docs/RELEASE_NOTES.md
git commit -m "chore: bump version to 0.1.21"
git push

# Step 3: Switch to prod and deploy
firebase use default              # or 'prod' if aliased
firebase deploy --only firestore:indexes
firebase deploy --only functions
firebase deploy --only hosting

# Expected time: ~12 minutes total
#  - functions: 2-3 min
#  - hosting: 8-10 min

# Step 4: Verify prod is live
curl https://switchcv-e5136.web.app/api/health
# Should return 200 OK with {"status": "healthy"}
```

---

## Understanding Version Locations

### 1. package.json

```json
{
  "name": "switchcv",
  "version": "0.1.20" // ← Manual version, bumped with `npm run release`
}
```

**How it's used:**

- Tagged in RELEASE_NOTES.md when released
- **NOT** automatically tracked by Firebase
- **NOT** included in deployed artifact names

### 2. Firebase Behavior

Firebase does **NOT** auto-version deployments. Instead:

```
Deployment 1 (0.1.20):
  Functions → Cloud Functions
  Hosting   → Firebase Hosting URL

Deployment 2 (0.1.20 again if no version bump):
  Functions → Cloud Functions (overwritten)
  Hosting   → Firebase Hosting URL (overwritten)

If you need to track, use:
  - Git commit SHA: `git rev-parse --short HEAD`
  - Firebase Hosting domain version: https://console.firebase.google.com/project/switchcv-dev/hosting/main
  - RELEASE_NOTES.md for manual tracking
```

### 3. Release Notes

Located at `docs/RELEASE_NOTES.md`:

```markdown
# Release Notes

## [AI.0.1.21] - 2026-02-14

### Changed

- Automated version increment.

## [AI.0.1.20] - 2026-02-13

### Changed

- Fixed deployment dependency sync issue
- Added bundle size analysis

## [AI.0.1.19] - 2026-02-12

...
```

**When you run `npm run release`, it automatically:**

1. Increments package.json version
2. Adds entry to RELEASE_NOTES.md with today's date

---

## Deploy Status Monitoring

### Real-time Monitoring During Deploy

```bash
# Watch functions deploy (terminal 1)
firebase deploy --only functions

# Watch hosting deploy (terminal 2)
firebase deploy --only hosting

# Expected log sequence:
# ✔ functions: Finished running predeploy script.
# i functions: preparing .firebase/switchcv-dev/functions for uploading...
# i functions: packaged ... (size in MB) for uploading
# ✔ hosting[switchcv-dev]: file upload complete
# i functions: updating Node.js 22 (2nd Gen) function ...
# ✔ functions[...] Successful update operation.
# i hosting[switchcv-dev]: finalizing version...
# ✔ hosting[switchcv-dev]: release complete
# ✔ Deploy complete!
```

### Post-Deployment Verification

```bash
# 1. Check functions deployed
firebase functions:list

# Output should show all 28+ functions with ✓ status

# 2. Check hosting URL
curl -I https://switchcv-dev.web.app/
# Should return 200 OK

# 3. Check API health
curl https://switchcv-dev.web.app/api/health
# Should return: {"status": "healthy", ...}

# 4. Check Firestore deployed correctly
firebase firestore:indexes --project switchcv-dev
# Should list all indexes

# 5. View deployment in console
open "https://console.firebase.google.com/project/switchcv-dev/hosting/main"
```

---

## Troubleshooting Deployment Failures

### Error: "Module not found: Can't resolve 'X'"

**Cause**: Dependency imported in code but NOT in package.json

**Fix**:

```bash
npm install [package-name]
git add package.json package-lock.json
git commit --amend --no-edit
git push -f origin branch-name
```

### Error: "ENOENT .next/server/middleware-manifest.json"

**Cause**: Next.js build failed (incomplete), manifests not generated

**Fix**:

1. Run locally: `npm run build`
2. Check for TypeScript or compilation errors
3. Resolve errors, then retry deploy

### Error: "Timeout waiting for Cloud Run deployment"

**Cause**: SSR function taking >10 minutes to deploy (very rare)

**Fix**:

1. Check Firebase Cloud Build logs: `gcloud builds log --limit=100 --region=us-central1`
2. May indicate infrastructure issue with Cloud Build
3. Retry deployment

---

## Deployment Performance Targets

| Stage             | Expected Time   | Budget      |
| ----------------- | --------------- | ----------- |
| Firestore indexes | 30-60 sec       | ✅          |
| Cloud Functions   | 2-3 min         | ✅          |
| **Hosting (SSR)** | **8-10 min**    | ⚠️ **SLOW** |
| **Total**         | **~12 minutes** | ⚠️          |

**Why hosting is slow**: See [DEPLOYMENT_BUNDLE_ANALYSIS.md](./DEPLOYMENT_BUNDLE_ANALYSIS.md)

---

## Team Guidelines

### Rule 1: Every Code Change Must Include Dependencies

```
If you write:                          Then you must also change:
import 'new-package'              →    package.json (add to dependencies)
                                  →    package-lock.json (auto-generated by npm)
Add src/components/NewThing.tsx   →    src/index.ts (if it's an export)
Add API route /api/new/route.ts   →    firestore.rules (if new collection access)
```

### Rule 2: Verify Clean Install Locally Before Pushing

```bash
# Before git push:
npm ci          # Clean install
npm run build   # Does it build?
npm run test    # Do tests pass?

# If any fail, FIX LOCALLY before pushing.
# Don't let Firebase fail to catch your bugs.
```

### Rule 3: Use Version Bumps for Production Releases

```bash
# For prod deployments:
npm run release               # Bumps version
git add package.json docs/RELEASE_NOTES.md
git commit -m "chore: bump version to X.Y.Z"
git push
firebase deploy -P default   # Deploy prod
```

---

## Quick Deploy Commands Reference

```bash
# Dev deploy (fast)
firebase use dev && firebase deploy --only functions

# Dev full deploy (includes hosting)
firebase use dev && firebase deploy

# Prod full deploy (with version bump first!)
npm run release && \
git add package.json docs/RELEASE_NOTES.md && \
git commit -m "chore: bump version" && \
git push && \
firebase use default && \
firebase deploy

# Firestore only (both envs)
firebase deploy --only firestore:indexes -P dev
firebase deploy --only firestore:indexes -P default

# Verify deployment
firebase functions:list -P dev
curl https://switchcv-dev.web.app/api/health
```

---

## See Also

- [LESSONS_LEARNED.md](./LESSONS_LEARNED.md) - Feb 13/14 deployment failure analysis
- [DEPLOYMENT_BUNDLE_ANALYSIS.md](./DEPLOYMENT_BUNDLE_ANALYSIS.md) - Why hosting is slow (126 MB SSR function)
- [Firebase Hosting Next.js Docs](https://firebase.google.com/docs/hosting/frameworks/nextjs)
