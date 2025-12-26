# Operations & Deployment

This runbook covers the procedures for deploying SwitchCV, managing live incidents, and performing routine maintenance.

## 1. Deployment Procedures

### Production (One-Command)
```bash
npm run deploy:prod
```
This script (`scripts/deploy-prod.sh`) performs a security scan (`git secrets`), runs tests, and deploys all services to Firebase.

### Manual Service Deployment
```bash
# Deploy functions only
firebase deploy --only functions

# Deploy Firestore rules only
firebase deploy --only firestore:rules
```

## 2. Incident Response (On-Call Guide)

- **SEV-1 (Critical)**: Site down or data breach.
  - Action: Rotate `GEMINI_API_KEY` or Service Account keys.
  - Action: Check `firebase functions:log`.
- **Emergency Rollback**:
  - Go to Firebase Console > Hosting.
  - Click releases > **Rollback** to a previous version.

## 3. Operational Controls (Kill Switches)

### Maintenance Mode
We use a remote config pattern in Firestore (`config/system`).
```bash
# Turn ON maintenance banner
node scripts/toggle-maintenance.js on "Scheduled Upgrade" --blocking
```

### Cost Control
If budget limits are hit, disable billing in the **Google Cloud Console** under **Account Management** to stop all paid services instantly.

## 4. Pre-Deployment Security Checklist
- [ ] No hardcoded secrets in code (run `git secrets --scan`).
- [ ] `validateEnv()` passes for all required production variables.
- [ ] Firestore indexes are sync'd to the production environment.
- [ ] Environment switched from `.env.dev` to `.env.production`.
