# Resume Seeding Tiers

This document captures how the resume seeding API (`src/app/api/seed/generate/route.ts`) behaves across subscription plans, the quota math that keeps the LLM bill below $10/month, and the knobs required to adjust those limits over time.

## Goals

- Keep total resume seeding spend under $10/month by forcing most users onto deterministic templates and strictly rate-limiting live LLM calls.
- Offer a clear upgrade path for power users who need fresh LLM output, larger quotas, or enterprise guarantees.
- Provide observability hooks (headers + logs) so ops can enforce budgets without diving into code.

## Subscription Plans

| Tier         | Default monthly write cap (`SEEDING_PLAN_LIMITS`) | Generation strategy | Included features                                                                       |
| ------------ | ------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| `basic`      | 5 writes (env: `SEED_BASIC_MONTHLY_LIMIT`)        | `template`          | Cached/template resumes, async-friendly, CDN cacheable, quota headers.                  |
| `premium`    | 50 writes (env: `SEED_PREMIUM_MONTHLY_LIMIT`)     | `live`              | Direct LLM generation, priority logging, higher quota headers, global live cap applies. |
| `enterprise` | 200 writes (env: `SEED_ENTERPRISE_MONTHLY_LIMIT`) | `live`              | Same as premium plus room for negotiated overrides; intended for managed contracts.     |

> **Budget rationale**: five free-template writes + cached reads stay well below $1. Live plans share a global 3K write cap (`GLOBAL_LIVE_SEED_MONTHLY_LIMIT`) so even if premium traffic spikes we cannot exceed the $10 ceiling without an explicit ops change.

## Feature Breakdown

### Template generation (`basic`)

- Deterministic JSON produced by `generateTemplateResume` using category heuristics (creative/technical/executive/general) and seeded randomness, so repeated calls cost $0.
- Immediate response with low processing time; best for new or free users.
- Still logged to `seedGenerationLogs` for metrics.

### Live generation (`premium`/`enterprise`)

- Prompt assembled via `buildPrompt` to encourage profession-specific structure.
- Uses `generateText` which prioritizes free/discounted models and only escalates when quota remains.
- Protected by two quotas: user plan quota + `GLOBAL_LIVE_SEED_MONTHLY_LIMIT` to avoid runaway bills.
- Response includes `X-Seed-Global-Remaining` with the shared live budget.

## Request Lifecycle

1. `ENABLE_SEEDING_AND_DEBUG_LISTS` toggle gates the endpoint entirely (useful for freezing spend).
2. `getAuthenticatedUserId` ensures only logged-in users consume quota.
3. Payload validation enforces `profession` string.
4. `getUserTier` reads `users/{id}.subscriptionTier`; unknown tiers default to `basic`.
5. `consumeQuota` (monthly scope `seed_generate`) decrements the per-user allowance.
6. Strategy decision:
   - `template`: call `generateTemplateResume`, respond immediately.
   - `live`: categorize profession, pick template ID, ensure global live quota, call `generateText`.
7. `logSeedGeneration` writes metadata (`tier`, `strategy`, provider/model) to Firestore for observability.
8. Response headers: `X-Seed-Quota-Limit`, `X-Seed-Quota-Remaining`, `X-Seed-Quota-Reset` (+ global header for live).
9. Quota violations raise `QuotaExceededError` → HTTP 429 with `Retry-After`.

## Configuration Summary

| Setting                          | Purpose                                          | Default |
| -------------------------------- | ------------------------------------------------ | ------- |
| `ENABLE_SEEDING_AND_DEBUG_LISTS` | Master kill-switch for seeding/debug dashboards. | `false` |
| `SEED_BASIC_MONTHLY_LIMIT`       | Overrides `basic` tier quota.                    | `5`     |
| `SEED_PREMIUM_MONTHLY_LIMIT`     | Overrides `premium` quota.                       | `50`    |
| `SEED_ENTERPRISE_MONTHLY_LIMIT`  | Overrides `enterprise` quota.                    | `200`   |
| `SEED_GLOBAL_LIVE_MONTHLY_LIMIT` | Shared ceiling for all live generations.         | `3000`  |

All env vars accept integers; non-positive values fall back to defaults.

## Headers & Client Messaging

Clients should read the following headers and surface usage to users:

- `X-Seed-Quota-Limit`
- `X-Seed-Quota-Remaining`
- `X-Seed-Quota-Reset` (unix seconds)
- `X-Seed-Global-Remaining` (only on live responses)

Recommended UX copy:

- **Free users**: "You have {remaining} template resumes left this month. Upgrade for fresh AI resumes."
- **Paid users near limit**: "Live AI resumes paused until {reset}. Contact support for a temporary boost."

## Logging & Monitoring

- Firestore `seedGenerationLogs` captures every call with plan/strategy/provider metadata—use this for cost attribution.
- Global limit consumption is visible via the `usageQuotas` collection with document IDs containing `seed_generate_live`.
- Set Firestore TTL on quota docs via `expiresAt` to avoid storage bloat.
- Recommended alerts: warn when `X-Seed-Global-Remaining < 500`, disable seeding (`ENABLE_SEEDING_AND_DEBUG_LISTS=false`) if budget risk detected.

## Future Enhancements

1. Add daily quotas for bonus control (extend `QuotaPeriod`).
2. Allow burst credits for paid tiers (dedicated scope `seed_generate_burst`).
3. Surface template catalog so marketing can preview free-tier output.
4. Add Stripe webhooks to auto-upgrade/downgrade `subscriptionTier` without manual Firestore edits.
