# GCP Cost Optimization — Scheduler & Artifact Registry

**Date implemented:** March 2026  
**Estimated monthly savings:** ₹40–100 (~$0.50–$1.20 USD)  
**Files changed:** `functions/src/index.ts`, `.github/workflows/deploy.yml`, `scripts/artifact-registry-cleanup.sh`

---

## Background

March 2026 GCP bill analysis revealed two cost spikes:

| Service           | Cost    | MoM Change | Root cause                                                         |
| ----------------- | ------- | ---------- | ------------------------------------------------------------------ |
| Artifact Registry | ₹358.77 | +195%      | Unlimited image accumulation per deployment                        |
| Cloud Scheduler   | ₹84.21  | +12%       | High-frequency jobs + 17 separate Scheduler jobs (only 3 are free) |

---

## Change 1 — Reduced High-Frequency Schedules

Four jobs were running far more often than their data actually changes.

| Function                | Old Schedule | New Schedule  | Monthly invocations saved |
| ----------------------- | ------------ | ------------- | ------------------------- |
| `aggregateAiMonitoring` | every 15 min | every 1 hour  | ~2,160                    |
| `healthMonitor`         | every 30 min | every 1 hour  | ~720                      |
| `aggregateBilling`      | every 1 hour | every 6 hours | ~600                      |
| `budgetMonitor`         | every 1 hour | every 6 hours | ~600                      |
| `aggregateGlobalStats`  | every 1 hour | every 6 hours | ~600                      |

**Total:** ~4,680 fewer Cloud Run invocations/month.

**Rationale:**

- AI monitoring aggregates write to Firestore counters — hourly granularity is sufficient.
- Billing totals and budget spend don't change minute-to-minute.
- A health check every 30 min vs 60 min has no meaningful SLA difference at MVP stage.

**If you need to revert a specific job** (e.g., healthMonitor back to 30 min during a production incident), update the cron string in `functions/src/index.ts` and redeploy only functions:

```bash
cd functions && npm run build
firebase deploy --only functions --project switchcv-e5136
```

---

## Change 2 — Consolidated Nightly Cleanup Jobs

**Before:** 5 separate Cloud Scheduler jobs running between 2 AM and 4 AM UTC.  
**After:** 1 `nightlyCleanup` job at 2:00 AM UTC that calls all 5 handlers sequentially.

| Former job                      | Handler source                        |
| ------------------------------- | ------------------------------------- |
| `cleanupAuditLogs`              | `./emailFunctions`                    |
| `cleanupExpiredResumes`         | `./resumeCleanupService`              |
| `cleanupRateLimits`             | `./rateLimitCleanupService`           |
| `cleanupRecruiterSearchHistory` | `./recruiterService`                  |
| `cleanupAiMonitoringData`       | `./scheduled/cleanupAiMonitoringData` |

**Savings:**

- 4 fewer paid Scheduler jobs = ~$0.40 USD/month
- 4 fewer nightly Cloud Run cold starts
- Unified error reporting — all results logged together

**Fault isolation:** Each handler runs in a `try/catch`. One failure does not stop subsequent cleanups. All results (including errors) are returned in the function response and logged via `functions.logger`.

**Job configuration:**

```typescript
// functions/src/index.ts
export const nightlyCleanup = regionalFunctions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub.schedule("0 2 * * *"); // Daily at 2:00 AM UTC
```

Timeout is set to 9 minutes (the v1 maximum) to give all 5 handlers room to finish even under Firestore load.

---

## Change 3 — Artifact Registry Cleanup

### The problem

Firebase/Cloud Build pushes a new Docker image to Artifact Registry on every function deployment. Without a cleanup policy, images from every deploy since project creation are stored indefinitely. Storage cost grows linearly with deployment frequency.

### How it works now

Two layers of protection:

#### Layer 1 — Server-side GCP cleanup policy (automatic)

Set by the cleanup script and enforced by GCP on every new image push. No manual action needed for ongoing maintenance.

| Policy                    | Rule                                               |
| ------------------------- | -------------------------------------------------- |
| `keep-most-recent-tagged` | Retain the 5 most recent tagged images per package |
| `delete-untagged`         | Delete all untagged (dangling) images immediately  |

#### Layer 2 — Immediate CI cleanup (after every deploy)

`scripts/artifact-registry-cleanup.sh` runs as a post-deploy step in [.github/workflows/deploy.yml](../.github/workflows/deploy.yml). It:

1. Applies (or re-confirms) the server-side policy
2. Deletes any existing untagged images immediately
3. Trims each package to the most recent 5 tagged versions

### Running the script manually

```bash
# Preview what would be deleted (no changes made)
./scripts/artifact-registry-cleanup.sh --dry-run

# Run cleanup (default: keep 5, project switchcv-e5136)
./scripts/artifact-registry-cleanup.sh

# Keep only 3 most recent images
./scripts/artifact-registry-cleanup.sh --keep 3

# Target a different project or region
./scripts/artifact-registry-cleanup.sh \
  --project my-other-project \
  --location europe-west1 \
  --repo gcf-artifacts \
  --keep 5
```

### Prerequisites

```bash
# Ensure gcloud and jq are installed
gcloud version
jq --version

# Authenticate
gcloud auth login
gcloud config set project switchcv-e5136
```

### Required IAM permissions

The service account used in CI (`GCP_SERVICE_ACCOUNT` secret) needs:

- `roles/artifactregistry.repoAdmin` on the `gcf-artifacts` repository

To grant it:

```bash
gcloud artifacts repositories add-iam-policy-binding gcf-artifacts \
  --project=switchcv-e5136 \
  --location=us-central1 \
  --member="serviceAccount:YOUR_SA@switchcv-e5136.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.repoAdmin"
```

---

## Scheduler Job Inventory (post-optimization)

| Function                    | Schedule        | Type                              |
| --------------------------- | --------------- | --------------------------------- |
| `sendProfileViewDigest`     | Weekly Mon 9 AM | Email                             |
| `aggregateAnalyticsDaily`   | Daily 1 AM      | Analytics                         |
| `cleanupAnalyticsEvents`    | Weekly Sun 2 AM | Cleanup                           |
| `nightlyCleanup`            | Daily 2 AM      | **Consolidated cleanup (5 jobs)** |
| `notifyExpiringResumes`     | Daily 9 AM      | Notification                      |
| `aggregateBilling`          | Every 6 hours   | Billing                           |
| `aggregateGlobalStats`      | Every 6 hours   | Analytics                         |
| `budgetMonitor`             | Every 6 hours   | Monitoring                        |
| `healthMonitor`             | Every 1 hour    | Monitoring                        |
| `aggregateAiMonitoring`     | Every 1 hour    | Monitoring                        |
| `sendAiMonitoringDigest`    | Daily 8 AM      | Monitoring                        |
| `monitorAiMonitoringHealth` | Daily 4 AM      | Monitoring                        |
| `checkSecretRotation`       | Daily midnight  | Security                          |

**Total jobs: 13** (down from 17) — 10 paid, 3 in free tier.

---

## What Was NOT Changed

- `notifyExpiringResumes` — kept separate (notification, not cleanup; different SLA)
- `cleanupAnalyticsEvents` — weekly schedule, low cost, kept separate for clarity
- `sendAiMonitoringDigest` / `monitorAiMonitoringHealth` — monitoring jobs, not cleanups
- `checkSecretRotation` — security job, must remain independent

---

## Future Opportunities

| Optimization                                                                | Est. Saving            | Complexity |
| --------------------------------------------------------------------------- | ---------------------- | ---------- |
| Remove `aggregateAiMonitoring` if PostHog handles AI metrics                | ~720 invocations/month | Medium     |
| Move `healthMonitor` to Cloud Monitoring uptime checks (free tier)          | ~720 invocations/month | Medium     |
| Reduce Artifact Registry `--keep` from 5 to 3 once deploy cadence is stable | ~40% storage reduction | Low        |
| Cache Gemini API responses in Firestore (separate optimization)             | Reduces Gemini cost    | High       |
