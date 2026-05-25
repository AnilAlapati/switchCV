# Review May 25, 2026

## Scope

This review covers the current open TODO / FIXME items found in the user-facing source code and documentation files of the repository.

Search methodology:

- Scanned `src/` for `TODO` / `FIXME` markers
- Scanned `docs/` for `TODO` / `FIXME` markers
- Excluded generated or vendor directories: `.next`, `.venv`, `.firebase`, `node_modules`

## Summary

- Source TODOs found: 5
- Documentation TODOs found: 4
- High-level tracker file: `vibecoding_issues_todo.md` is present and already contains broader backlog/status information

## Source Code TODO Items

### 1. `src/components/ResumeCreationFlow.tsx`

- Line 245: `// TODO: Use feedback for AI-guided regeneration in the future`
- Review:
  - This is a product improvement item, not a bug.
  - It points to future UX enhancement for regenerating resumes with explicit user feedback.
- Recommendation:
  - Convert to a backlog feature ticket if you want to schedule it.
  - If this becomes a priority, add a small state machine or feedback payload to the regeneration flow.

### 2. `src/components/dashboard/RecruiterSearchResults.tsx`

- Line 15: `// TODO: Pass in current user context/job context if available, or fetch from props`
- Review:
  - This is a technical debt item affecting prop propagation and component isolation.
  - The component should avoid fetching global state internally when caller context is available.
- Recommendation:
  - Refactor to accept a `userContext` or `jobContext` prop upstream.
  - Avoid implicit contextual `useAuth`/global reads inside the component if it is intended to be reusable.
  - Fixed by passing authenticated recruiter metadata from `RecruiterSearchBox` into `RecruiterSearchResults`, removing the hard-coded fallback recruiter payload.

### 3. `src/lib/services/secretManagerService.ts`

- Line 275: `// TODO: Update in Firebase Secret Manager`
- Line 302: `// TODO: Save to Firestore collection 'secretMetadata'`
- Line 321: `// TODO: Save to Firestore collection 'secretAccessLogs' with retention policy`
- Review:
  - These are the only remaining concrete TODO stubs in the application source.
  - They indicate incomplete secret management workflow and audit logging.
- Recommendation:
  - Implement secret rotation persistence and access logging now or clearly mark the service as partial.
  - Ensure the Firestore collections have matching security rules before enabling write access.

## Documentation TODO Items

### 1. `docs/CORS_IMPLEMENTATION.md`

- Lines 239 and 640 contain TODO sections.
- Review:
  - These pages appear to be implementation checklists rather than code-level defects.
  - They may be useful for tracking additional API route updates.
- Recommendation:
  - Update the checklist once remaining CORS-related API routes have been confirmed.
  - If any route still lacks standard CORS validation, add a direct list of files requiring changes.

### 2. `docs/PERFORMANCE_TESTING.md`

- Line 79: `- [ ] Implement Redis/Upstash caching for public resume profiles (TODO).`
- Review:
  - This is a workload/performance item for public resume access.
  - It is currently an unresolved architecture recommendation.
- Recommendation:
  - If the app needs scale, prioritize caching for profile reads.
  - Otherwise mark as future optimization and document expected traffic assumptions.

### 3. `docs/PII_REDACTION_IMPLEMENTATION.md`

- Line 270: references a TODO entry in `vibecoding_issues_todo.md`.
- Review:
  - This indicates the PII redaction documentation is linked to a broader issue tracker.
  - It is not necessarily a live code TODO, but it does require cross-document validation.
- Recommendation:
  - Confirm that the referenced TODO item is either completed or moved to a current backlog.
  - Ensure the documentation reflects the final implementation state.

## High-Level Backlog Note

- `vibecoding_issues_todo.md` is present and acts as a broader issue tracker for quality, security, and testing.
- This report does not attempt to flatten the full backlog from that tracker; it focuses on explicit TODO/FIXME markers found in source and docs.

## Observations

- The repo has very few active source TODOs, which is a good signal.
- The main remaining technical debt in code is the secret manager persistence workflow.
- The user-facing component TODOs are low-risk UX/propagation improvements.
- Documentation TODOs are mostly planning-level items and should be maintained separately from immediate code fixes.

## Status Update

- The source TODOs in `src/components/ResumeCreationFlow.tsx`, `src/components/dashboard/RecruiterSearchResults.tsx`, and `src/lib/services/secretManagerService.ts` have now been implemented and no longer contain active `TODO` markers. The recruiter outreach flow now passes authenticated recruiter metadata through props instead of using a hard-coded default.

## Recommended Next Steps

1. Prioritize `secretManagerService.ts` TODOs if secret rotation / audit logging is meant to be production-ready.
2. Convert the product/UX TODOs in `ResumeCreationFlow.tsx` and `RecruiterSearchResults.tsx` into backlog tickets with acceptance criteria.
3. Close or update the TODO checklist entries in `docs/CORS_IMPLEMENTATION.md` once the implementation state is validated.
4. Decide whether `docs/PERFORMANCE_TESTING.md` caching guidance should move to a formal optimization spike.
5. If desired, create a separate issue summary from `vibecoding_issues_todo.md` for broader project planning.
