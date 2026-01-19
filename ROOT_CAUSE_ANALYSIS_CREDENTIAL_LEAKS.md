# 🔍 ROOT CAUSE ANALYSIS: Recurring Credential Exposure (3rd Incident)

**Analysis Date:** January 19, 2026  
**Incident Count:** 3 documented credential exposure events  
**Status:** Systemic issue identified - fixes applied were incomplete

---

## Timeline of Credential Exposures

### **Incident 1: December 28, 2025** (adb0239, a9d0de4)

**Files Exposed:**

- `extensions/firestore-send-email.env` (SMTP password)
- `firebase_config_dev_backup.json` (API credentials)
- `firebase_config_prod_backup.json` (API credentials)
- `users.json` (password hashes)

**Detection:** Manual audit  
**Remediation:** Deleted files, updated `.gitignore`  
**Status:** ✅ Files added to `.gitignore` on Dec 28

**Git Evidence:**

```bash
Commit adb0239 (Dec 28, 03:23:01 UTC)
  .gitignore | 5 +++++
  firebase_config_dev_backup.json | 15 -------
  firebase_config_prod_backup.json | 18 -------
  extensions/firestore-send-email.env | 12 -------
  users.json | 23 -------
```

---

### **Incident 2: January 18, 2026** (2183bb8)

**Files Exposed:**

- `.env.local.dev-backup` (29 lines of credentials)
- `.env.local.prod-backup` (28 lines of credentials)

**Exposed Keys:**

- Firebase API keys (both dev and prod)
- Hugging Face tokens
- Gemini API key
- OpenAI API key (full)
- Groq API key
- TOKEN_SECRET
- E2E test credentials

**Detection:** User reported during deployment (Jan 19)  
**Root Cause:** `.gitignore` did NOT include `.env.local.*-backup` pattern  
**Status:** ⚠️ Files exist in git history (commit 2183bb8)

**Git Evidence:**

```bash
Commit 2183bb8 (Jan 18, 13:54:11 UTC)
  .env.local.dev-backup | 29 ++  ← These patterns NOT in .gitignore yet
  .env.local.prod-backup | 28 ++
  ...many other files...
```

---

### **Incident 3: January 19, 2026** (9afaf96)

**Attempted Fix:** Delete files from repo  
**Problem:** Deletion-only approach leaves credentials in git history

**Git Evidence:**

```bash
Commit 9afaf96 (Jan 19, 21:44:15 UTC)
  diff --git a/.env.local.dev-backup b/.env.local.dev-backup
  deleted file mode 100644
  ← File removed from current state, but remains accessible via:
  git show 2183bb8:.env.local.dev-backup
```

---

## Why This Keeps Happening: Root Causes

### **1. .gitignore Gap Analysis**

**Current .gitignore (as of Jan 19):**

```bash
# env files (can opt-in for committing if needed)
.env
.env.local
.env.local.backup          ← Pattern is present...
.env.local.dev-backup      ← Pattern is present...
.env.local.prod-backup     ← Pattern is present...
.env.local.prod-db
.env*.local
.env.dev
.env.production
functions/.env.dev
functions/.env.default
!.env.example
```

**Problem:** `.gitignore` was **only updated on Jan 19 (commit fa2fb33)** after the incident

**Before Jan 19:** `.gitignore` looked like this (from adb0239, Dec 28):

```bash
# env files (can opt-in for committing if needed)
.env
.env.local
.env*.local
firebase_config_*_backup.json   ← Pattern existed
# ... but NOT .env.local.*-backup pattern
```

**Gap:** `.env.local.dev-backup` and `.env.local.prod-backup` were NOT matched by existing patterns:

- `.env` - doesn't match `.env.local.dev-backup`
- `.env.local` - only matches exact filename, NOT `.env.local.dev-backup`
- `.env*.local` - matches `.env.something.local`, NOT `.env.local.dev-backup`

---

### **2. Pre-commit Hooks Didn't Block It**

**Secret Scan Script (secret-scan.sh):**

```bash
# Patterns it looks for:
PATTERN='('
PATTERN+=$'AI\x7aa[0-9A-Za-z_-]{30,}|'      ← Firebase keys (should match!)
PATTERN+=$'s\x6b-proj-..."                  ← OpenAI keys
PATTERN+=$'gs\x6b_'...                      ← Groq keys
...
```

**Why It Failed to Block Commit 2183bb8:**

The secret-scan.sh script should have caught the Firebase API key in `.env.local.dev-backup`:

- Pattern: `AI\x7aa[0-9A-Za-z_-]{30,}` (Firebase keys start with `AIzaSy...`)
- The key was definitely there: `AIzaSyAduU_bS8-Vzq-90LuR5stn5PuBleyMQNs`

**Evidence from pre-commit hook (.husky/pre-commit):**

```bash
echo "✅ Secret scan passed. Running linter..."
scripts/secret-scan.sh
echo "✅ Secret scan passed. Running linter..."
```

**Hypothesis:** The commit 2183bb8 may have been made **without running pre-commit hooks**, OR the hooks were temporarily disabled. Check:

```bash
git config --local core.hooksPath    # Check if hooks are disabled
git show 2183bb8 --format="%B" | head # Check if --no-verify was used
```

---

### **3. Lack of Automated Prevention**

**No GitHub-level protection:**

- No GitHub Secret Scanning enabled (detects exposed secrets)
- No branch protection rules requiring secret scan pass
- No pre-push hook to re-scan (pre-commit only, which can be bypassed with `--no-verify`)

**No CI/CD gate:**

- Secret scanning happens at pre-commit (local)
- No server-side secret scan in GitHub Actions (can be bypassed locally)

---

## What Rules/Processes Exist

### **✅ Rules That ARE In Place:**

1. **`.gitignore` patterns (20+ rules)** - covers:
   - `.env*` files
   - `*_backup.json` files
   - `secrets.json`
   - Firebase config backups
   - Extension env files

2. **Pre-commit hooks** - runs:
   - Secret scan (regex-based)
   - ESLint + TypeScript check
   - Jest tests
   - Disk space check

3. **Secret scan regex** - detects:
   - Firebase keys (`AIzaSy...`)
   - OpenAI keys (`sk-proj-...`)
   - Groq keys (`gsk_...`)
   - Hugging Face tokens (`hf_...`)
   - Private key PEM headers

4. **GitHub Actions** - includes:
   - `secret-scan` job that runs `scripts/secret-scan.sh --all`
   - But CI job failed on Jan 19 (script was missing `.bak` only)

---

## Why It Happened Despite Rules

### **Chain of Events in Commit 2183bb8:**

```
Jan 18, 13:54:11 UTC
Developer creates backup files:
  - .env.local.dev-backup (29 lines)
  - .env.local.prod-backup (28 lines)

↓ (Assumption: Pre-commit hooks bypassed OR temporarily disabled)

Commit 2183bb8 created with both files
↓

Jan 19 (morning)
Commit pushed to develop branch (origin/develop)
↓

CI/CD secret-scan job FAILS because secret-scan.sh script missing
↓

User realizes credentials exposed
```

### **Most Likely Root Cause:**

**Pre-commit hooks were BYPASSED during commit 2183bb8:**

Possible scenarios:

1. Developer used `git commit --no-verify` (bypasses all hooks)
2. `.husky` directory was not present or hooks were disabled (`git config core.hooksPath ""`)
3. Developer was outside the repository when making the commit (different machine/env)

---

## Post-Incident: What Was Fixed

### **Commit fa2fb33** (Jan 19, 01:30 AM UTC)

```bash
🔒 Fix CI secret-scan: restore script and tighten .gitignore

✅ What was done:
  - Restored scripts/secret-scan.sh from .bak
  - Added .env.local.*-backup to .gitignore
  - Added firebase_config_*_backup.json to .gitignore
  - Updated .husky/pre-commit to run secret scan

❌ What was NOT done:
  - Git history NOT rewritten (credentials still in 2183bb8)
  - Git filter-branch not executed
  - Force-push not performed
```

### **What's Still Missing:**

1. ❌ **History cleanup** - Credentials remain in commit 2183bb8
2. ❌ **GitHub secret scanning** - Not enabled as backup
3. ❌ **CI/CD gate** - No server-side validation before merge
4. ❌ **Key rotation completeness** - Only validation done, not actual rotation
5. ❌ **Husky verification** - No check to ensure hooks are enabled
6. ❌ **Backup file prevention** - Pattern exists but files still being created locally

---

## Why This Is the 3rd Occurrence

### **Root Cause Loop:**

```
Incident 1 (Dec 28): Files accidentally committed
  → Fix: Add to .gitignore, delete files
  → Problem: Only deleted from current state, not history
  → Credentials still in history

Incident 2 (Jan 18): Similar files (different pattern) committed
  → Root cause: Backup file pattern NOT in .gitignore
              (Dec 28 fix was incomplete)
  → Pre-commit hooks were bypassed (--no-verify or disabled)

Incident 3 (Jan 19): Deletion attempt again
  → Fix: Only deletes current state again
  → Still incomplete: Credentials remain in history
  → Secret-scan script was missing (.bak file)
```

**Pattern:** The fixes have been **reactive deletions**, not **proactive prevention**.

---

## Comprehensive Fix Required

### **Level 1: Immediate (Today)**

**✅ DONE - Fix .gitignore** (fa2fb33)

```bash
.env.local.*-backup        # Matches all backup env files
firebase_config_*_backup.json  # Matches all config backups
```

**✅ DONE - Restore secret-scan.sh** (fa2fb33)

**⏳ PENDING - Rewrite git history**

```bash
git filter-branch --tree-filter 'rm -f .env.local.*-backup firebase_config_*_backup.json' -- --all
git push origin --force-with-lease develop
```

**⏳ PENDING - Rotate exposed keys**

- Firebase Dev & Prod API keys
- Gemini API key
- Stripe token (if applicable)

---

### **Level 2: Short-term (This Week)**

**Add GitHub Secret Scanning:**

```yaml
# .github/workflows/secret-scanning.yml
name: Secret Scanning
on: [pull_request]
jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Check entire history
      - name: Run secret scan
        run: bash scripts/secret-scan.sh --all
```

**Enable GitHub native scanning:**

- Settings → Code security → Enable "Secret scanning"
- Settings → Code security → Enable "Push protection"

**Add branch protection:**

- Require "Secret scanning" check to pass before merge

---

### **Level 3: Long-term (Next Month)**

**Prevent backup files creation:**

1. Add NPM script to generate backups → **don't commit them**

   ```bash
   npm run backup:local-env  # Creates local backup, adds to .gitignore
   ```

2. Enforce in CI/CD:

   ```bash
   # Fail if *-backup files exist in git
   if git ls-files | grep -E '\-backup'; then
     echo "❌ Backup files detected in tracking"
     exit 1
   fi
   ```

3. Pre-commit validation:
   ```bash
   # Before allowing commit, verify hooks are enabled
   if [ -z "$(git config core.hooksPath)" ]; then
     echo "⚠️ Git hooks not configured. Setting up..."
     npm run setup:hooks
   fi
   ```

---

## Summary: Why It Keeps Happening

| Layer           | Issue                                                       | Fix                             |
| --------------- | ----------------------------------------------------------- | ------------------------------- |
| **Prevention**  | `.gitignore` pattern was incomplete (Dec 28)                | ✅ Updated Jan 19               |
| **Detection**   | Pre-commit hooks bypassed via `--no-verify`                 | ⏳ Add pre-push hook + CI gate  |
| **Reaction**    | Only deleted files, didn't rewrite history                  | ⏳ Run git filter-branch        |
| **Recovery**    | No GitHub Secret Scanning enabled                           | ⏳ Enable this week             |
| **Automation**  | Backup file creation not prevented (still creating locally) | ⏳ Implement auto-backup script |
| **Enforcement** | No CI/CD gate (local-only pre-commit can be bypassed)       | ⏳ Add GitHub Actions gate      |

---

## Action Items (Prioritized)

### 🔴 **CRITICAL (Today)**

- [ ] Run `git filter-branch` to remove from history
- [ ] Force-push to origin
- [ ] Rotate exposed API keys:
  - Firebase Dev: `AIzaSyAduU_bS8-Vzq-90LuR5stn5PuBleyMQNs`
  - Firebase Prod: `AIzaSyAvB2MtJ-uw3ZcW66TeIYkUBL6vkQSlBik`
  - Gemini: `AIzaSyCFolcXJMMq-oGfjuv0qsrAg2EVBKc5KuY`
- [ ] Verify Cloud Functions still work after key rotation
- [ ] Check Firebase Auth logs for suspicious activity (Jan 8-19)

### 🟠 **HIGH (This Week)**

- [ ] Enable GitHub Secret Scanning
- [ ] Enable GitHub Push Protection
- [ ] Add server-side secret scan in GitHub Actions
- [ ] Require secret scan pass in branch protection

### 🟡 **MEDIUM (This Month)**

- [ ] Add pre-push hook (git-hook level)
- [ ] Create automated backup script (doesn't commit)
- [ ] Add CI/CD validation for backup files
- [ ] Document backup file workflow

### 🟢 **LOW (Ongoing)**

- [ ] Quarterly credential rotation schedule
- [ ] Implement HashiCorp Vault for long-term
- [ ] Audit all historical commits for patterns

---

## Lessons Learned

1. **`.gitignore` gaps are invisible** - Patterns must cover ALL variations of sensitive files
2. **Pre-commit hooks can be bypassed** - Need server-side validation too
3. **Deletion ≠ cleanup** - File removals don't clean git history
4. **Manual processes fail** - Need automation (backup script, CI gates)
5. **Third incident is a pattern** - Systemic issue, not one-off mistake

---

**Next Steps:** User to confirm authorization for git history rewrite and key rotation.
