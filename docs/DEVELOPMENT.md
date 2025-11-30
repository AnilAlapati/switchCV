# SwitchCV Development Guide

**Last Updated:** November 30, 2025

Complete guide for local development, deployment automation, and workflow management.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Development Mode](#development-mode)
3. [Environment Setup](#environment-setup)
4. [Deployment Guide](#deployment-guide)
5. [Workflow & Git](#workflow--git)

---

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode (uses real Firebase)
npm run dev

# Run with enterprise tier override
npm run dev:enterprise

# Run with enterprise tier + recruiter role
npm run dev:enterprise:recruiter

# Run tests
npm run test

# Build for production
npm run build
```

---

## Development Mode

### Overview

SwitchCV includes a **dev mode override system** that allows developers to bypass subscription tier and role restrictions during local development, while still using **real Firebase and real LLM APIs**.

> ⚠️ **Production Safety**: Dev mode is **impossible to enable in production**. The code has a hard block: `NODE_ENV !== "production"` must be true for any overrides to work.

### Available Scripts

| Command                            | Tier Override | Role Override | Use Case                |
| ---------------------------------- | ------------- | ------------- | ----------------------- |
| `npm run dev`                      | None          | None          | Production-like testing |
| `npm run dev:enterprise`           | Enterprise    | None          | Full tier, real role    |
| `npm run dev:enterprise:recruiter` | Enterprise    | Recruiter     | Full recruiter access   |
| `npm run dev:enterprise:jobseeker` | Enterprise    | Jobseeker     | Full jobseeker access   |
| `npm run dev:premium`              | Premium       | None          | Premium tier testing    |
| `npm run dev:basic`                | Basic         | None          | Basic tier limitations  |

### Environment Variables

```bash
# Required to enable dev mode
NEXT_PUBLIC_DEV_MODE=true

# Optional: Override subscription tier
NEXT_PUBLIC_DEV_TIER=enterprise  # or: basic, premium

# Optional: Override user role
NEXT_PUBLIC_DEV_ROLE=recruiter   # or: jobseeker, admin
```

### What Gets Overridden vs What Stays Real

#### ✅ Always REAL (unchanged)

- **Firebase Auth**: Real login, real user accounts
- **Firestore Data**: Real database reads/writes
- **Resume Operations**: Create, edit, delete — all real
- **LLM Calls**: Real Gemini API for AI features
- **Search Results**: Real resume data from Firestore
- **Analytics/Logging**: Real tracking and audit logs

#### 🔄 BYPASSED (permission checks only)

- **Tier Check**: Return override value instead of Firestore lookup
- **Role Check**: Return override value instead of Firestore lookup
- **Quota Check**: Skip (unlimited)
- **Premium UI Features**: Enabled for premium/enterprise

### Visual Indicator

When dev mode is active, a floating badge appears in the **bottom-right corner**:

```
┌─────────────────┐
│ 🔧 DEV MODE     │
├─────────────────┤
│ Tier: ENTERPRISE│
│ Role: RECRUITER │
└─────────────────┘
```

### Cloud Functions (Firebase Emulator)

For AI Search and other Cloud Functions, create `functions/.env.local`:

```bash
# Enable dev bypass (only works in emulator)
DEV_BYPASS_CHECKS=true

# Required for AI features
GEMINI_API_KEY=your_api_key
```

Then run:

```bash
firebase emulators:start --only functions
```

### AI Search Providers

Toggle between legacy and Firestore vector search:

```bash
# Default: firestore-vector
AI_SEARCH_PROVIDER=firestore-vector   # or: legacy
```

- `firestore-vector` (default): Uses Firestore's `findNearest` vector index for low-latency, million-scale searches
- `legacy`: Falls back to scanning up to 500 recent resumes and computing cosine similarity inside the Cloud Function

### Subscription Tiers Reference

| Feature          | Basic      | Premium  | Enterprise |
| ---------------- | ---------- | -------- | ---------- |
| Resume Creation  | 1          | 50       | Unlimited  |
| Resume Editing   | ❌         | ✅       | ✅         |
| Resume Retention | 7 days     | Forever  | Forever    |
| AI Search        | ❌         | 50/month | Unlimited  |
| Contact Requests | 2 lifetime | 50/month | Unlimited  |

### User Roles Reference

| Role          | Capabilities                                    |
| ------------- | ----------------------------------------------- |
| **jobseeker** | Create/manage own resume, view profile          |
| **recruiter** | Search resumes, request contact info, AI search |
| **admin**     | All recruiter features + admin dashboard        |

### Troubleshooting

#### Dev mode not working?

1. Check that you're using the right script: `npm run dev:enterprise`
2. Verify the banner appears in bottom-right corner
3. Check console for `[DEV MODE]` log messages

#### Overrides not applying?

1. Restart the dev server after changing env vars
2. Ensure `NEXT_PUBLIC_DEV_MODE=true` is set
3. Check that tier/role values are valid

#### Cloud Function bypass not working?

1. Must be running in Firebase emulator
2. Create `functions/.env.local` with `DEV_BYPASS_CHECKS=true`
3. Restart emulator after adding env file

#### Need precise Firestore permission errors?

1. **Turn on verbose logs** by setting `NEXT_PUBLIC_FIREBASE_DEBUG_LOGS=true` in `.env.local`
2. **Point the app at local emulators** by adding:

```bash
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1
NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT=8080
NEXT_PUBLIC_AUTH_EMULATOR_PORT=9099
```

3. Run `firebase emulators:start --only auth,firestore`
4. Restart `npm run dev` and reproduce the issue

---

## Environment Setup

### Create Development Project

#### 1. Create Project (Manual Step)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Name it `switchcv-dev`
4. Disable Google Analytics (optional)
5. Click **"Create project"**

#### 2. Enable Services (Manual Step)

**Authentication:**

- Go to Build → Authentication → Get Started
- Enable **Email/Password** and **Google**
- Go to **Settings** → **Authorized domains**
- Add `localhost`

**Firestore Database:**

- Go to Build → Firestore Database → Create Database
- Choose **nam5 (us-central)** location
- Start in **Production mode**

**Storage:**

- Go to Build → Storage → Get Started
- Start in **Production mode**

#### 3. Run the Setup Script

```bash
npm run setup:dev
```

This script will:

1. Link your local code to the new `switchcv-dev` project
2. Deploy your Firestore Rules and Indexes
3. Deploy your Cloud Functions
4. Initialize the system counters
5. Seed the resume templates

#### 4. Final Config

1. **Upgrade to Blaze:** Project Settings → Usage and Billing → Modify Plan → **Blaze**
2. **API Keys:**
   - Create `.env.dev` file (copy from `.env.local`)
   - Update `NEXT_PUBLIC_FIREBASE_PROJECT_ID` to `switchcv-dev`
   - Ensure `functions/.env.dev` contains `WEBSITE_URL=http://localhost:3000`

#### 5. Switching Environments

```bash
# Work on Dev
firebase use dev

# Work on Prod
firebase use default
```

---

## Deployment Guide

> **💡 Automation Available:** You can automate these steps using GitHub Actions. See [Deployment Automation](#deployment-automation) section below.

### Pre-Deployment Checklist

#### 1. Environment Variables ⚙️

Add these to Firebase Functions configuration:

```bash
# Required for AI services
firebase functions:config:set \
  huggingface.token="YOUR_TOKEN" \
  gemini.api_key="YOUR_KEY"

# Required for email
firebase functions:config:set \
  email.service="gmail" \
  email.user="your-email@gmail.com" \
  email.password="your-app-password" \
  email.from_name="SwitchCV"

# Application settings
firebase functions:config:set \
  app.website_url="https://switchcv.com" \
  app.environment="production" \
  app.log_level="info"

# View current config
firebase functions:config:get
```

#### 2. Review Code Changes 📝

- [ ] All TypeScript files compile without errors
- [ ] No breaking changes introduced
- [ ] Backward compatibility maintained
- [ ] Documentation updated

#### 3. Test Locally (Optional) 🧪

```bash
cd functions
npm run build
firebase emulators:start --only functions
```

### Deployment Steps

#### Step 1: Deploy Firestore Indexes 📊

**Why first?** Functions will fail without proper indexes.

```bash
firebase deploy --only firestore:indexes
```

**Verify:** Check Firebase Console → Firestore → Indexes

#### Step 2: Build Functions 🔨

```bash
cd functions
npm run build
```

#### Step 3: Deploy Functions 🚀

```bash
firebase deploy --only functions
```

**Time Estimate:** 5-10 minutes

#### Step 4: Deploy Specific Function (if needed) 🎯

```bash
firebase deploy --only functions:aggregateGlobalStats
```

### Post-Deployment Verification

#### Immediate (0-5 minutes)

**1. Check Deployment Status**

```bash
firebase functions:list
```

Verify: All functions show "ACTIVE" status

**2. Check Logs**

```bash
firebase functions:log --limit 50
```

Look for:

- ✅ "Configuration loaded successfully"
- ✅ No error messages
- ⚠️ Configuration warnings (acceptable)

**3. Test HTTP Endpoints**

```bash
curl -X POST https://us-central1-switchcv-e5136.cloudfunctions.net/generateResumeContent \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "resumeData": {...}, "modelId": "gemini-1.5-flash"}'
```

Expected:

- 401 Unauthorized (if no token) ✓
- 429 Too Many Requests (if rate limited) ✓
- 200 OK (if valid request) ✓

**4. Verify Health Endpoint**

```bash
curl -s https://switchcv.com/api/health | jq
```

- ✅ `status: "ok"` indicates Firestore, Gemini, and SMTP are reachable
- Confirm the **Production Health Ping** workflow (runs every 5 minutes) is green in GitHub Actions

#### First Hour Monitoring

**1. Monitor Error Rates**

```bash
# Stream logs in real-time
firebase functions:log --tail
```

Watch for:

- Circuit breaker transitions
- Retry attempts
- Rate limit violations
- Configuration issues

**2. Check Firestore Collections**

- [ ] `rateLimits` - Rate limit tracking
- [ ] `monitoring/metrics` - Performance data
- [ ] `monitoring/alerts` - System alerts

**3. Test Rate Limiting**

Make multiple rapid requests to the same endpoint.

Expected:

- First 10 requests: Success
- 11th request: 429 Too Many Requests
- Response headers include `X-RateLimit-*`

#### First Day Monitoring

**1. Review Metrics (8 hours after deployment)**

Firebase Console → Functions → Select Function → Metrics

Check:

- [ ] Invocation count (should be normal)
- [ ] Execution time (should be improved)
- [ ] Error rate (should be <1%)
- [ ] Memory usage (should be stable)

**2. Review Alerts**

```bash
firebase firestore:get monitoring/alerts
```

Expected: No critical alerts

**3. Confirm Daily Digest**

- Ensure the **Monitoring Daily Digest** workflow ran at 09:00 UTC
- Verify the `[SWITCHCV DIGEST]` email arrived at `support@switchcv.com`

### Rollback Plan

#### If Issues Occur

**1. Immediate Rollback**

```bash
git checkout <previous-commit>
firebase deploy --only functions
```

**2. Disable Problem Function**

```bash
firebase functions:delete <functionName>
```

**3. Emergency Fix**

```bash
firebase functions:config:set security.enable_rate_limit="false"
firebase deploy --only functions
```

### Gradual Rollout Strategy

**Phase 1: Canary Deployment (10% traffic)**

1. Deploy to separate function name
2. Route 10% of traffic
3. Monitor for 24 hours

**Phase 2: Partial Rollout (50% traffic)**

1. Increase to 50%
2. Monitor for 48 hours

**Phase 3: Full Rollout (100% traffic)**

1. Switch all traffic
2. Monitor for 1 week

### Success Criteria

#### Must Have

- [ ] All functions deployed successfully
- [ ] Firestore indexes created
- [ ] No critical errors in logs
- [ ] Error rate < 1%
- [ ] No alerts triggered

#### Should Have

- [ ] Rate limiting working correctly
- [ ] Circuit breakers initialized
- [ ] Monitoring data being collected
- [ ] Configuration warnings resolved

### Troubleshooting

**Issue: "Configuration errors"**

```bash
firebase functions:config:get
firebase functions:config:set key="value"
firebase deploy --only functions
```

**Issue: "Index not found"**

```bash
firebase deploy --only firestore:indexes
# Wait 5 minutes for indexes to build
firebase deploy --only functions
```

**Issue: High error rate**

1. Check logs: `firebase functions:log`
2. Look for specific error patterns
3. Check external service status (Gemini, HuggingFace)
4. Verify environment variables
5. Consider rollback if >5% error rate

**Issue: Rate limiting too aggressive**

Edit Firestore `rateLimits` documents or adjust in code and redeploy

---

## Deployment Automation

### GitHub Actions Workflow

Every push to the `develop` branch automatically:

1. Checks out your code
2. Installs dependencies (`npm ci`)
3. Builds the Next.js application (`npm run build`)
4. Authenticates with Google Cloud using **Workload Identity Federation**
5. Deploys to Firebase Hosting & Cloud Functions

### One-Time Setup (Keyless Security)

#### 1. Enable APIs

```bash
gcloud services enable iamcredentials.googleapis.com --project "switchcv-e5136"
```

#### 2. Create Workload Identity Pool & Provider

```bash
# Create the pool
gcloud iam workload-identity-pools create "github-actions" \
  --project="switchcv-e5136" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create the provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="switchcv-e5136" \
  --location="global" \
  --workload-identity-pool="github-actions" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

#### 3. Grant Permissions

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe switchcv-e5136 --format="value(projectNumber)")

# Allow repository to impersonate service account
gcloud iam service-accounts add-iam-policy-binding "firebase-adminsdk-xxxxx@switchcv-e5136.iam.gserviceaccount.com" \
  --project="switchcv-e5136" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions/attribute.repository/YOUR_GITHUB_USERNAME/switchCV"

# Allow deployments to use App Engine runtime service account
gcloud iam service-accounts add-iam-policy-binding "switchcv-e5136@appspot.gserviceaccount.com" \
  --project="switchcv-e5136" \
  --role="roles/iam.serviceAccountUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-actions/attribute.repository/YOUR_GITHUB_USERNAME/switchCV"
```

#### 4. Add GitHub Secrets

Go to your GitHub Repository → **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`: Get with:
  ```bash
  gcloud iam workload-identity-pools providers describe "github-provider-3" \
    --project="switchcv-e5136" \
    --location="global" \
    --workload-identity-pool="github-actions" \
    --format="value(name)"
  ```
- `GCP_SERVICE_ACCOUNT`: The email of the service account (e.g., `firebase-adminsdk-fbsvc@switchcv-e5136.iam.gserviceaccount.com`)

### Deploy Automatically

Simply push or merge to `develop`:

```bash
git checkout develop
git merge feature/new-feature
git push origin develop
```

Watch progress in the **Actions** tab of your GitHub repository.

### Managing Storage Costs

Set a **Lifecycle Policy** to keep only the last 10 container images:

```bash
gcloud artifacts repositories set-cleanup-policies \
  gcf-artifacts \
  --location=us-central1 \
  --policy=<(echo '{
  "name": "keep-last-10-versions",
  "action": {"type": "Delete"},
  "condition": {
    "tagState": "ANY",
    "olderThan": "30d"
  },
  "mostRecentVersions": {
    "keepCount": 10
  }
}')
```

---

## Workflow & Git

### Branching Strategy

```
main (production)
  ↑
develop (staging)
  ↑
feature/feature-name (development)
```

### Standard Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature

# Create PR to develop
# After review, merge to develop
# Auto-deploys to staging

# After testing, merge develop to main
# Auto-deploys to production
```

### Commit Message Convention

```
feat: Add new feature
fix: Fix bug in component
docs: Update documentation
style: Format code
refactor: Refactor service
test: Add tests
chore: Update dependencies
```

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass (`npm run test`)
- [ ] No console.log statements
- [ ] TypeScript types defined
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

### Pre-commit Hooks

Automatically runs before each commit:

- Linting (`eslint`)
- Type checking (`tsc`)
- Tests (`jest`)

To skip (use sparingly):

```bash
git commit --no-verify -m "message"
```

---

## Files Reference

| File                                   | Purpose                                           |
| -------------------------------------- | ------------------------------------------------- |
| `src/lib/config.ts`                    | Dev mode constants and safety checks              |
| `src/lib/services/userService.ts`      | `getUserTier()` and `getUserRole()` with bypass   |
| `src/hooks/useTier.ts`                 | Client-side hook to get tier with dev mode bypass |
| `src/components/dev/DevModeBanner.tsx` | Visual indicator component                        |
| `functions/src/searchResumeService.ts` | Cloud Function bypass for AI search               |
| `.env.example`                         | Documentation for env variables                   |
| `functions/.env.example`               | Cloud Functions env documentation                 |

---

## Security Notes

1. **Never commit** `.env.local` files (they're in `.gitignore`)
2. Dev mode **cannot work** in production builds
3. The `NODE_ENV` check is **compile-time** — the code path is eliminated in prod
4. Even if env vars leak, production builds ignore them completely

---

**Deployment Owner:** DevOps Team  
**Last Updated:** November 30, 2025  
**Next Review:** December 30, 2025
