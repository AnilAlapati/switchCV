# 🚀 Quick Git Reference - SwitchCV

## Current Setup ✅

```
Main Branches:
├── develop (👈 YOU ARE HERE - use this for daily work)
├── feature/version_1 (stable release branch)
└── backup/feature_version_1_20251111 (safety backup)
```

## Daily Workflow

```bash
# 1. Pull latest changes
git pull origin develop

# 2. Make your changes
# ... edit files ...

# 3. Check what changed
git status

# 4. Commit your work
git add .
git commit -m "feat: your descriptive message"

# 5. Push to remote
git push origin develop
```

## Weekly Backup (Every Monday)

```bash
# Create and push backup
git branch backup/$(date +%Y%m%d)
git push origin backup/$(date +%Y%m%d)
```

## Common Issues & Fixes

### 🔴 "Repository is locked"

```bash
rm -rf .git/index.lock
```

### 🔴 "Behind remote branch"

```bash
git pull --rebase origin develop
git push origin develop
```

### 🔴 "Merge conflicts"

```bash
# Fix conflicts in files, then:
git add .
git commit -m "fix: resolve merge conflicts"
git push origin develop
```

## Safety Rules 🛡️

1. ✅ **DO**: Commit often (multiple times per day)
2. ✅ **DO**: Push at end of day
3. ✅ **DO**: Work on `develop` branch
4. ❌ **DON'T**: Use `git push -f` on shared branches
5. ❌ **DON'T**: Commit `.env` files or `node_modules/`

## Emergency: Restore from Backup

```bash
# If something goes wrong, restore from backup:
git checkout -b recovery backup/feature_version_1_20251111
```

## Monthly Health Check (1st of Month)

```bash
# Check for issues
git fsck --full

# Clean and optimize
git gc --aggressive --prune=now
```

## Get Help

```bash
# See where you are
git status
git branch

# See recent changes
git log --oneline -10

# See all remote branches
git branch -r
```

---

💡 **Pro Tip**: Open this file in VS Code for quick reference while working!
