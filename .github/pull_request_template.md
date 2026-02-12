## Description

<!-- Brief description of what this PR does. Link to any related issues. -->

Fixes #

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] ♻️ Refactor (no functional changes)
- [ ] 🔧 Configuration change

## Checklist

### Code Quality
- [ ] `npm run lint` passes with 0 errors
- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] No new `eslint-disable` directives added
- [ ] No new `any` types (per [CODING_STANDARDS.md](docs/CODING_STANDARDS.md))
- [ ] No `console.log` in production code (use `logger` from `@/lib/logger`)

### Testing
- [ ] `npm test` passes — all existing tests still pass
- [ ] Added/updated tests for new functionality
- [ ] Branch coverage not reduced

### Security
- [ ] No hardcoded secrets or API keys
- [ ] API routes use `getAuthenticatedUserId()` (unless intentionally public)
- [ ] Input validated with Zod schemas
- [ ] Errors use `handleApiError()` — no `String(error)` in responses

### Accessibility (for UI changes)
- [ ] Form inputs have `aria-invalid` and `aria-describedby` when errors present
- [ ] Error messages have `role="alert"`
- [ ] Loading states have `role="status"` and `aria-live="polite"`
- [ ] Decorative SVGs have `aria-hidden="true"`

### Firestore (for data model changes)
- [ ] Queries use `.limit()` — no unbounded reads
- [ ] Security rules updated if new collections added
- [ ] Resume lookups use `fetchResumeDocument()` helper

## Screenshots / Recordings

<!-- If applicable, add screenshots or recordings of the change -->
