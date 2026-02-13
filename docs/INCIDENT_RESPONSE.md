# SwitchCV Incident Response Runbook

## Severity Levels

| Level     | Definition                                          | Response Time     | Examples                                                                                    |
| --------- | --------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| **SEV-1** | Service down / data breach / auth bypass            | 15 min            | Firebase Auth fails, GDPR violation, billing double-charge                                  |
| **SEV-2** | Major feature broken / significant perf degradation | 1 hour            | AI pipeline fails for all users, search returns empty, rate limiting blocking legit traffic |
| **SEV-3** | Minor feature degraded / non-blocking bug           | 4 hours           | Wrong tier limits applied, one recruiter agent fails, email delivery delayed                |
| **SEV-4** | Cosmetic / low-impact issue                         | Next business day | UI glitch, wrong copy text, non-critical log noise                                          |

---

## Escalation Matrix

| Role             | Contact       | Responsibilities                           |
| ---------------- | ------------- | ------------------------------------------ |
| On-Call Engineer | Rotate weekly | First responder, triage, initial fix       |
| Tech Lead        | @anilalapati  | SEV-1/2 escalation, architecture decisions |
| Firebase Admin   | Same          | Firestore rules changes, Auth config       |

---

## Playbook: AI Pipeline Failure (SEV-2)

**Symptoms:** Agentic workflow returns errors, resume generation fails, AI responses timeout.

### Diagnosis

```bash
# Check Gemini API status
curl -s https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY | head -5

# Check recent AI errors in Cloud Functions logs
firebase functions:log --only generateResume --tail 50

# Check billing/quota
# In Firebase Console → Usage → Cloud Functions invocations
```

### Mitigation

1. **Verify API key** is valid and not expired (Firebase Console → Project Settings → Service Accounts)
2. **Check model availability** — if `gemini-2.5-pro` is down, update `src/lib/config/aiModels.ts` to route traffic to `gemini-2.5-flash`
3. **Check rate limits** — Gemini free tier: 15 RPM / 1M TPM. If exceeded, wait or upgrade plan
4. **Fallback:** The `withRetry` wrapper in `agentOrchestrator.ts` handles transient failures (2 attempts, 1s delay). If persistent, check Cloud Functions memory limits
5. **Hard cap check:** Run `BillingService.checkSystemBudget()` — if monthly budget exceeded, AI is intentionally blocked

### Rollback

```bash
# Revert to previous Cloud Functions deployment
firebase functions:rollback generateResume
# Or deploy specific version
firebase deploy --only functions:generateResume
```

---

## Playbook: Authentication / Auth Bypass (SEV-1)

**Symptoms:** Users accessing resources without login, wrong role in JWT, 401/403 errors for valid users.

### Diagnosis

```bash
# Check if custom claims are set correctly
firebase auth:export users.json --format=json
# Look for the user and verify customClaims.role

# Check middleware logs for CSRF/rate-limit blocks
# In Vercel logs or Cloud Functions logs, search for "CSRF" or "rate limit"
```

### Mitigation

1. **Verify `getAuthenticatedUserId()`** is returning correctly — check Firebase Admin SDK initialization in `src/lib/config.server.ts`
2. **Token refresh issue:** If role changed but token stale, force token refresh: user must call `getIdToken(true)` on client
3. **CSRF bypass:** Check `src/middleware.ts` — ensure origin whitelist is correct
4. **Rate limiting false positive:** Check IP in rate limit map — may need to clear or increase tier limit

### Rollback

```bash
# If a bad deploy removed auth from routes:
git log --oneline -5
git revert <commit-hash>
npm run build && firebase deploy --only hosting
```

### Post-Incident

- Run `node scripts/audit-api-routes.js --ci` to verify all routes have auth
- Check that `firestore.rules` hasn't been modified to allow open reads

---

## Playbook: Firestore Cost Spike (SEV-2)

**Symptoms:** Firebase billing alert, slow queries, high read counts in console.

### Diagnosis

```bash
# Check Firestore usage in Firebase Console → Usage & billing
# Look for collections with high read counts

# Find queries missing .limit() in codebase
grep -rn "\.get()" src/app/api/ | grep -v "\.limit(" | head -20
```

### Mitigation

1. **Add `.limit()` to offending queries** — every Firestore query MUST have a limit
2. **Check pagination** — `allResumes` and `recruiterRequests` are high-volume collections
3. **Enable caching** — for public resume reads, add `Cache-Control` headers
4. **Composite indexes** — verify `firestore.indexes.json` has all required indexes deployed:
   ```bash
   firebase deploy --only firestore:indexes
   ```

### Emergency: Disable Expensive Feature

```bash
# If a specific route is causing runaway reads, rate-limit it to 0
# In middleware.ts, add the path to a temporary block list
```

---

## Playbook: GDPR Data Deletion Request (SEV-2)

**Symptoms:** User requests account deletion, compliance deadline approaching.

### Procedure

1. **Verify identity** — confirm request came from authenticated user or verified email
2. **Trigger deletion** — call `UserDataService.deleteAccount(userId, reason)` from Cloud Functions
3. **Verify completion** — check logs for `"GDPR: Account deletion completed"` message
4. **Partial failure handling** — if logs show `"GDPR: partial deletion failures"`, manually check remaining collections:
   - `users`, `profiles`, `resumeProfiles`, `allResumes`, `recruiterRequests`, `accessTokens`, `contactRequests`, `notifications`, `drafts`, `searchQuotas`, `billing`
5. **Confirm Firebase Auth user deleted** — check Firebase Console → Authentication
6. **Audit trail** — the `auditLogs` entry is anonymized (userId → "DELETED_USER"), NOT deleted

### Collections Covered by Automated Deletion (25+)

See `functions/src/services/userDataService.ts` → `deleteAccount()` for the full list.

---

## Playbook: Deployment Failure (SEV-3)

**Symptoms:** Build fails in CI, deploy errors, site shows old version.

### Diagnosis

```bash
# Check CI status
# GitHub → Actions → Latest run

# Check local build
npm run build 2>&1 | tail -20

# Check functions build
cd functions && npm run build 2>&1 | tail -20
```

### Mitigation

1. **TypeScript errors:** Run `npx tsc --noEmit` locally to see all errors
2. **Missing environment variables:** Check `.env.local` has all required vars (see `docs/ENV_VARIABLES.md`)
3. **Firestore indexes not deployed:** Some queries fail without composite indexes
   ```bash
   firebase deploy --only firestore:indexes
   ```
4. **Functions dependency mismatch:** `cd functions && rm -rf node_modules && npm ci`

### Deployment Order (CRITICAL)

```bash
firebase deploy --only firestore:indexes    # 1. Indexes FIRST
cd functions && npm run build && firebase deploy --only functions  # 2. Functions
npm run build && firebase deploy --only hosting                     # 3. Hosting LAST
```

---

## Post-Incident Checklist

After any SEV-1 or SEV-2 incident:

- [ ] Root cause identified and documented
- [ ] Fix deployed and verified in production
- [ ] Monitoring/alerting added to catch recurrence
- [ ] `audit-api-routes.js` passes
- [ ] Relevant tests added or updated
- [ ] This runbook updated if new failure mode discovered
- [ ] Stakeholders notified of resolution
- [ ] Post-mortem document created (for SEV-1 only)

---

## Monitoring & Alerting

| Signal          | Tool                 | Threshold                       |
| --------------- | -------------------- | ------------------------------- |
| Error rate      | Sentry               | >5% of requests in 5 min window |
| Latency p95     | PostHog / Sentry     | >3s for API routes              |
| Firestore reads | Firebase Console     | >100K/day (free tier warning)   |
| AI API errors   | Cloud Functions logs | >10 failures in 1 hour          |
| Auth failures   | Firebase Auth        | >50 failed logins in 10 min     |
| Budget          | Firebase billing     | >$25/month alert                |

---

## Emergency Contacts

| Service    | Status Page                        | Support                    |
| ---------- | ---------------------------------- | -------------------------- |
| Firebase   | https://status.firebase.google.com | Firebase Console → Support |
| Gemini API | https://status.cloud.google.com    | Cloud Console → Support    |
| Vercel     | https://www.vercel-status.com      | Vercel Dashboard → Support |
| Sentry     | https://status.sentry.io           | support@sentry.io          |
