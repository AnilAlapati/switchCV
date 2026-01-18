---
description: How to deploy schema-affecting changes safely
---

# Deployment Checklist for Schema Changes

Use this checklist when deploying any changes that affect:
- Firestore collections or documents
- Index configurations
- Environment variables
- Firebase extensions

## Pre-Deployment

1. [ ] Verify the change works in dev environment
2. [ ] Run environment comparison script:
   ```bash
   node scripts/compare-environments.js
   ```
3. [ ] If new collections/documents are needed, create migration script
4. [ ] Update `docs/FIRESTORE_COLLECTIONS_REFERENCE.md` if schema changes

## Deployment

5. [ ] Deploy code changes:
   ```bash
   npm run build && firebase deploy --only hosting
   ```
6. [ ] If needed, deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
7. [ ] If needed, deploy indexes:
   ```bash
   firebase deploy --only firestore:indexes
   ```

## Post-Deployment Verification

8. [ ] Run infrastructure health check:
   ```bash
   curl https://switchcv.com/api/health/infra
   ```
9. [ ] Verify expected response:
   - `status: "healthy"` for all systems nominal
   - `status: "degraded"` may be acceptable for non-critical warnings
   - `status: "unhealthy"` requires immediate action

10. [ ] If migration scripts are needed, run them:
    ```bash
    # Example: Initialize shards
    FIREBASE_PROJECT_ID=switchcv-e5136 node scripts/init-resume-shards.js
    ```

## Rollback Plan

If issues are detected:

1. [ ] Check Firebase Console for errors
2. [ ] Review recent Cloud Function logs
3. [ ] If critical, revert to previous hosting version:
   ```bash
   firebase hosting:clone switchcv-e5136:live switchcv-e5136:rollback
   ```

## Common Issues

### Missing Shards
```bash
# Run initialization script
FIREBASE_PROJECT_ID=switchcv-e5136 node scripts/init-resume-shards.js
```

### Index Not Ready
Wait for index to build in Firebase Console → Firestore → Indexes

### Environment Variable Missing
Check `.env.local` and Firebase Console → Project Settings → Environment Variables
