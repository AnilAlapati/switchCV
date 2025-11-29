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
