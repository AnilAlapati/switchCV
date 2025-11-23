# Access Duration Enhancements

This document captures the recruiter access-duration workflow improvements delivered in November 2025.

## Recruiter Experience

- Request Access dialog now requires a duration preset (1 hour/day/week/month/custom) before submission.
- Custom durations support 1-365 days with inline validation and explanatory helper text.
- Button label and hero copy now say "Request View Access" to match the feature name.
- Requests include the recruiter timezone so downstream notifications and expirations stay accurate.

## Candidate Dashboard

- Pending requests display the recruiter’s requested duration and timezone.
- Candidates can downshift the share window before approving, with presets automatically disabled when they exceed the recruiter’s ask.
- Custom overrides surface validation feedback and cannot exceed the requested limit.
- Approval controls show both recruiter timezone and the candidate’s local timezone to highlight any offsets.

## Backend + Data Model

- `requestedDuration` is stored with normalized metadata (hours, milliseconds, label, timezone, preset/custom flag).
- Approvals persist `grantedDuration` plus `expiresAt`, and create matching `accessGrants` documents for enforcement.
- Resume fetch endpoint now checks `expiresAt` on both requests and grants before returning private data.
- Notifications embed duration details so recruiters know how long their access lasts.

## Testing + Validation

- Added Jest coverage for duration metadata persistence, approval guardrails, and UI submission paths.
- Duration helpers centralize normalization and validation logic that is re-used across dialog, dashboard, and API routes.
- Timezone handoff is verified end-to-end (request payload → approval override → grant expiry → resume access guard).

## Next Steps

- Surface expiring access reminders prior to `expiresAt`.
- Extend recruiter metrics to report average granted duration vs. requested duration.
