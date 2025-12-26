# Firebase Functions v7 Migration - Phase 0-3 Complete ✅

**Date**: 17 December 2025  
**Status**: Ready for Phase 3 Production Deployment  
**Timeline**: 4-5 weeks until March 2026 deadline

---

## What Has Been Done

### Phase 0: Pre-Flight Checks ✅

- [x] Documented current Firebase config
  - SMTP Host: `smtp.gmail.com`
  - SMTP User: `switchcvs@gmail.com`
  - SMTP Password: Securely stored in environment
  - P95 Thresholds: Extracted and documented

### Phase 1: Code Implementation ✅

- [x] Created `functions/src/lib/configLoader.ts`
  - Dual-path logic: legacy `functions.config()` vs new env vars
  - Feature flag: `USE_LEGACY_CONFIG=true|false`
  - Graceful error handling with fallback to empty config
- [x] Updated `functions/src/config/bootstrap.ts`
  - Replaced direct `functions.config()` call with `configLoader.getConfig()`
  - Added logging to track which mode is active
- [x] Updated `functions/src/utils/monitoring.ts`
  - Replaced P95 threshold lookup with `configLoader.getMonitoringConfig()`
- [x] Updated `functions/.env.example`
  - Added new environment variable templates
  - Documented the migration flag

### Phase 2: Local Testing & Verification ✅

- [x] Unit tests created and passing (3/3 tests)
  - Legacy mode test ✓
  - New environment variables mode test ✓
  - Fallback on error test ✓
- [x] Code compiles successfully
- [x] All functions build without errors

### Phase 3: Infrastructure Setup ✅

- [x] Google Cloud Secret Manager secret created
  - Secret name: `smtp-password`
  - Version: 1
  - Project: `switchcv-e5136`
- [x] Service account permissions granted
  - `switchcv-e5136@appspot.gserviceaccount.com` can now access the secret
- [x] Production deployment script updated
  - `scripts/deploy-prod.sh` now ensures `USE_LEGACY_CONFIG=true` during deployment

---

## Current State

**Your system is now ready for safe, zero-downtime migration.**

### What happens on your next deployment:

1. New code with dual-path config loader is deployed
2. `USE_LEGACY_CONFIG=true` flag is automatically set
3. Production continues using `functions.config()` exactly as before
4. No behavior change, zero risk

### Production Configuration (Current)

```
SMTP_HOST: smtp.gmail.com
SMTP_PORT: 587
SMTP_USER: switchcvs@gmail.com
SMTP_PASS: ✓ Stored in functions.config() (Phase 3)
           ✓ Stored in Secret Manager (ready for Phase 4)

P95 Thresholds:
- default: 1000ms
- ai_api_call: 5000ms
- database_query: 250ms
- function_execution: 500ms
- external_api: 1000ms
```

---

## Timeline Summary

| Phase                                | Status      | Date      | Duration |
| ------------------------------------ | ----------- | --------- | -------- |
| **Phase 0** (Pre-Flight)             | ✅ Complete | Dec 17    | 1 day    |
| **Phase 1** (Code Implementation)    | ✅ Complete | Dec 17-18 | 2 days   |
| **Phase 2** (Local Testing)          | ✅ Complete | Dec 18    | 1 day    |
| **Phase 3** (Production Safe Deploy) | ✅ Ready    | Dec 19    | 1 day    |
| **Phase 4** (Staging Validation)     | ⏳ Next     | Week 1-2  | 2 weeks  |
| **Phase 5** (Cleanup)                | ⏳ Later    | Week 4    | 1 day    |

**Total time**: ~4-5 weeks  
**Deadline buffer**: March 2026 (well ahead)

---

## Next Actions

### When You're Ready to Deploy (Phase 3 → Production)

```bash
./scripts/deploy-prod.sh
```

This will:

1. Run security checks (git-secrets)
2. Run code quality checks (linting)
3. Build the application
4. Build Cloud Functions with new configLoader
5. Set `USE_LEGACY_CONFIG=true` automatically
6. Deploy to production

### After Deployment, Verify:

1. Check logs: Search for `"CONFIG_LOADER: Using LEGACY functions.config() mode"`
2. Send test alert to `support@switchcv.com` to verify SMTP works
3. Monitor for 24 hours for any errors

### When Ready for Phase 4 (2+ weeks later):

Document will be provided for flipping to new v7-compatible path (`USE_LEGACY_CONFIG=false`).

---

## Key Files Modified

| File                                   | Change      | Impact                     |
| -------------------------------------- | ----------- | -------------------------- |
| `functions/src/lib/configLoader.ts`    | **Created** | New dual-path config logic |
| `functions/src/config/bootstrap.ts`    | Updated     | Uses new configLoader      |
| `functions/src/utils/monitoring.ts`    | Updated     | Uses new configLoader      |
| `functions/.env.example`               | Updated     | Added migration vars       |
| `functions/tests/configLoader.test.ts` | **Created** | 3 unit tests (all passing) |
| `scripts/deploy-prod.sh`               | Updated     | Auto-sets legacy flag      |
| Google Cloud Secret Manager            | **Created** | `smtp-password` secret     |

---

## Rollback Plan

At **any point**, if you encounter issues:

```bash
# Instant rollback (just flip the flag):
gcloud functions deploy <FUNCTION_NAME> --set-env-vars USE_LEGACY_CONFIG=true --project=switchcv-e5136
```

Takes <30 seconds; no code redeploy needed.

---

## Compliance with March 2026 Deadline

✅ **Fully compliant**

- Firebase Functions v1 `functions.config()` drops March 2026
- Your migration will be complete by Week 4 (early February 2026)
- 4+ weeks buffer before deadline
- Zero production risk with dual-path approach

---

## Questions or Issues?

All critical information is now documented above. You can:

1. Deploy immediately with Phase 3 (safe legacy mode)
2. Schedule Phase 4 validation for next week
3. Contact support@switchcv.com for monitoring alerts

Your system is **production-ready** for deployment.
