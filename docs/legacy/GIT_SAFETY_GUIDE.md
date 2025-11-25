# Git Repository Safety Guide

## 🚨 Root Causes of Your Git Corruption

Based on the investigation, your repository corruption was caused by:

### 1. **Low Disk Space (92-93% full)**

- Git needs temporary space to create objects
- At >90% capacity, write operations can fail mid-process
- This leaves partial/corrupted objects in the repository

### 2. **Bus Error During fsck**

- Indicates possible RAM issues or disk I/O problems
- May be related to low memory when combined with low disk space

### 3. **Corrupted Backup File**

- `documents/backups/create-resume-page.original.tsx` had a bad object
- File couldn't be read or hashed, corrupting the index

## 🛡️ Permanent Solutions Implemented

### A. Pre-Commit Health Checks

**Script 1: `scripts/git-health-check.sh`**

```bash
./scripts/git-health-check.sh
```

Checks:

- ✓ Disk space (warns if >90%)
- ✓ Lock files
- ✓ Repository integrity
- ✓ Large files
- ✓ Memory availability
- ✓ Repository statistics

**Script 2: `scripts/safe-commit.sh`**

```bash
./scripts/safe-commit.sh "Your commit message"
```

- Runs health checks before committing
- Prevents commits when disk >90% full
- Removes stale lock files automatically
- Shows preview of changes

### B. Git Configuration Updates

Applied safer settings:

```bash
core.fsyncObjectFiles = true   # Ensures writes are synced to disk
core.preloadIndex = true       # Better performance
core.fscache = true           # Caches file system calls
```

### C. GitHub Actions Workflow

Added `.github/workflows/verify-repo-health.yml`:

- Runs weekly repository health checks
- Validates integrity on every push
- Detects large files automatically
- Checks for broken refs

### D. Git Attributes File

Created `.gitattributes`:

- Ensures consistent line endings
- Marks binary files correctly
- Prevents text/binary conversion issues

## 📋 Best Practices Going Forward

### Before Every Commit:

1. **Run health check:**

   ```bash
   ./scripts/git-health-check.sh
   ```

2. **Use safe commit script:**

   ```bash
   ./scripts/safe-commit.sh "your message"
   ```

3. **OR manually check disk space:**
   ```bash
   df -h .
   ```
   If >90%, free up space first!

### Regular Maintenance:

1. **Weekly: Optimize repository**

   ```bash
   git gc --aggressive
   git prune
   ```

2. **Monthly: Deep health check**

   ```bash
   git fsck --full
   ```

3. **Keep disk usage below 85%**
   - Delete old Docker images
   - Clear node_modules in unused projects
   - Empty trash
   - Remove old Xcode derived data

### When Corruption Happens:

1. **Don't panic - your code is safe on GitHub**

2. **Quick recovery:**

   ```bash
   # Backup work in progress
   cp -r project_dir ../project_backup

   # Fresh clone
   git clone repo_url project_dir_new

   # Restore uncommitted work
   cp -r ../project_backup/specific_files project_dir_new/
   ```

3. **Report issues immediately so we can investigate**

## 🎯 Critical Rules

❌ **NEVER commit when:**

- Disk is >90% full
- System is under heavy memory pressure
- `.git/index.lock` exists (stale lock)

✅ **ALWAYS:**

- Check disk space before large operations
- Commit small, frequent changes
- Push regularly to remote
- Keep local backups of uncommitted work

## 🔧 Quick Commands Reference

```bash
# Check disk space
df -h .

# Remove lock files
rm -f .git/index.lock

# Quick integrity check
git fsck --no-full

# Optimize repository
git gc

# Repository statistics
git count-objects -vH

# Safe commit (use our script)
./scripts/safe-commit.sh "message"
```

## 📊 System Health Monitoring

Check these regularly:

```bash
# Disk space
df -h

# Memory (macOS)
vm_stat

# Git repo size
du -sh .git

# Large files in history
git rev-list --objects --all | \
  git cat-file --batch-check='%(objectsize) %(rest)' | \
  sort -rn | head -20
```

## 🆘 Emergency Recovery

If corruption happens again:

```bash
# 1. Stop all operations
# 2. Run this:
cd ~/Documents/Apps
cp -r SwitchCV_V2 SwitchCV_V2_backup_$(date +%Y%m%d_%H%M%S)
cd SwitchCV_V2
git fetch --all
git reset --hard origin/$(git branch --show-current)

# 3. If that fails:
cd ~/Documents/Apps
mv SwitchCV_V2 SwitchCV_V2_corrupted
git clone -b feature/Nov_15 https://github.com/AnilAlapati/switchCV.git SwitchCV_V2
# Restore uncommitted work from backup
```

## 📝 What Changed This Time

- ✅ Added health check automation
- ✅ Safe commit wrapper script
- ✅ Git configuration hardened
- ✅ CI/CD health monitoring
- ✅ Proper .gitattributes for file types
- ✅ Documentation for prevention

**Use the health check script before every commit from now on!**
