# Subscription Model & Limits

## Overview

All freemium rules are centralized inside `src/lib/config.ts` so the limits can be tuned without touching business logic. The key objects are:

- `RESUME_CREATION_LIMITS`
- `RESUME_EDITING_ALLOWED`
- `RESUME_RETENTION_DAYS`
- `RESUME_DELETION_GRACE_DAYS`
- `RESUME_EXPIRY_WARNING_HOURS`
- `RECRUITER_CONTACT_LIMITS`
- `RECRUITER_SEARCH_LIMITS`
- `SEEDING_PLAN_LIMITS`

## Tiers

### 1. Basic (Free)

- **Resume Limit:** 1 resume (`RESUME_CREATION_LIMITS.basic = 1`).
- **Editing:** Disabled. Users must upgrade to modify existing resumes (`RESUME_EDITING_ALLOWED.basic = false`).
- **Hosting:** Live for 7 days, then a 3-day grace period before auto-deletion (10th day total). Countdown UI starts 72 hours before deletion (`RESUME_EXPIRY_WARNING_HOURS.basic = 72`).
- **Recruiter Contacts:** 2 per month (`RECRUITER_CONTACT_LIMITS.basic = 2`).
- **Recruiter Searches:** 2 searches per month (`RECRUITER_SEARCH_LIMITS.basic = 2`).
- **AI Seeding:** 5 template-only generations per month.

### 2. Premium

- **Resume Limit:** 50 resumes.
- **Editing:** Unlimited.
- **Hosting:** No expiration (`RESUME_RETENTION_DAYS.premium = null`).
- **Recruiter Contacts/Searches:** Unlimited.
- **AI Seeding:** 50 live generations per month.

### 3. Enterprise

- **Resume Limit:** 9,999+ (effectively unlimited).
- **Editing & Hosting:** Unlimited.
- **Recruiter Contacts/Searches:** Unlimited.
- **AI Seeding:** 200 live generations per month.

## Enforcement Points

### Resume Creation (`src/app/api/resumes/create/route.ts`)

- Authenticated users can only create resumes for themselves.
- Firestore `users/{userId}/resumes` is counted to enforce `RESUME_CREATION_LIMITS`.
- Each saved resume now stores:
  - `expiresAt`: when the live hosting window ends (e.g., day 7).
  - `deletionScheduledAt`: when the document will be purged (e.g., day 10).
  - `countdownStartsAt`: when the UI should begin the 72-hour timer.
  - `expirationWarningHours`: echo of the configured warning window for clients.

### Resume Editing (`src/app/api/resumes/[id]/route.ts`)

- PUT requests call `getUserTier` and block Basic users with a 403 response that instructs them to upgrade.

### Resume Cleanup (`functions/src/resumeCleanupService.ts` + `scripts/cleanup-expired-resumes.js`)

- **Primary path:** `cleanupExpiredResumes` Cloud Function runs daily (02:10 UTC) via Cloud Scheduler / PubSub to enforce `deletionScheduledAt` and purge stale docs.
- **Manual fallback:** `scripts/cleanup-expired-resumes.js` can be invoked locally if the scheduled task ever lags behind.
- Legacy resumes that only have `expiresAt` are still deleted when the timestamp elapses.
- Associated user sub-collection entries and `allResumes` index rows are deleted in the same batch.

### Recruiter Access (`src/app/api/recruiter/request-access/route.ts`)

- Uses `RECRUITER_CONTACT_LIMITS` plus `consumeQuota` to limit Basic recruiters to two candidate contacts per month.

### Recruiter Search (`src/app/api/recruiter/search/route.ts`)

- Requires authentication.
- Reads `RECRUITER_SEARCH_LIMITS` and records usage through `QuotaService` before running any search queries.
- Basic recruiters receive a 403 error once they exceed two searches in the billing period.

### Countdown UI (`src/app/resumes/[id]/page.tsx`)

- Owners see a banner once `countdownStartsAt` has passed.
- The banner shows the live timer (`deletionScheduledAt`) and references `expirationWarningHours` so users understand the 72-hour window.
- Messaging nudges Basic users to upgrade or duplicate before deletion.

### AI Seeding (`src/app/api/seed/generate/route.ts`)

- Each tier's allowance and strategy (template vs. live) is driven by `SEEDING_PLAN_LIMITS`.

## Future Payment Integration

1. Add Stripe Checkout / Billing Portal.
2. Use Stripe webhooks to update `users/{userId}.subscriptionTier`.
3. Reflect the tier data on the dashboard so users know which limits apply.
