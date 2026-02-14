# Deployment Scripts Reference

**Last Updated**: February 14, 2026 (v2.0)

---

## Quick Start

### Deploy to Dev Only

```bash
npm run deploy:dev
# or
bash scripts/deploy.sh dev
```

### Deploy to Prod (with auto version bump)

```bash
npm run deploy:prod
# Automatically runs: npm run release → commits → deploys
```

### Deploy to Both Dev & Prod (Sync)

```bash
npm run deploy:sync
# Interactive: Deploy to dev, prompt for prod promotion
# If yes → auto bump version → deploy to prod
```

### Prod Hotfix (No Version Bump)

```bash
npm run deploy:prod:hotfix
# For emergency fixes that don't need a version increment
```

---

## Available Commands

| Command                      | Effect                                        | When to Use           |
| ---------------------------- | --------------------------------------------- | --------------------- |
| `npm run deploy`             | Opens interactive menu (upcoming)             | When unsure           |
| `npm run deploy:dev`         | Deploy functions + firestore + hosting to dev | Daily dev testing     |
| `npm run deploy:prod`        | Bump version → deploy to prod                 | Releases              |
| `npm run deploy:sync`        | Dev → **prompt** → prod → back to dev         | Production promotions |
| `npm run deploy:prod:hotfix` | Deploy to prod WITHOUT version bump           | Emergency fixes       |

---

## What Gets Deployed

**All commands deploy:**

1. ✅ Firestore indexes & rules
2. ✅ Cloud Functions (all 28)
3. ✅ Hosting (static assets + SSR)

**For prod releases:** Version is auto-bumped before deployment

---

## Deployment Flow Visual

### `npm run deploy:sync` (Interactive)

```
┌─────────────────────────────────────────────────────┐
│ Start: You're on branch 'develop'                    │
└────────────────┬────────────────────────────────────┘
                 ↓
        ┌────────────────────┐
        │ Quality Checks     │
        │ - TypeScript       │
        │ - ESLint           │
        │ - Next.js build    │
        └────────────┬───────┘
                     ↓
        ┌────────────────────────┐
        │ Ask for Confirmation?  │  ← User: "yes"
        └────────────┬───────────┘
                     ↓
        ┌────────────────────────────────┐
        │ Deploy to DEV                   │
        │ • Firestore indexes & rules    │
        │ • Cloud Functions (28)         │
        │ • Hosting + SSR                │
        └────────────┬───────────────────┘
                     ↓ (SUCCESS)
        ┌─────────────────────────────────┐
        │ Ask: Ready for PROD? (yes/no)   │  ← User: "yes"
        └────────────┬────────────────────┘
                     ↓ (User said "yes")
        ┌──────────────────────────────┐
        │ Bump Version                  │
        │ 0.1.20 → 0.1.21             │
        │ Commit + add to RELEASE_NOTES │
        └────────────┬─────────────────┘
                     ↓
        ┌──────────────────────────────────┐
        │ Deploy to PROD                    │
        │ • Firestore indexes & rules      │
        │ • Cloud Functions (28)           │
        │ • Hosting + SSR                  │
        └────────────┬─────────────────────┘
                     ↓ (SUCCESS)
        ┌──────────────────────────────────┐
        │ Auto-Switch Back to DEV          │
        │ (npm run env:dev)                │
        └─────────────────────────────────┘
```

---

## What Changed in the Old Workflow

### Before (Old `deploy-sync.sh`)

```bash
# Old script (still exists but replaced):
bash scripts/deploy-sync.sh
# - No version management
# - No hosting deployment (functions/firestore only)
# - No quality checks
# - Non-interactive
```

### After (New `deploy.sh`)

```bash
# New script (recommended):
npm run deploy:sync
# ✅ Interactive mode (confirms before each step)
# ✅ Auto version bumping for prod
# ✅ Deploys hosting + functions + firestore
# ✅ Quality checks before deployment
# ✅ Color-coded output for clarity
# ✅ Always returns to dev
```

---

## Troubleshooting

### Error: "Uncommitted changes detected"

```bash
# Fix: Commit or stash changes first
git add .
git commit -m "message"
npm run deploy:prod
```

### Error: "TypeScript errors" during quality check

```bash
# Fix: Resolve errors before deploying
npx tsc --noEmit
# Fix errors, then:
npm run deploy:prod
```

### Manual Override (Skip Quality Checks)

```bash
# If you NEED to deploy without checks (last resort):
firebase deploy -P dev --only functions,firestore,hosting
# Then switch back:
npm run env:dev
```

---

## Version Management Integration

### Flow When Deploying to Prod

```bash
npm run deploy:prod
  ↓
Quality checks pass
  ↓
User confirms deployment
  ↓
npm run release
  ├─ Reads package.json version: "0.1.20"
  ├─ Increments to: "0.1.21"
  ├─ Updates: package.json
  ├─ Updates: docs/RELEASE_NOTES.md
  └─ Returns: "Updated version from 0.1.20 to 0.1.21"
  ↓
git commit -m "chore: bump version"
  ↓
firebase deploy --only firestore,functions,hosting
  ↓
✅ Done (environment auto-switched to dev)
```

---

## For CI/CD (GitHub Actions)

If you want to add GitHub Actions deployment:

```yaml
# .github/workflows/deploy.yml (example)
name: Deploy

on:
  push:
    branches:
      - main # Prod deployments
      - develop # Dev deployments

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 22

      - name: Install dependencies
        run: npm ci

      # For develop branch
      - name: Deploy to dev
        if: github.ref == 'refs/heads/develop'
        run: npm run deploy:dev

      # For main branch
      - name: Deploy to prod
        if: github.ref == 'refs/heads/main'
        run: npm run deploy:prod
```

---

## Comparison: All Deploy Options

| Command                             | Dev? | Prod?  | Version Bump?    | Interactive? | Quality Checks? |
| ----------------------------------- | ---- | ------ | ---------------- | ------------ | --------------- |
| `npm run deploy:dev`                | ✅   | ❌     | ❌               | ❌ (auto)    | ✅              |
| `npm run deploy:prod`               | ❌   | ✅     | ✅ Auto          | ❌ (auto)    | ✅              |
| `npm run deploy:sync`               | ✅   | ⚠️ Ask | ✅ Auto (if yes) | ✅           | ✅              |
| `npm run deploy:prod:hotfix`        | ❌   | ✅     | ❌               | ❌ (auto)    | ✅              |
| `bash scripts/deploy-sync.sh` (old) | ✅   | ✅     | ❌               | ❌           | ❌              |

---

## Daily Workflow Example

### Typical Dev Day

```bash
# Morning: Deploy latest dev changes
npm run deploy:dev

# ... make changes during the day ...
git commit -m "feat: add new feature"

# Afternoon: Deploy again to test
npm run deploy:dev

# End of day: Ready for prod? Use sync
npm run deploy:sync
# → Ask to promote to prod
# → If yes: auto bump version 0.1.20 → 0.1.21 + deploy
# → You're back in dev
```

### Release Day

```bash
# 1. Deploy directly to prod (with auto version bump)
npm run deploy:prod

# 2. Verify both environments are live
curl https://switchcv-dev.web.app/api/health
curl https://switchcv-e5136.web.app/api/health

# 3. Check release notes were updated
cat docs/RELEASE_NOTES.md | head -20
```

---

## Performance

| Step             | Time          |
| ---------------- | ------------- |
| Quality checks   | 1-2 min       |
| Dev deployment   | 8-10 min      |
| Prod deployment  | 8-10 min      |
| **Total (sync)** | **18-22 min** |

**Note:** Slow due to 126 MB SSR bundle. See [DEPLOYMENT_BUNDLE_ANALYSIS.md](./DEPLOYMENT_BUNDLE_ANALYSIS.md) for details.

---

## See Also

- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) — Detailed pre-deployment checklist
- [DEPLOYMENT_BUNDLE_ANALYSIS.md](./DEPLOYMENT_BUNDLE_ANALYSIS.md) — Why deployment takes 10 minutes
- [LESSONS_LEARNED.md](./LESSONS_LEARNED.md) — Past deployment failures and fixes
- [DEPLOYMENT_VERIFICATION.md](./DEPLOYMENT_VERIFICATION.md) — What was actually deployed
