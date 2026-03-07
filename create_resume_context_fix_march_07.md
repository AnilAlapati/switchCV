# Create Resume Context Fix — March 07, 2026

## Objective

Deep-dive the conversational resume creation flow after repeated production clarification loops such as:

- `Experience entry N is missing company`
- `Experience entry N must include description or achievements`
- progress showing effectively complete while the system still needed exact nested details

This review focused on **context retention**, **prompt alignment**, **clarification UX**, and **incremental extraction/merge behavior**.

---

## Summary of Issues Found

### 1. Partial experience and education entries were not being enriched reliably

In the resume context merge path, if an experience entry was extracted once with only `title` + `company`, later user messages that added `description`, `duration`, or `achievements` could be treated as duplicates and effectively ignored.

Impact:

- user gives the missing detail
- extraction sees the same role/company again
- existing item is retained as-is
- validation still says the field is missing
- clarification appears to repeat

### 2. Force-create prompt still encouraged invalid structured output

The prompt previously told the model to create the JSON immediately and allowed it to:

- leave fields empty
- infer missing details from context

That conflicted with strict downstream validation, especially for nested experience/education requirements.

Impact:

- model generates incomplete or partially inferred JSON
- strict validation rejects it
- system drops into repair or clarification again

### 3. Machine-readable clarification data was not surfaced in the UI

Backend responses already included:

- `needsClarification`
- `missingEvidenceFields`

but the create-resume page only rendered the assistant text response.

Impact:

- backend knew the exact issues
- frontend showed only chat text
- users had no stable checklist of missing fields

### 4. Force-create CTA remained visible during clarification state

After validation failed, the page could still show the `Create Resume Now` button because progress stayed high.

Impact:

- user could press the button again immediately
- same validation loop could repeat

---

## Fixes Applied

### A. Backfill matching experience and education entries during merge

Updated the merge logic in:

- [src/lib/services/resumeDataExtractor.ts](src/lib/services/resumeDataExtractor.ts)

Changes:

- matching experience entries are now **merged**, not only deduplicated
- missing `duration`, `description`, and `achievements` are backfilled from later messages
- matching education entries are also enriched instead of duplicated
- comparison logic is now safer for partially populated entries

Result:

- later user clarifications enrich existing entries
- repeated missing-detail loops are less likely

### B. Tightened the force-create prompt

Updated:

- [src/lib/services/resumePrompts.ts](src/lib/services/resumePrompts.ts)

Changes:

- removed the instruction that allowed inference of missing required details
- explicitly tells the model not to fabricate missing company/title/description/achievement/date/grade data
- allows optional contact fields to remain empty, but not required nested resume details

Result:

- prompt behavior now better matches strict validation rules

### C. Surfaced clarification issues directly in the create-resume UI

Updated:

- [src/hooks/useResumeCreation.ts](src/hooks/useResumeCreation.ts)
- [src/app/create-resume/page.tsx](src/app/create-resume/page.tsx)

Changes:

- stored `needsClarification` and `missingEvidenceFields` in hook state
- persisted clarification state in session restore/save flow
- rendered a visible clarification box listing exact missing items

Result:

- users see a stable, exact checklist of missing details
- chat text is no longer the only place where the missing info appears

### D. Hid the force-create CTA while clarification is pending

Updated:

- [src/app/create-resume/page.tsx](src/app/create-resume/page.tsx)

Changes:

- `Create Resume Now` is hidden when `needsClarification` is true

Result:

- avoids an immediate retry loop while the user still needs to supply exact missing details

### E. Improved the actual user-facing clarification responses

Updated:

- [src/lib/services/resumeGenerationQuality.ts](src/lib/services/resumeGenerationQuality.ts)
- [src/lib/services/resumeGenerationOrchestrator.ts](src/lib/services/resumeGenerationOrchestrator.ts)
- [src/hooks/useResumeCreation.ts](src/hooks/useResumeCreation.ts)
- [src/app/create-resume/page.tsx](src/app/create-resume/page.tsx)

Changes:

- added a user-friendly clarification checklist alongside the detailed validation text
- changed the assistant clarification copy to be more direct and less technical
- made the UI show plain-language checklist items instead of only raw validator messages when available

Result:

- the user sees a better response, not just a technically correct one
- missing items are easier to understand and answer quickly

---

## Tests Added / Updated

### Resume data merge coverage

Updated:

- [src/**tests**/lib/services/resumeDataExtractor.test.ts](src/__tests__/lib/services/resumeDataExtractor.test.ts)

New coverage includes:

- backfilling a matching experience entry with description/duration/achievement
- backfilling a matching education entry with year/major

### Prompt coverage

Updated:

- [src/**tests**/lib/services/resumePrompts.test.ts](src/__tests__/lib/services/resumePrompts.test.ts)

New coverage includes:

- force-create prompt now forbids inference/fabrication of required details

### Create-resume UI coverage

Updated:

- [src/**tests**/app/create-resume/page.test.tsx](src/__tests__/app/create-resume/page.test.tsx)

New coverage includes:

- rendering exact clarification issues
- hiding the force-create button during clarification state

### Existing validation/clarification coverage retained

Confirmed existing coverage in:

- [src/**tests**/lib/services/resumeGenerationQuality.test.ts](src/__tests__/lib/services/resumeGenerationQuality.test.ts)
- [src/**tests**/lib/services/resumeGenerationOrchestrator.test.ts](src/__tests__/lib/services/resumeGenerationOrchestrator.test.ts)

---

## Test Execution

Focused test run completed successfully:

- 86 passed
- 0 failed

Test set included:

- resume data extractor
- resume prompts
- create-resume page
- resume generation quality
- resume generation orchestrator

---

## Remaining Watch Item

### AI-first conversation extraction is available but not yet the primary orchestrator path

There is still an AI-assisted extractor in:

- [src/lib/services/resumeDataExtractor.ts](src/lib/services/resumeDataExtractor.ts#L264-L343)

but the main orchestrator path currently still begins with the standard extraction flow in:

- [src/lib/services/resumeGenerationOrchestrator.ts](src/lib/services/resumeGenerationOrchestrator.ts#L192-L197)

This is **not** a blocker after the fixes above, but it remains a possible future enhancement if production transcripts show regex/context extraction still missing nuanced follow-up details.

Reason not changed in this pass:

- it changes the number and type of AI calls in the live path
- it has broader regression risk than the targeted fixes above
- the higher-confidence production win was to preserve and surface existing context better

---

## Outcome

This pass closes the main context/clarification gaps that were still causing confusing loops:

- preserved incremental resume context better
- aligned prompt behavior with validation rules
- exposed exact missing fields in the UI
- prevented immediate force-create re-looping during clarification

The resume creation flow should now be significantly more resilient when a user provides missing experience details in follow-up turns.
