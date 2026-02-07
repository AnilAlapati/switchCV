# SwitchCV Verification Runbook

How to verify the DAL + Zod architecture migration is working correctly.

---

## Quick Verification (5 minutes)

Run these commands in order. All must pass:

```bash
# 1. Route security audit — MUST show "ALL CHECKS PASSED"
node scripts/audit-api-routes.js

# 2. TypeScript — MUST have 0 errors
npx tsc --noEmit

# 3. ESLint — MUST have 0 errors (warnings OK)
npm run lint

# 4. Dependency security — MUST have 0 vulnerabilities
npm audit --omit=dev --audit-level=high
```

---

## Full Verification (30 minutes)

### 1. Run Full Test Suite

```bash
CI=true npm test -- --watch=false --watchman=false
```

**Expected result**: ~400 passed suites, 0 failures, ~4,194 passed tests.

### 2. Start Development Server

```bash
npm run dev
```

Navigate to `http://localhost:3000` and verify the app loads without console errors.

### 3. Test Critical Flows

| Flow | Steps | Expected Result |
|------|-------|-----------------|
| **Auth** | Log in with valid credentials | Redirects to dashboard, user data loads |
| **Resume Chat** | Start new resume → Answer 2-3 questions | Chat history persists, no API errors |
| **Recruiter Search** | Log in as recruiter → Search for "engineer" | Results appear, access requests work |
| **Admin Dashboard** | Log in as admin → View metrics | Dashboard loads with charts/data |

---

## Production Smoke Test

After deploying and disabling maintenance mode:

```bash
# Health check
curl -s https://switchcv.com/api/health | jq .
# Expected: { "status": "ok", ... }

# System config (requires admin token)
curl -s https://switchcv.com/api/system-config \
  -H "Authorization: Bearer <ADMIN_TOKEN>" | jq .
# Expected: { "maintenanceMode": false, ... }
```

---

## What Changed (Summary)

| Before (Direct Firebase) | After (DAL) |
|--------------------------|-------------|
| `import { adminDb } from "@/lib/firebase-admin"` | `import { getDoc, COLLECTIONS } from "@/lib/dal"` |
| `adminDb.collection("users").doc(id).get()` | `getDoc(COLLECTIONS.USERS, id)` |
| `await request.json()` (unvalidated) | `SomeSchema.safeParse(await request.json())` |
| `eslint-disable-next-line no-restricted-imports` | No eslint-disable needed |

---

## Rollback Procedure

If issues are found in production:

1. **Enable maintenance mode**:
   ```bash
   node scripts/enable-maintenance-prod.js
   ```

2. **Revert the merge**:
   ```bash
   git checkout develop
   git revert -m 1 <merge-commit-sha>
   git push origin develop
   ```

3. **Redeploy** using standard deployment workflow.

4. **Investigate** using Firebase console logs and local reproduction.

---

*Created: Feb 7, 2026*
