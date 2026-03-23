# Code Review - March 23, 2026

## Scope

Reviewed the current uncommitted changes in:

- `functions/src/email/onUserCreated.ts`
- `functions/src/email/resendVerification.ts`
- `functions/src/email/shared.ts`
- `functions/src/email/templates.ts`
- `functions/tests/emailShared.test.ts`
- `src/app/auth/page.tsx`
- `src/app/create-resume/page.tsx`
- `src/hooks/useAuthPage.ts`
- `src/hooks/useAuthPage.types.ts`

## Findings

### 1. [P1] Pending Google users can now reserve usernames before approval, and declined accounts do not release them

Files:

- `src/hooks/useAuthPage.ts:164-179`
- `src/app/auth/choose-username/page.tsx:121-123`
- `src/app/auth/choose-username/page.tsx:140-142`
- `src/app/api/user/username/set/route.ts:67-97`
- `src/app/api/user-approval/decline/route.ts:180-191`

Why this matters:

The new auth redirect logic explicitly sends users with `needsUsername` to `/auth/choose-username` even when `approvalStatus === "pending"`. The username API reserves the name immediately and clears `needsUsername`, but the decline flow only marks the account declined/disabled and never frees the reserved username.

Impact:

- An unapproved Google signup can now claim a desirable username before admin approval.
- If that signup is later declined, the username stays permanently occupied.
- This creates a straightforward username-squatting path and a cleanup burden for admins/support.

Recommendation:

- Either block `/auth/choose-username` and `/api/user/username/set` until approval is complete, or
- Release username reservations when approval is declined/expired.

### 2. [P1] `resolvePublicBaseUrl()` can throw for any project ID not in the hard-coded map

Files:

- `functions/src/email/shared.ts:51-61`

Why this matters:

`projectBaseUrl` is read from `PROJECT_BASE_URLS[projectId]`. If the function runs in any environment whose project ID is not one of the three hard-coded keys, `projectBaseUrl` becomes `undefined`, and the next `normalizeBase(projectBaseUrl)` call will throw.

Impact:

- Verification emails / approval links can fail completely in any new project, temporary environment, or misnamed staging deployment.
- The failure happens inside shared email URL generation, so it affects multiple flows at once.

Recommendation:

- Guard unknown project IDs explicitly and fall back safely.
- Prefer `explicitBaseUrl` when present, and only use the project map when a known match exists.

### 3. [P2] The current diff will fail the repo's staged lint gate

Files:

- `src/app/create-resume/page.tsx:3`
- `package.json:124-129`

Why this matters:

The repo's `lint-staged` config runs `eslint --max-warnings=0` on staged TS/TSX files. The modified `create-resume` page now produces at least:

- an unused import warning for `useMemo`
- a `max-lines` warning after the live-preview expansion

Impact:

- This change set is likely to fail the local pre-commit path even though tests/type-check pass.

Recommendation:

- Remove the unused import.
- Split the preview mapping/layout into a helper or child component so the file stays under the lint threshold.

### 4. [P3] Live preview skill labels are inconsistent because the new mapper uses `"Intermediate"` instead of `"intermediate"`

Files:

- `src/app/create-resume/page.tsx:26-28`
- `src/components/resume/PreviewSkills.tsx:26-29`

Why this matters:

`PreviewSkills` suppresses the label only when `skill.level === "intermediate"`. The new live-preview mapper sets the value to `"Intermediate"`, so every mapped skill shows an unnecessary `(Intermediate)` badge.

Impact:

- The live preview no longer matches the rest of the app's skill-level conventions.
- Users see noisy/default badges on every generated skill chip.

Recommendation:

- Normalize preview skill levels to the lowercase values used elsewhere (`beginner`, `intermediate`, `advanced`, `expert`).

## Validation

Ran:

- `npx eslint src/app/create-resume/page.tsx src/app/auth/page.tsx src/hooks/useAuthPage.ts src/hooks/useAuthPage.types.ts`
- `npx jest --watchman=false --runInBand src/__tests__/app/auth/page.test.tsx src/__tests__/app/create-resume/page.test.tsx`
- `npx jest --watchman=false --runInBand tests/emailShared.test.ts` from `functions/`
- `npx tsc --noEmit --pretty false` in both the repo root and `functions/`

Results:

- Targeted Jest tests passed.
- Root and functions type-check passed.
- ESLint reported warnings on modified files; no lint errors, but the warnings are still significant because `lint-staged` is configured with `--max-warnings=0`.

## Residual Risk / Coverage Gaps

- There is no targeted test covering the new pending-approval + username-selection interaction end-to-end.
- There is no test covering the unknown-project branch of `resolvePublicBaseUrl()`.
- The new live preview behavior is not directly asserted in `src/__tests__/app/create-resume/page.test.tsx`.
