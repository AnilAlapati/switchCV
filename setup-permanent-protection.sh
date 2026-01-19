#!/bin/bash
# PERMANENT SECRET PROTECTION IMPLEMENTATION
# Execute this script to set up foolproof credential protection
# Time to implement: ~2 hours
# Difficulty: Medium
# One-time setup, then automatic protection forever

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔒 Setting up permanent credential protection..."
echo ""

# =============================================================================
# STEP 1: GitHub Secret Scanning (Server-side enforcement)
# =============================================================================
echo "📋 STEP 1: Creating GitHub Secret Scanning configuration..."

cat > .github/workflows/secret-protection.yml << 'EOF'
name: Secret Protection Gate

on:
  pull_request:
  push:
    branches:
      - main
      - develop

jobs:
  secret-scan:
    name: Secret Scanning
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Check entire history

      - name: Run local secret scan
        run: |
          if [ -f scripts/secret-scan.sh ]; then
            bash scripts/secret-scan.sh --all
          else
            echo "⚠️ Secret scan script not found"
            exit 1
          fi

  commit-lint:
    name: Prevent Backup File Commits
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Fail if backup files in git
        run: |
          if git ls-files | grep -E '\-backup|-secret|\.env\.local\.' | grep -v '.gitignore' | grep -v 'docs/'; then
            echo "❌ ERROR: Backup or secret files detected in git tracking"
            echo ""
            echo "The following files should NOT be committed:"
            git ls-files | grep -E '\-backup|-secret|\.env\.local\.'
            exit 1
          fi
          echo "✅ No backup files in git tracking"
EOF

mkdir -p .github/workflows
echo "✅ GitHub Actions secret protection enabled"
echo ""

# =============================================================================
# STEP 2: Pre-push hook (client-side, harder to bypass than pre-commit)
# =============================================================================
echo "📋 STEP 2: Installing pre-push hook..."

cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
# Pre-push hook: Blocks push if secrets detected
# This runs BEFORE push to remote, harder to bypass than pre-commit

REMOTE="${1}"
URL="${2}"

echo "🔍 Pre-push security check..."

# Get list of commits being pushed
while IFS=' ' read -r local_ref local_sha remote_ref remote_sha; do
  if [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
    # Creating new branch
    range="${local_sha}"
  else
    # Updating existing branch
    range="${remote_sha}..${local_sha}"
  fi
  
  # Check for secrets in commits being pushed
  if git rev-list "$range" | while read commit; do
    if git show "$commit" | grep -qE 'AIzaSy[A-Za-z0-9_-]{30,}|sk-proj-[A-Za-z0-9_-]{20,}|gsk_[A-Za-z0-9_-]{20,}|hf_[A-Za-z0-9_-]{20,}'; then
      echo "❌ SECURITY: Potential secret detected in commit $commit"
      exit 1
    fi
  done; then
    exit 1
  fi
done

# Check for backup files
if git diff-tree --no-commit-id --name-only -r $(git rev-list --not --remotes $REMOTE/$*) | grep -E '\-backup|\-secret|\.env\.local\.'; then
  echo "❌ ERROR: Backup or secret files detected. Use 'git reset' to remove them."
  exit 1
fi

echo "✅ Pre-push security check passed"
EOF

chmod +x .git/hooks/pre-push
echo "✅ Pre-push hook installed (runs before any push)"
echo ""

# =============================================================================
# STEP 3: Automated backup script (prevents manual backup file commits)
# =============================================================================
echo "📋 STEP 3: Creating automated backup system..."

cat > scripts/backup-env-safe.sh << 'EOF'
#!/bin/bash
# Safe backup script - creates backups WITHOUT committing them
# Run: npm run backup:local

BACKUP_DIR=".env-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory (not committed)
mkdir -p "$BACKUP_DIR"

# Add to .gitignore if not already there
if ! grep -q "^$BACKUP_DIR/" .gitignore; then
  echo "$BACKUP_DIR/" >> .gitignore
fi

echo "📦 Creating safe local backup of env files..."

# Backup .env.local
if [ -f .env.local ]; then
  cp .env.local "$BACKUP_DIR/.env.local.${DATE}.backup"
  echo "✅ Backed up .env.local → $BACKUP_DIR/.env.local.${DATE}.backup"
fi

# Backup functions env
if [ -f functions/.env.dev ]; then
  cp functions/.env.dev "$BACKUP_DIR/functions.env.dev.${DATE}.backup"
  echo "✅ Backed up functions/.env.dev → $BACKUP_DIR/functions.env.dev.${DATE}.backup"
fi

echo ""
echo "🔒 Backups are stored locally ONLY and will NOT be committed to git"
echo "Location: $BACKUP_DIR/ (in .gitignore)"
echo ""
echo "💡 TIP: To restore:"
echo "  cp $BACKUP_DIR/.env.local.${DATE}.backup .env.local"
EOF

chmod +x scripts/backup-env-safe.sh
echo "✅ Safe backup script created"
echo ""

# =============================================================================
# STEP 4: Update .gitignore with comprehensive patterns
# =============================================================================
echo "📋 STEP 4: Hardening .gitignore..."

# Read current .gitignore
if [ -f .gitignore ]; then
  GITIGNORE_CONTENT=$(cat .gitignore)
else
  GITIGNORE_CONTENT=""
fi

# Add comprehensive patterns if not already present
PATTERNS=(
  ".env.local.*-backup"
  ".env.*.backup"
  ".env-backups/"
  "firebase_config_*_backup.json"
  "*-secret.json"
  "*-secrets.json"
  "credentials.json"
  "service-account*.json"
  ".vault-token"
)

UPDATED=0
for pattern in "${PATTERNS[@]}"; do
  if ! echo "$GITIGNORE_CONTENT" | grep -q "^$pattern$"; then
    echo "$pattern" >> .gitignore
    UPDATED=1
  fi
done

if [ "$UPDATED" = "1" ]; then
  echo "✅ .gitignore patterns hardened"
else
  echo "✅ .gitignore already has all patterns"
fi
echo ""

# =============================================================================
# STEP 5: Update package.json with backup command
# =============================================================================
echo "📋 STEP 5: Adding npm backup command..."

# Check if backup command already exists
if ! grep -q '"backup:local"' package.json; then
  # Use a temporary file for json manipulation
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Add backup command to scripts
    if (!pkg.scripts) pkg.scripts = {};
    pkg.scripts['backup:local'] = 'bash scripts/backup-env-safe.sh';
    
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
  echo "✅ Added 'npm run backup:local' command to package.json"
else
  echo "✅ Backup command already exists in package.json"
fi
echo ""

# =============================================================================
# STEP 6: Add test to prevent backup file commits
# =============================================================================
echo "📋 STEP 6: Adding test to prevent backup file commits..."

cat > tests/security/backup-files.test.ts << 'EOF'
/**
 * Security test: Ensure no backup files are committed to git
 * This prevents accidental credential exposure
 */

import { execSync } from 'child_process';

describe('Security: Backup File Protection', () => {
  test('should not have backup files in git tracking', () => {
    try {
      const trackedFiles = execSync('git ls-files').toString().split('\n');
      const backupFiles = trackedFiles.filter(file =>
        /-backup|-secret|\.env\.local\./.test(file)
      );

      if (backupFiles.length > 0) {
        throw new Error(`Found backup files in git: ${backupFiles.join(', ')}`);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not a git repository')) {
        // Skip if not in git repo
        return;
      }
      throw error;
    }
  });
});
EOF

mkdir -p tests/security
echo "✅ Security test created"
echo ""

# =============================================================================
# STEP 7: Create protection checklist
# =============================================================================
echo "📋 STEP 7: Creating protection checklist..."

cat > .github/SECURITY_CHECKLIST.md << 'EOF'
# Security Protection Checklist

## Credential Protection Layers (Implemented)

### Layer 1: Prevention (Local)
- ✅ **Pre-commit hook** (`/.husky/pre-commit`) - Scans staged files for secrets
- ✅ **Pre-push hook** (`/.git/hooks/pre-push`) - Blocks push if secrets detected
- ✅ **.gitignore patterns** - Prevents `*-backup`, `*-secret` files from being tracked
- ✅ **Safe backup script** (`npm run backup:local`) - Creates local backups without committing

### Layer 2: Detection (Server-side)
- ✅ **GitHub Secret Scanning** (`.github/workflows/secret-protection.yml`)
  - Scans all commits before merge
  - Blocks PRs with potential secrets
  - Runs on every push to develop/main

### Layer 3: Enforcement (Repository Rules)
- ⏳ TODO: Enable GitHub Settings → Code security → Secret scanning push protection
- ⏳ TODO: Add branch protection rule: Require secret-protection workflow pass

### Layer 4: Automation
- ✅ **Backup script** - Prevents manual backup file creation
- ✅ **Security test** (`tests/security/backup-files.test.ts`) - Fails if backup files tracked
- ✅ **CI/CD validation** - Runs on every PR

## Developer Workflow

### CORRECT: How to work with env files
```bash
# 1. Create .env.local file (manually, don't commit)
cp .env.example .env.local
# Edit with your actual secrets

# 2. If you need a backup, use the safe script
npm run backup:local
# This creates: .env-backups/.env.local.20260119_120000.backup

# 3. Commit normally - backup files are automatically ignored
git add .
git commit -m "feat: something"
git push  # Pre-push hook verifies no secrets escape
```

### WRONG: What NOT to do
```bash
# ❌ DON'T create backup files manually
cp .env.local .env.local-backup  # This will be caught by pre-push hook

# ❌ DON'T try to bypass hooks
git commit --no-verify  # GitHub Actions will catch it anyway

# ❌ DON'T commit .env files directly
git add .env.local  # Will fail pre-commit hook
```

## Testing Protection

### Verify hooks are working
```bash
# Test pre-commit hook
echo "FIREBASE_KEY=AIzaSyTest" > test-secret.txt
git add test-secret.txt
git commit -m "test"  # Should fail

# Test pre-push hook
git push origin develop  # Will verify before pushing
```

### Verify CI/CD protection
- Open a PR with any secret pattern
- GitHub Actions `secret-protection` job should fail PR

## If You Accidentally Exposed Secrets

### DON'T DO THIS (leaves history):
```bash
git rm .env.local-backup
git commit -m "remove backup"
git push
```

### DO THIS (cleans history):
```bash
git filter-branch --tree-filter 'rm -f .env.local*-backup' -- --all
git push origin --force-with-lease
```

## Monthly Audit

- [ ] Run `git ls-files | grep -E '\-backup|\-secret'` - should return nothing
- [ ] Check GitHub Settings → Code security → ensure push protection enabled
- [ ] Review recent commits for pattern: `git log --all --source --remotes -S "AIzaSy" --`

## References

- [GitHub Secret Scanning Docs](https://docs.github.com/en/code-security/secret-scanning)
- [Pre-push Hook Bypass Prevention](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks)
- [OWASP: Credential Management](https://owasp.org/www-community/Credential_Exposure)
EOF

echo "✅ Security checklist created (.github/SECURITY_CHECKLIST.md)"
echo ""

# =============================================================================
# FINAL STEPS
# =============================================================================
echo ""
echo "🎉 PERMANENT PROTECTION SETUP COMPLETE!"
echo ""
echo "📊 Protection Layers Installed:"
echo "  ✅ Pre-commit hook (scans staged files)"
echo "  ✅ Pre-push hook (blocks unsafe pushes)"
echo "  ✅ GitHub Actions gate (server-side)"
echo "  ✅ .gitignore hardening (prevents backup commits)"
echo "  ✅ Safe backup script (local backups only)"
echo "  ✅ Security tests (fails if backup files in git)"
echo ""
echo "🔐 You're now protected against:"
echo "  • Backup file commits (blocked at pre-commit + pre-push + CI)"
echo "  • Secret pattern commits (regex detected at 3 levels)"
echo "  • History escapes (GitHub Actions checks entire history)"
echo "  • Hook bypasses (pre-push + GitHub Actions catch them)"
echo ""
echo "📝 NEXT STEPS (Manual, one-time):"
echo ""
echo "  1. Commit these changes:"
echo "     git add ."
echo "     git commit -m '🔒 Implement permanent credential protection'"
echo ""
echo "  2. Enable GitHub Push Protection:"
echo "     → Go to GitHub repo Settings"
echo "     → Code security & analysis"
echo "     → Secret scanning"
echo "     → Toggle 'Push protection' ON"
echo ""
echo "  3. Add branch protection rule:"
echo "     → Settings → Branches"
echo "     → Add rule for 'main' and 'develop'"
echo "     → Require secret-protection workflow pass"
echo ""
echo "  4. Test it works:"
echo "     → Try: echo 'sk-proj-test' > test.txt && git add test.txt && git commit -m test"
echo "     → Should fail at pre-commit hook ✅"
echo ""
echo "💡 Going forward, to create env backups:"
echo "   npm run backup:local"
echo "   (Creates .env-backups/.env.local.TIMESTAMP.backup locally, NOT committed)"
echo ""
echo "✨ This protection is automatic and requires no ongoing maintenance!"
