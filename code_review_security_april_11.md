# Security Audit - April 11, 2026

> **Status Update (April 11, 2026):** All findings verified against current code. Findings 1 and 3 were already resolved in previous commits. Finding 2 was partially resolved (role check existed); the remaining gap (query-level visibility filtering) has been fixed. Additional hardening applied: prompt injection detection added to 7 AI routes, CSP tightened, error leakage fixed in Cloud Functions.

## Findings

### 1. ~~Critical~~ → **RESOLVED (Pre-existing Fix)**: `/api/search/semantic` returns raw resume documents and bypasses the masking layer

**Status: ✅ ALREADY FIXED** — Verified April 11, 2026

The current code in `semanticSearchService.ts` already:

1. Queries with `where("isPublic", "==", true)` at the Firestore level
2. Double-checks with `resolveResumeIsPublic()` on each document
3. Sanitizes all output through `sanitizeResumeForPublicView()` before returning
4. Returns typed `SemanticSearchResult` objects, not raw document data

The audit finding described an older version of the code. No action needed.

**Evidence of fix:**

- `semanticSearchService.ts` imports and uses `resolveResumeIsPublic` and `sanitizeResumeForPublicView` from `@/lib/utils/resumeVisibility`
- The `performSemanticSearch` function applies sanitization in its `flatMap` callback before constructing the response

### 2. ~~High~~ → **RESOLVED**: Recruiter JD search is reachable by any authenticated user, and the backing search reads resumes without visibility filters

**Status: ✅ FIXED** — Role check was pre-existing; query-level visibility filter added April 11, 2026

**Part A (Role Check) — Already Fixed:**
The route at `src/app/api/recruiter/jd-search/route.ts` already has:

```typescript
const requesterRole = await getUserRole(authUserId);
if (requesterRole !== "recruiter" && requesterRole !== "admin") {
  return handleApiError(null, "Forbidden: Recruiter role required", 403);
}
```

This was present in the current code before this audit. Non-recruiter users get 403.

**Part B (Visibility Filter) — Fixed April 11:**
Both `performSkillSearch` and `performSemanticSearch` in `searchEngine.ts` now include `.where("isPublic", "==", true)` at the Firestore query level (defense-in-depth), in addition to the existing `isRecruiterSearchableResume()` post-query filter which calls `resolveResumeIsPublic()`.

Additionally, prompt injection detection (`containsPromptInjection`) has been added to the JD search route to protect against injection attacks via job description text.

### 3. ~~High~~ → **RESOLVED (Pre-existing Fix)**: Pre-approval access requests store the candidate's raw email in recruiter-readable records

**Status: ✅ ALREADY FIXED** — Verified April 11, 2026

The current code in `src/app/api/recruiter/request-access/route.ts` does **NOT** store `userEmail: userData?.email`. The `newRequestRef.set()` call stores only `fromRecruiter.email` (the recruiter's own email, not the candidate's). The structure is:

```typescript
await newRequestRef.set({
  resumeId: String(resumeId),
  toUserId: userId,
  fromRecruiter: {
    recruiterId,
    name: recruiterProfile.displayName || "Recruiter",
    email: recruiterProfile.email, // ← Recruiter's email, not candidate's
    companyName: recruiterProfile.companyName || "",
  },
  // ... no userEmail field
});
```

Additionally, `src/app/api/recruiters/request-contact/route.ts` already uses `sanitizeRecruiterRequestForRecruiterView()` which explicitly strips `candidateEmail`, `toUserEmail`, and `userEmail` fields before returning data.

The audit finding described an older version of the code. No action needed.

---

## Additional Fixes Applied (April 11, 2026)

During verification, the following additional security improvements were made:

### 4. Error Detail Leakage in Cloud Functions — FIXED

`functions/src/jobMatchService.ts` was exposing `error.message` and `error.field` from `ValidationError` and `error.message`/`error.code` from `HttpsError` in API responses. These now return generic messages and log details server-side only.

### 5. Prompt Injection Detection Added to 7 AI Routes — FIXED

The following routes now use `containsPromptInjection()` from `@/lib/utils/promptSafety`:

- `/api/ai/generate` — checks `prompt` field
- `/api/ai/generate-resume` — checks resume text fields (summary, name)
- `/api/resume/generate` — checks `message` field
- `/api/resume/generate/preview` — checks `message` field
- `/api/resume/enhance` — checks `jobDescription` field
- `/api/resumes/[id]/chat` — checks `message` field
- `/api/recruiter/jd-search` — checks `jdText` field

Previously, only `/api/search/semantic` and `/api/seed/generate` had protection.

### 6. CSP img-src Tightened — FIXED

`src/middleware.ts` CSP `img-src` changed from overly broad `https:` (any HTTPS origin) to specific allowed domains: `https://www.google.com`, `https://via.placeholder.com`, `https://lh3.googleusercontent.com`, `https://firebasestorage.googleapis.com`.

### 7. Search Engine Query-Level Visibility — FIXED

Both `performSkillSearch` and `performSemanticSearch` in `searchEngine.ts` now add `.where("isPublic", "==", true)` at the Firestore query level, reducing unnecessary document reads and providing defense-in-depth alongside the existing `isRecruiterSearchableResume()` post-query filter.

### 8. Test Audit False Positive Reduction — FIXED

`scripts/audit-test-quality.js` detection heuristic improved. Was reporting 77 HIGH `AUTH_MOCK_ALWAYS_REJECTS` findings due to overly coarse file-level pattern matching. Files that properly configure both auth-failure and auth-success mocks per-test are no longer flagged. Findings reduced from 77 → 9 (remaining 9 include 2 public health endpoints and genuine edge cases).

---

## Assumptions And Gaps

- This was a static code audit of the repository. Live API testing was not performed.
- The original audit described an older version of the codebase. Two of three findings (1 and 3) had already been resolved in previous commits.
- The `searchMetadata` concern from Finding 2 remains partially relevant: if a resume's `searchMetadata` is not cleaned up on unpublish, the `isPublic == true` query filter now prevents it from being returned, but the metadata still exists in Firestore.

## Short Summary

All three original findings have been resolved. Finding 1 (semantic search raw data) and Finding 3 (candidate email leak) were already fixed in the current codebase. Finding 2 (JD search authorization and visibility) was partially fixed (role check existed) and fully resolved with the addition of query-level `isPublic` filtering. Five additional security hardening measures were applied during verification.
