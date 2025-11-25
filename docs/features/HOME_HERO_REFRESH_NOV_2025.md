# Home Hero Refresh – November 2025

## Overview

- Updated `src/components/home/HomeHero.tsx` to emphasize live resume positioning while restoring the original snapshot preview that stakeholders preferred.
- Updated `src/hooks/useGlobalStats.ts` to stream Firestore stats in real time and format values consistently for display in the hero metrics row.
- Adjusted highlight copy in `src/app/page.tsx` so the landing page messaging clarifies analytics, privacy controls, and AI refresh capabilities.

## Firestore Data Requirements

The `useGlobalStats` hook listens to `analytics/globalStats` in Firestore. Populate the document with the following numeric fields so the hero metrics stay current:

| Field                   | Type      | Description                                                                |
| ----------------------- | --------- | -------------------------------------------------------------------------- |
| `resumeCount`           | number    | Total published resumes (displayed with compact notation and "+" suffix).  |
| `userCount`             | number    | Active user count (displayed with compact notation and "+" suffix).        |
| `profileCompletionRate` | number    | Completion rate as either a percentage (e.g. `98`) or ratio (e.g. `0.98`). |
| `updatedAt`             | timestamp | Optional; useful for auditing when numbers were last refreshed.            |

The hook continues to fall back to legacy keys (`resumes`, `users`, `completion`, `completionRate`) if present, and defaults to `12k+`, `3+`, and `98%` when Firestore data is missing.

## Hero Layout Changes

- Left column keeps the CTA, highlight cards, and live metrics row (`stats.resumes`, `stats.users`, `stats.completion`).
- Right column reverts to the snapshot preview card with the “Active preview link” header, matching the previous design request.
- Creation steps list reinstated to outline the onboarding journey: Tell us about you → Let AI refine → Share securely.

## Implementation Notes

- Real-time stats rely on `onSnapshot`; there is no polling logic to maintain.
- Count formatting uses `Intl.NumberFormat` with compact notation and automatically appends "+" for values ≥ 1.
- Completion formatting accepts both percentage and decimal inputs; missing values fall back to the default display.
- Error handling prints to console and reverts to defaults if Firestore throws.

## Suggested Follow-ups

1. Automate updates to `analytics/globalStats` (e.g., via scheduled Cloud Function) so values stay accurate.
2. Expand the snapshot section with additional live elements once more data points are available.
3. Add integration tests for `useGlobalStats` using the Firestore emulator to prevent regressions in formatting.
