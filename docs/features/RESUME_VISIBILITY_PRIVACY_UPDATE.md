# Resume Visibility Privacy Update

## Summary

Public resume viewers now see a sanitized copy of the profile. Contact information is masked by default and clearly marked as available only through owner approval. Owners, admins, and authenticated editors continue to see the full contact data.

## Highlights

- Introduced `sanitizeResumeForPublicView` utility to mask email and phone values when the viewer is not the owner.
- API route `GET /api/resumes/[id]` now attaches `viewerAccess` metadata and returns sanitized payloads for public requests.
- Resume page surfaces alerts when visibility toggles change and distinguishes between owner views and public previews.
- `TemplateRenderer` masks contact cards unless the viewer owns the resume or has admin scope.
- Added `LegacyResumeRenderer` fallback to ensure masked content is respected in all render paths.

## Testing

Run the standard lint and test suites after pulling the update:

```bash
npm run lint
npm run test
```

All Jest suites pass locally (198 suites, 1882 tests).
