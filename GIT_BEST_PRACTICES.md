# Git Best Practices for SwitchCV

## Repository Health ✅

Your repository is now optimized and protected against corruption!

## Branch Strategy

### Main Branches

- **`feature/version_1`** - Original feature branch (stable)
- **`develop`** - Active development branch (current working branch)
- **`backup/feature_version_1_20251111`** - Backup snapshot from Nov 11, 2025

### Recommended Workflow

1. **Work on `develop` branch** for day-to-day changes
2. **Create feature branches** for new features: `git checkout -b feature/new-feature`
3. **Merge to `feature/version_1`** when ready for release
4. **Create backups** regularly (see below)

## Preventing Repository Corruption

### Automatic Maintenance Enabled ✅

Git maintenance has been configured to run automatically:

- Incremental repacking
- Loose object cleanup
- Commit graph updates

### Best Practices

#### 1. Regular Commits

```bash
# Commit frequently with meaningful messages
git add .
git commit -m "feat: descriptive message"
git push
```

#### 2. Never Force Operations on Shared Branches

```bash
# ❌ Avoid on shared branches
git push -f origin develop

# ✅ Use instead
git pull --rebase origin develop
git push origin develop
```

#### 3. Create Regular Backups

```bash
# Create dated backup branch
git branch backup/$(date +%Y%m%d_%H%M)
git push origin backup/$(date +%Y%m%d_%H%M)
```

#### 4. Verify Repository Health Monthly

```bash
# Check for corruption
git fsck --full

# Clean up and optimize
git gc --aggressive --prune=now
```

#### 5. Handle Large Files Properly

- Never commit `node_modules/` (already in .gitignore)
- Use Git LFS for files > 50MB
- Keep `.env` files out of repository

## Quick Commands

### Create a Backup Branch

```bash
git branch backup/$(date +%Y%m%d)
git push origin backup/$(date +%Y%m%d)
```

### Switch Between Branches

```bash
# Go to develop branch
git checkout develop

# Go to feature branch
git checkout feature/version_1

# Create new feature
git checkout -b feature/my-new-feature
```

### Check Repository Status

```bash
# View current branch and status
git status

# View all branches
git branch -a

# View recent commits
git log --oneline -10
```

### Sync with Remote

```bash
# Update from remote
git fetch --all

# Pull latest changes
git pull origin develop

# Push your changes
git push origin develop
```

## Recovery Procedures

### If Local Branch Gets Corrupted

```bash
# Delete local branch
git branch -D corrupt-branch

# Fetch from remote
git fetch origin

# Recreate from remote
git checkout -b corrupt-branch origin/corrupt-branch
```

### If You Need to Restore from Backup

```bash
# List backups
git branch -a | grep backup

# Create new branch from backup
git checkout -b recover-branch backup/feature_version_1_20251111
```

## Current Setup Status

✅ **Repository optimized** with aggressive garbage collection
✅ **Automatic maintenance** enabled
✅ **Backup branch** created: `backup/feature_version_1_20251111`
✅ **Development branch** ready: `develop`
✅ **FSMonitor** enabled for faster operations
✅ **Repository integrity** verified - no corruption detected

## Recommended Next Steps

1. **Use `develop` branch** for all new work
2. **Create feature branches** for specific features
3. **Commit and push regularly** (at least daily)
4. **Create weekly backups** every Monday
5. **Run health check** monthly: `git fsck --full`

## Need Help?

If you encounter any issues:

1. Check branch status: `git status`
2. View branches: `git branch -a`
3. Check integrity: `git fsck --full`
4. Contact support with the output of above commands

---

**Last Updated**: November 11, 2025
**Repository**: https://github.com/AnilAlapati/switchCV
