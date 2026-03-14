# AI Monitoring Implementation Plan — March 13, 2026

## Implementation Status

- Phase 1: `COMPLETED`
- Phase 2: `COMPLETED`
- Phase 3: `COMPLETED`
- Phase 4: `COMPLETED`

Step-by-step status log:

- March 13, 2026: Started implementation. Defining shared monitoring types, request context, failure taxonomy helpers, redaction helpers, and Firestore persistence helpers.
- March 13, 2026: Completed foundation instrumentation. Added request-scoped monitoring context, stable failure codes, payload redaction, Firestore failure-event persistence, and request-summary persistence in the app server flow.
- March 13, 2026: Completed provider, extraction, and orchestration instrumentation. Provider attempts now record failures and circuit-open conditions, extraction failures are categorized, request ids are propagated from API routes, and fallback recovery is tracked as degraded-but-recovered behavior.
- March 13, 2026: Completed scheduled monitoring backend. Added 15-minute aggregation and alert detection, daily digest email delivery, recovery notifications, and retention cleanup functions in Firebase Functions.
- March 13, 2026: Completed admin monitoring query surface. Added an authenticated admin API for overview queries, failure-event browsing, and request-trace lookup by `requestId`.
- March 13, 2026: Completed targeted verification. App monitoring and route tests passed, Functions monitoring tests passed, Functions TypeScript build passed, and targeted ESLint completed with warnings only for pre-existing file length limits on large service files.
- March 13, 2026: Completed test suite coverage and coding-standards refactor.
- March 14, 2026: Completed remaining Phase 3 and Phase 4 features: an Admin Dashboard UI (`/admin/ai-monitoring`) leveraging SWR hooks for tabs (Overview, Failures, Trace) and a `monitorAiMonitoringHealth` scheduled Cloud Function for pipeline-is-broken monitor-on-monitor detection. Project complete.

## Goal

Build an email-first Firebase monitoring system for the AI resume flow so that:

- every important AI failure is persisted
- root cause is visible without reading raw logs
- alerts reach `support@switchcv.com`
- alert noise stays low enough for a solo developer
- Firebase remains the system of record for monitoring state

This plan is designed for the current SwitchCV stack:

- Next.js app server for resume orchestration
- Firebase / Firestore backend
- Firebase Cloud Functions for scheduled monitoring and alerts
- Firestore Trigger Email extension already used through the `mail` collection

## Current State

There is already partial monitoring in the codebase:

- `functions/src/scheduled/healthMonitor.ts`
  - scheduled health checks for Firestore, Gemini API, and SMTP
- `functions/src/utils/monitoring.ts`
  - generic alert and monitoring utilities
- `src/lib/services/aiExtractionService.ts`
  - in-memory extraction failure tracker
  - sends an admin email only after 1 hour of consecutive extraction failures

What is missing:

- per-request AI failure persistence
- structured AI failure categories
- correlation between one user complaint and one backend trace
- Firebase dashboards for AI-specific failures
- email alerts based on real failure patterns, not only broad service downtime

## Design Principles

1. Firebase is the source of truth.
2. Email is the primary alert channel.
3. Every alert must be backed by persisted Firestore data.
4. All AI failures must be categorized with a stable `failureCode`.
5. Payloads must be redacted before persistence.
6. Monitoring must cover both system-wide outages and silent partial failures.
7. Alerting must be deduplicated and cooldown-based.

## Monitoring Scope

The monitoring system must cover these stages:

1. AI extraction
2. AI generation
3. AI repair loop
4. provider fallback behavior
5. resume generation success rate

It must distinguish between:

- provider/network failures
- secret/configuration failures
- non-JSON or invalid JSON model responses
- schema validation failures
- timeouts
- fallback recovered failures
- total user-visible failures

## Firestore Data Model

### 1. `monitoring/aiFailureEvents/events/{eventId}`

One document per failed AI attempt.

Required fields:

- `requestId`
- `sessionId`
- `userIdHash`
- `stage` (`extraction`, `generation`, `repair`)
- `provider`
- `model`
- `failureCode`
- `errorMessage`
- `httpStatus`
- `latencyMs`
- `fallbackUsed`
- `fallbackSucceeded`
- `userTier`
- `environment`
- `deployVersion`
- `createdAt`
- `conversationTurn`
- `promptPreview`
- `responsePreview`

Notes:

- `userIdHash` should be a stable hash, not the raw user id, for monitoring views.
- `promptPreview` and `responsePreview` must be redacted and truncated.

### 2. `monitoring/aiRequestSummaries/requests/{requestId}`

One document per top-level AI request.

Required fields:

- `requestId`
- `entrypoint` (`resume_generate`, `resume_preview`, etc.)
- `startedAt`
- `completedAt`
- `durationMs`
- `status` (`success`, `degraded`, `failed`)
- `userVisibleFailure`
- `failureCount`
- `fallbackCount`
- `stages`
- `finalOutcome`
- `createdResume`
- `environment`
- `deployVersion`

Purpose:

- makes one complaint traceable by request id
- supports dashboard summaries

### 3. `monitoring/aiMetrics/daily/{yyyy-mm-dd}`

Daily rollup document.

Fields:

- `totalRequests`
- `successfulRequests`
- `degradedRequests`
- `failedRequests`
- `userVisibleFailures`
- `fallbackRecoveredRequests`
- `extractionFailures`
- `generationFailures`
- `repairFailures`
- `failureCountsByCode`
- `failureCountsByProvider`
- `failureCountsByModel`
- `avgLatencyByStage`
- `updatedAt`

### 4. `monitoring/aiAlertState/state`

State document to prevent email spam.

Fields:

- `lastSentByAlertKey`
- `openIncidents`
- `lastDigestSentAt`
- `lastHourlySummaryAt`

## Failure Taxonomy

Every failure event must use one of these codes:

- `AI_TIMEOUT`
- `AI_PROVIDER_4XX`
- `AI_PROVIDER_5XX`
- `AI_EMPTY_RESPONSE`
- `AI_NON_JSON_RESPONSE`
- `AI_SCHEMA_VALIDATION_FAILED`
- `AI_SECRET_MISSING`
- `AI_PROVIDER_NOT_CONFIGURED`
- `AI_CIRCUIT_OPEN`
- `AI_ALL_MODELS_FAILED`
- `AI_CONTEXT_TOO_LARGE`
- `AI_UNKNOWN_ERROR`

Optional secondary fields:

- `failureSubcode`
- `providerErrorClass`
- `schemaErrorCount`

## Redaction Rules

Never persist raw resume payloads in monitoring collections.

Before writing previews:

- replace emails with `[EMAIL]`
- replace phone numbers with `[PHONE]`
- replace URLs with `[URL]`
- replace long digit sequences with `[NUMBER]`
- cap preview length to 300 characters

Do not store:

- full conversation transcript
- full AI raw response
- full structured resume JSON

## Instrumentation Changes

### App server instrumentation

Add an `AIObservationContext` object that is passed through:

- API route
- `resumeGenerationOrchestrator`
- `aiExtractionService`
- `aiProviderService`

Fields:

- `requestId`
- `sessionId`
- `userTier`
- `entrypoint`
- `deployVersion`
- `environment`
- `conversationTurn`

### Provider-level instrumentation

At the provider layer, log each attempt with:

- provider
- model
- start time
- end time
- status
- failure code
- http status

This is required even if a later provider succeeds.

### Extraction-level instrumentation

Persist a failure event when:

- provider call throws
- provider returns empty text
- response is not parseable JSON
- schema validation fails

Also persist a degraded event when:

- AI failed but deterministic fallback recovered enough data to continue

### Request summary instrumentation

At request completion:

- write request summary document
- update status as `success`, `degraded`, or `failed`

## Alert Strategy

Email-only, low-noise, high-signal.

### Immediate alerts

Send email immediately when any of these happen:

- `AI_SECRET_MISSING`
- `AI_PROVIDER_NOT_CONFIGURED`
- `AI_ALL_MODELS_FAILED` spike above threshold
- user-visible failure rate exceeds threshold in the last 15 minutes

### Short-window alerts

Send email if, within 15 minutes:

- 5+ total AI failures and failure rate > 20%
- 3+ `AI_NON_JSON_RESPONSE` from the same model
- 3+ `AI_SCHEMA_VALIDATION_FAILED` from the same model
- 3+ `AI_TIMEOUT` from the same provider

### Sustained degradation alerts

Send email if, within 60 minutes:

- degraded request rate > 15%
- failed request rate > 5%
- fallback recovery rate rises sharply, indicating the AI path is unhealthy even if users are partly recovering

### Recovery alerts

Send a recovery email when an incident clears:

- failure rate returns below threshold for 30 minutes
- include start time, end time, primary failure codes, affected provider/model

## Scheduled Firebase Functions

### 1. `aggregateAiMonitoring`

Runs every 15 minutes.

Responsibilities:

- read `aiFailureEvents`
- compute rolling failure rates
- update dashboard docs
- detect alert conditions

### 2. `sendAiMonitoringDigest`

Runs every morning.

Responsibilities:

- send one summary email
- include yesterday’s totals, top failure codes, top failing models, and whether fallback masked failures

### 3. `cleanupAiMonitoringData`

Runs daily.

Responsibilities:

- delete or archive old detailed events after retention window
- keep rollups longer than raw events

Recommended retention:

- raw failure events: 14 to 30 days
- request summaries: 30 to 90 days
- daily rollups: 1 year

## Email Templates

### Incident alert email

Subject example:

- `[SWITCHCV ALERT] AI failures spiking in resume extraction`

Body should include:

- environment
- time window
- failure rate
- top failure codes
- top providers/models
- user-visible failures count
- fallback recovery count
- request ids for recent representative failures

### Recovery email

Subject example:

- `[SWITCHCV RECOVERY] AI extraction incident resolved`

### Daily digest email

Subject example:

- `[SWITCHCV DAILY] AI health summary`

Digest should include:

- total AI requests
- success / degraded / failed counts
- top 5 failure codes
- top 5 failing models
- average extraction latency
- list of unresolved incidents

## Firebase Console Views

Create these views using Firestore collections and simple admin screens:

1. AI Incident Overview
   - current failure rate
   - current open incidents
   - last alert sent

2. AI Failures Table
   - filter by date, stage, failure code, provider, model

3. Request Trace View
   - lookup by `requestId`
   - show request summary plus associated failure events

4. Daily Metrics View
   - success / degraded / failed trends

## Thresholds For Initial Launch

Start conservative:

- immediate critical alert:
  - `AI_SECRET_MISSING >= 1`
  - `AI_PROVIDER_NOT_CONFIGURED >= 1`

- high alert:
  - failed request rate > 10% over 15 minutes

- warning alert:
  - degraded request rate > 20% over 15 minutes

- model-specific alert:
  - 3 identical failure codes for same model in 15 minutes

Adjust after 1 week of data.

## Implementation Phases

### Phase 1: Foundation

Implementation status:

- `COMPLETED` on March 13, 2026.
- Delivered shared monitoring helpers in `src/lib/services/aiMonitoringService.ts`.
- Instrumented `src/server/services/aiProviderService.ts`, `src/lib/services/aiExtractionService.ts`, `src/lib/services/resumeDataExtractor.ts`, and `src/lib/services/resumeGenerationOrchestrator.ts`.
- Added request-id propagation from the resume generation API routes and persisted one request summary per top-level request.

- define failure taxonomy
- add `requestId` generation
- add redaction helper
- add Firestore write helper for AI failure events
- instrument extraction and provider services

Exit criteria:

- every extraction failure writes a Firestore event
- every request has a request summary doc

### Phase 2: Alerting

Implementation status:

- `COMPLETED` on March 13, 2026.
- Added `functions/src/services/aiMonitoringService.ts` for aggregation, incident detection, cooldown-backed alert-state handling, recovery notifications, and digest generation.
- Added scheduled wrappers in `functions/src/scheduled/aggregateAiMonitoring.ts`, `functions/src/scheduled/sendAiMonitoringDigest.ts`, and `functions/src/scheduled/cleanupAiMonitoringData.ts`.
- Exported the new scheduled jobs from `functions/src/index.ts`.

- add scheduled aggregation function
- add alert state doc with cooldowns
- add incident email templates
- send immediate and rolling-window alerts

Exit criteria:

- email arrives for true spikes
- duplicate alert spam is controlled

### Phase 3: Dashboard and Digest

Implementation status:

- `COMPLETED` on March 14, 2026.
- Daily rollups, daily digest email delivery, and recovery emails implemented in Firebase Functions.
- Added admin query and trace APIs via `src/app/api/admin/ai-monitoring/route.ts` and `src/lib/services/adminAiMonitoringService.ts`.
- Created unified Admin Dashboard UI page at `/admin/ai-monitoring` displaying Overview KPI cards, a Failure Events table view, and a Trace lookup tab connecting frontend requests to tracked AI actions.

- create admin query view
- add daily rollups
- add daily digest email
- add recovery emails

Exit criteria:

- you can debug issues without opening raw logs

### Phase 4: Hardening

Implementation status:

- `COMPLETED` on March 14, 2026.
- Deploy-version and environment correlation are persisted with failure events and request summaries.
- Retention cleanup is implemented through the scheduled cleanup function.
- Monitor-on-monitor alerting implemented via the daily `monitorAiMonitoringHealth` Scheduled Function, which emails `support@switchcv.com` if the aggregation/digest pipeline goes stale or the alert-state document becomes disconnected.
- Threshold tuning will remain an ongoing runtime task using production data over the next weeks.

- add monitor-on-monitor alerting
- add deploy version correlation
- tune thresholds
- add retention cleanup

Exit criteria:

- monitoring survives deploys and remains usable long term

## Exact Files To Extend

Primary app instrumentation:

- `src/lib/services/aiExtractionService.ts`
- `src/server/services/aiProviderService.ts`
- `src/lib/services/resumeGenerationOrchestrator.ts`

Firebase scheduled monitoring:

- `functions/src/index.ts`
- `functions/src/scheduled/healthMonitor.ts`
- new:
  - `functions/src/scheduled/aggregateAiMonitoring.ts`
  - `functions/src/scheduled/sendAiMonitoringDigest.ts`

Shared monitoring helpers:

- `functions/src/utils/monitoring.ts`
- or a new focused helper:
  - `functions/src/services/aiMonitoringService.ts`

If the app server writes directly to Firestore for event logging, add:

- `src/lib/services/aiMonitoringService.ts`

## Recommended Build Order

1. per-request event logging
2. request summaries
3. failure taxonomy
4. alert aggregation function
5. email incident alerts
6. daily digest
7. admin dashboard

This order gives immediate debugging value before the full dashboard exists.

## Non-Negotiables

- no raw PII in monitoring docs
- no in-memory-only incident state for critical monitoring
- no generic “AI failed” without failure code
- no alerting without cooldowns
- no dashboard without request correlation

## Success Criteria

The implementation is successful when:

- one user complaint can be traced via `requestId`
- every user-visible AI failure is categorized
- you receive email for real incidents within minutes
- you receive recovery emails when incidents clear
- Firebase shows whether fallback is masking deeper AI instability
- you no longer have to fix AI issues blindly
