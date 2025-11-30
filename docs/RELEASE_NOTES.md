# Release Notes

## [AI.0.0.48] - 2025-11-30
### Changed
- Automated version increment.

## [AI.0.0.47] - 2025-11-30
### Changed
- Automated version increment.

## [AI.0.0.46] - 2025-11-30
### Changed
- Automated version increment.

## [AI.0.0.45] - 2025-11-30
### Changed
- Automated version increment.

## [AI.0.0.44] - 2025-11-30
### Changed
- Automated version increment.

## [AI.0.0.43] - 2025-11-30
### Changed
- Automated version increment.

## [AI.0.0.42] - 2025-11-29

### Fixed

- Resume generation API now uses tier-aware model selection with fallback, allowing optional `modelId` requests without runtime errors.
- Verified `npm run build` completes successfully after wiring the AI provider service.

### Changed

- Updated release notes to keep automation unblocked for future builds.

## [AI.0.0.41] - 2025-11-29

### Added

- Introduced `docs/RELEASE_NOTES.md` with the initial handbook entry so the release script can run.

## [AI.0.0.40] - 2025-11-29

### Fixed

- Restored Firebase auth propagation for `/api/search/ai`, ensuring AI tier validation works end-to-end.
- Enforced distributed rate limiting on recruiter resume search to prevent bypassing quotas across instances.
- Batched premium search profile lookups to cut Firestore reads and improve latency.

### Testing

- `npm run lint`
- `node scripts/test-ai-tiers.js`
