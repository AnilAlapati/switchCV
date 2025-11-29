# SwitchCV Operations Runbook

## Incident Response

### Severity Levels

- **SEV-1 (Critical)**: System down, data loss, security breach.
  - **Response**: Immediate page to on-call.
- **SEV-2 (High)**: Major feature broken, performance degradation.
  - **Response**: Fix within 4 hours.
- **SEV-3 (Medium)**: Minor bug, cosmetic issue.
  - **Response**: Fix in next sprint.

### Common Scenarios

#### 1. High Error Rate (5xx)

- **Check Sentry**: Identify the top error.
- **Check Logs**: `firebase functions:log`
- **Rollback**: If caused by a recent deploy, revert to previous commit and deploy.
  ```bash
  git checkout <previous-commit>
  npm run deploy:cloud
  ```

#### 2. Database Performance Issues

- **Check Firestore Usage**: Look for high read/write spikes in GCP Console.
- **Check Indexes**: Ensure no missing index warnings in logs.
- **Rate Limiting**: Verify `distributedRateLimit.ts` is functioning.

#### 3. Security Incident

- **Revoke Keys**: Rotate `GEMINI_API_KEY` or Service Account keys.
- **Block User**: Disable user in Firebase Auth.
  ```bash
  firebase auth:export users.json
  # Find user and disable
  ```

## Maintenance

### Database Backups

- Automated daily backups via GCP Scheduler.
- Manual backup:
  ```bash
  gcloud firestore export gs://switchcv-backups
  ```

### Deployment

- **Staging**: Auto-deploy on push to `develop`.
- **Production**: Auto-deploy on push to `main`.
- **Manual**:
  ```bash
  npm run deploy:cloud
  ```

### Monitoring

- **Sentry**: Error tracking.
- **PostHog**: User analytics.
- **GCP Console**: Infrastructure health.

## System Configuration Management

We use a "Remote Config" pattern stored in Firestore to control system behavior without redeploying.

### Configuration Document

- **Location**: Collection `config`, Document `system`
- **Fields**:
  ```json
  {
    "maintenance": {
      "isActive": boolean,      // Turn on maintenance banner
      "blocking": boolean,      // If true, redirects all users to /maintenance
      "message": string         // Message to display
    },
    "auth": {
      "registrationClosed": boolean, // Disable new signups
      "loginDisabled": boolean       // Disable login
    },
    "features": {
      "enableAnalytics": boolean,
      "enableMockData": boolean
    }
  }
  ```

### Option 1: Via CLI (Recommended)

Use the helper script in the repo:

```bash
# Check status
node scripts/toggle-maintenance.js status

# Turn ON maintenance
node scripts/toggle-maintenance.js on "Upgrading Database" --blocking

# Turn OFF
node scripts/toggle-maintenance.js off
```

### Option 2: Via Firebase Console (UI)

You can manually edit the document in the cloud if you don't have access to the CLI.

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Firestore Database**.
3. Find the `config` collection.
4. Click the `system` document.
5. Edit the fields directly (e.g., change `maintenance.isActive` to `true`).
6. The changes will propagate to clients within 5 minutes (due to caching) or immediately on page refresh if the cache expires.

## Emergency Cost Control (Kill Switch)

If you are running out of budget and need to stop all costs immediately:

### Method 1: Disable Billing (Recommended)

This stops all paid services (Cloud Functions, Firestore writes beyond free tier) but keeps your data and project settings intact.

1. Go to the [Google Cloud Console Billing Page](https://console.cloud.google.com/billing).
2. Select your project (`switchcv-e5136`).
3. Click **Account Management** in the left sidebar.
4. Click the **three dots** next to the billing account or project.
5. Select **Disable billing**.

### Method 2: Disable Hosting

If you just want to take the website offline:

```bash
firebase hosting:disable
```
