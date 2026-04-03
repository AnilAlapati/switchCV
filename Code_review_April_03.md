# Code Review — April 03, 2026

## Session Summary

Root-cause investigation into a prod user complaint (UID `8rq3ipgHRQXDMZK9EUPYRlu3wVh2`) who said
"Create my resume now" three times and received raw JSON back each time. The investigation
revealed two classes of defect: **immediate bugs** in the sync generation pipeline, and a
**fundamental architectural flaw** — free-text LLM extraction has no mechanism to distinguish
user intent (commands, complaints, questions) from user data (name, job history, skills).

Both classes were fixed. Additionally, five new resume templates were created to replace the
generic fallback renderers.

---

## Part 1 — Resume Chat: Immediate Bug Fixes

### Bug 1 — v1 JSON extraction was a no-op

**File:** `src/lib/services/resumeGenerationOrchestrator.ts`  
**Problem:** The branch handling v1/legacy JSON (lines ~505–510) never called
`extractResumeJSON()` or `markAsComplete()`. The code reached `if (v1Json)` but the variable
was never assigned — the if-body was dead code. The resume was never saved even when valid JSON
was returned.  
**Fix:** Now calls `extractResumeJSON(responseText)` and, on success, `markAsComplete()`.

---

### Bug 2 — Raw JSON / `RESUME_COMPLETE` markers returned to the user

**File:** `src/lib/services/resumeGenerationOrchestrator.ts`  
**Problem:** Step 7 returned `responseText` directly to the frontend. When the model produced
output containing JSON fences (` ```json ... ``` `) or the literal token `RESUME_COMPLETE`, the
user saw that raw string in the chat bubble.  
**Fix:** Strip JSON fences and the `RESUME_COMPLETE` marker from the assistant reply before
returning it:

````ts
.replace(/```json[\s\S]*?```/gi, "")
.replace(/RESUME_COMPLETE/gi, "")
.trim()
````

---

### Bug 3 — `grade` vs `gpa` field mismatch

**File:** `src/lib/services/conversationManager.ts`  
**Problem:** The AI system prompt instructed the model to output `"grade"` for GPA, but the
internal schema and Firestore document used `"gpa"`. Every education entry saved from the AI was
silently dropping the GPA value.  
**Fix:** `ConversationManager.updateData()` now normalizes incoming education entries:

```ts
if ("grade" in entry && !("gpa" in entry)) {
  return { ...rest, gpa: grade };
}
```

---

### Bug 4 — User intent absorbed as resume data

**File:** `src/lib/services/aiExtractionService.ts`  
**Problem:** The extraction prompt had no negative examples. Messages like "Create my resume
now", "You already have my info", and UI complaints ("the button is not working") were all passed
to the extraction model, which hallucinated field values from them.  
**Fix 1:** Added a `META_INTENT_PATTERN` pre-flight regex in the orchestrator that short-circuits
extraction when the message matches a command/frustration pattern.  
**Fix 2:** Added 6 negative few-shot examples to `EXTRACTION_SYSTEM_PROMPT`:

- "Create my resume now" → `{}`
- "Let's get started" → `{}`
- "You already have everything" → `{}`
- "The button isn't working" → `{}`
- "Can you hurry up?" → `{}`
- "Yes" / affirmative alone → `{}`

---

## Part 2 — Permanent Fix: Gemini Function-Calling Architecture (v3)

### Root Cause

Free-text extraction (v1/v2) asks the LLM to read the full transcript and infer what fields to
populate. This architecture cannot reliably distinguish:

- User **data** ("I worked at Google from 2019 to 2022")
- User **commands** ("Create my resume now")
- User **questions** ("How many more things do I need to tell you?")
- User **complaints** ("The app keeps showing me errors")

The fix bugs above are mitigations, not a cure. The only permanent solution is to give the LLM
typed tools it calls to store data, so data storage and conversation intent are separated by
design.

### Solution Architecture

The AI now calls typed **function tools** to populate resume fields instead of returning
free-text JSON. The conversation loop:

1. User sends a message.
2. The system prompt tells the AI which tools to call when it hears data.
3. The AI responds with tool calls (e.g., `set_contact_info`, `add_experience`) AND/OR conversational text.
4. The server applies the tool calls to the `ConversationManager` state.
5. The conversational reply is returned to the user.
6. When all data is collected, the AI calls `mark_complete` — which triggers save only if
   minimum required fields are actually present.

### New Files

| File                                                       | Purpose                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| `src/lib/services/resumeToolDefinitions.ts`                | 6 Gemini function declarations + `applyToolCall()` dispatcher |
| `src/__tests__/lib/services/resumeChat.regression.test.ts` | 15-scenario regression test suite                             |

### Tool Declarations

```
set_contact_info(name, email, phone, location, linkedin, github, title)
set_summary(summary)
add_experience(company, role, startDate, endDate, description, achievements[])
add_education(institution, degree, startDate, endDate, gpa)
set_skills(skills[])
mark_complete()
```

### Modified Files

**`src/types/ai.ts`**  
Added `GeminiFunctionParameter`, `GeminiFunctionDeclaration`, `AIToolCall` interfaces.  
Extended `GenerateOptions` with `tools?: GeminiFunctionDeclaration[]` and
`systemInstruction?: string`.  
Extended `GenerateResult` with `toolCalls?: AIToolCall[]`.

**`src/server/services/ai/providers.ts`**  
`callGemini()` now: accepts `tools` and `systemInstruction`; adds `system_instruction` and
`tools` to the Gemini REST body; parses both text parts and `functionCall` parts from the
response; returns `{ text, model, toolCalls? }`.

**`src/server/services/aiProviderService.ts`**  
`callProvider()` and `generateTextWithTier()` now pass `tools` and `systemInstruction` through
to the provider call and surface `toolCalls` in the return value.

**`src/lib/services/resumePrompts.ts`**  
Added `buildFCSystemPrompt(currentState: string): string` — injects the current collected-data
JSON and tool usage rules into the system instruction.

**`src/lib/services/featureFlagService.ts`**  
Added `resume_v3_function_calling: { enabled: false }` to `FLAG_DEFAULTS`. The v3 path is off
by default; enable via Firestore (`featureFlags/resume_v3_function_calling`, set `enabled: true`)
without a code deploy.

**`src/lib/services/resumeGenerationOrchestrator.ts`**  
Added `processFunctionCallingGeneration()` — full FC orchestrator with:

- `try/finally` block that always persists the conversation session (see Part 3 below)
- `hasActualMinimumData` guard that checks `rawCollected.name && email && summary` directly,
  NOT `updatedProgress.hasMinimumData`, because `markAsComplete()` sets that flag
  unconditionally regardless of actual data

**`src/app/api/resume/generate/route.ts`**  
Added feature flag check at the top of the sync handler:

```ts
const useV3 = await isFeatureEnabled("resume_v3_function_calling", { userId, tier: userTier });
const orchestrate = useV3 ? processFunctionCallingGeneration : processSyncGeneration;
const result = await orchestrate({ ... });
```

### Critical Bug Caught During Testing

`ConversationManager.markAsComplete()` sets `this.isComplete = true`, which makes
`getProgress()` return `hasMinimumData: true` unconditionally — even when the conversation
manager holds no actual data. The FC orchestrator was initially checking
`updatedProgress.hasMinimumData` to decide whether to save, which meant an empty
`mark_complete` call would trigger `saveGeneratedResume`. Fixed by reading from the raw
collected data directly.

---

## Part 3 — Conversation Persistence

### What Was Missing

`persistConversationSession()` (from `conversationStorageService.ts`) was called in the v2
`processSyncGeneration` path but **not** in the new v3 `processFunctionCallingGeneration` path.
Conversations through the new pipeline were being lost.

### Fix

Wrapped the v3 orchestrator body in a `try/finally` block. `persistConversationSession` is now
called in `finally`, guaranteeing every turn is saved regardless of outcome (chatting,
clarification, resume created, or thrown error).

### What Gets Saved (per session turn)

Stored at: `users/{userId}/conversationSessions/{sessionId}` — retained for 90 days.

| Field        | Value                                            |
| ------------ | ------------------------------------------------ |
| `messages[]` | Every user + AI message with UTC timestamps      |
| `pipeline`   | `"v3_function_calling"` or `"v2_structured"`     |
| `model`      | Which Gemini/Groq/Claude model responded         |
| `userTier`   | free / premium / enterprise                      |
| `outcome`    | `in_progress` \| `resume_created` \| `abandoned` |
| `resumeId`   | Linked if a resume was created                   |
| `turnCount`  | Total messages in the session                    |

To retrieve sessions for a user (admin/debugging):

```ts
import { getConversationSessions } from "@/lib/services/conversationStorageService";
const sessions = await getConversationSessions(userId, { limit: 10 });
```

---

## Part 4 — Resume Templates

### Problem

11 templates were registered, but `narrative-v1` and `studio-v1` had no dedicated renderer —
both fell through to the generic `TemplateRenderer` fallback. Three new template IDs
(`atlas-v1`, `clarity-v1`, `velocity-v1`) were planned but never created.

### New Renderer Components

| Component                     | Template ID    | Tier    | Design                                                                     |
| ----------------------------- | -------------- | ------- | -------------------------------------------------------------------------- |
| `AtlasResumeRenderer.tsx`     | `atlas-v1`     | Free    | Two-column, navy sidebar, white content area                               |
| `ClarityResumeRenderer.tsx`   | `clarity-v1`   | Free    | Single-column, blue left-border accent bars on headings                    |
| `VelocityResumeRenderer.tsx`  | `velocity-v1`  | Premium | Dark `#0F172A` header band, green `#22C55E` timeline dots, mono skill tags |
| `NarrativeResumeRenderer.tsx` | `narrative-v1` | Premium | Warm serif tones, italic career arc summary, amber dividers                |
| `StudioResumeRenderer.tsx`    | `studio-v1`    | Premium | Violet `#7C3AED` header block, dark sidebar, per-entry accent bars         |

### New Template Definition Files

```
src/lib/templates/resumeTemplates/atlas-v1.ts
src/lib/templates/resumeTemplates/clarity-v1.ts
src/lib/templates/resumeTemplates/velocity-v1.ts
```

### Registration Changes

**`src/lib/templates/resumeTemplates.ts`**  
Added imports for `atlasV1Template`, `clarityV1Template`, `velocityV1Template`. All three are
now part of `RESUME_TEMPLATES`.

**`src/lib/features/creativeTemplates.ts`**  
Added to `TEMPLATE_TIERS`:

```ts
"atlas-v1":   "free",
"clarity-v1": "free",
"velocity-v1": "premium",
```

**`src/components/resume/TemplateRenderer.tsx`**  
Added imports for all 5 new renderers and 5 `if (template.id === "...")` routing blocks
(atlas-v1, clarity-v1, velocity-v1, narrative-v1, studio-v1). No template now falls through
to the generic renderer unintentionally.

### Design Gallery Re-enabled

**`src/app/design-gallery/page.tsx`**  
The file was disabled (entire body wrapped in a block comment). Rebuilt from scratch with:

- Sidebar listing all 11 templates with tier badges (Free / Premium / Enterprise)
- Live preview pane rendering the selected template against a sample resume
- Active selection highlighting

---

## Regression Tests

File: `src/__tests__/lib/services/resumeChat.regression.test.ts`

| Category                   | Scenarios                                                                | Result  |
| -------------------------- | ------------------------------------------------------------------------ | ------- |
| A — Normal data collection | A1–A5 (contact, summary, experience, education, skills)                  | ✅ 5/5  |
| B — Intent filtering       | B1–B5 (create commands, complaints, affirmatives, questions)             | ✅ 5/5  |
| C — Edge cases             | C1–C5 (mark_complete with/without data, multi-tool, AI failure, preview) | ✅ 5/5  |
| Confidence gate            | ≥ 90% across all 15 scenarios                                            | ✅ 100% |

**Total: 16/16 tests pass.**

---

## Files Changed

### Modified (13)

| File                                               | Change                                                                              |
| -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/app/api/resume/generate/route.ts`             | Feature-flag-gated v3 routing                                                       |
| `src/app/design-gallery/page.tsx`                  | Re-enabled, rebuilt from scratch                                                    |
| `src/components/resume/TemplateRenderer.tsx`       | 5 new routing blocks + imports                                                      |
| `src/lib/features/creativeTemplates.ts`            | 3 new tier entries                                                                  |
| `src/lib/services/aiExtractionService.ts`          | 6 negative few-shot examples                                                        |
| `src/lib/services/conversationManager.ts`          | `grade → gpa` normalization                                                         |
| `src/lib/services/featureFlagService.ts`           | `resume_v3_function_calling` flag                                                   |
| `src/lib/services/resumeGenerationOrchestrator.ts` | Phase 0 bug fixes + `processFunctionCallingGeneration()` with `finally` persistence |
| `src/lib/services/resumePrompts.ts`                | `buildFCSystemPrompt()`, tightened frustration regex                                |
| `src/lib/templates/resumeTemplates.ts`             | 3 new template imports + entries                                                    |
| `src/server/services/ai/providers.ts`              | `callGemini()` function-calling support                                             |
| `src/server/services/aiProviderService.ts`         | `tools` + `systemInstruction` pass-through                                          |
| `src/types/ai.ts`                                  | `GeminiFunctionDeclaration`, `AIToolCall`, extended options                         |

### New (10)

| File                                                       | Purpose                          |
| ---------------------------------------------------------- | -------------------------------- |
| `src/lib/services/resumeToolDefinitions.ts`                | 6 tool declarations + dispatcher |
| `src/__tests__/lib/services/resumeChat.regression.test.ts` | 15-scenario regression suite     |
| `src/components/resume/AtlasResumeRenderer.tsx`            | Atlas template renderer          |
| `src/components/resume/ClarityResumeRenderer.tsx`          | Clarity template renderer        |
| `src/components/resume/VelocityResumeRenderer.tsx`         | Velocity template renderer       |
| `src/components/resume/NarrativeResumeRenderer.tsx`        | Narrative template renderer      |
| `src/components/resume/StudioResumeRenderer.tsx`           | Studio template renderer         |
| `src/lib/templates/resumeTemplates/atlas-v1.ts`            | Atlas template definition        |
| `src/lib/templates/resumeTemplates/clarity-v1.ts`          | Clarity template definition      |
| `src/lib/templates/resumeTemplates/velocity-v1.ts`         | Velocity template definition     |

---

---

## Part 5 — Outstanding Items Audit and Fixes

After Parts 1–4, a follow-up audit was done on the five "outstanding items" listed in the
original doc. Three turned out to **already exist**; three had **real gaps** that were fixed.

---

### What Already Existed (not gaps after all)

#### Rate Limiting ✅

`src/middleware.ts` implements a per-IP sliding window using an in-process `Map`. Routes are
bucketed by type:

| Route group                           | Window | Max requests |
| ------------------------------------- | ------ | ------------ |
| `/api/resume/generate`, `/api/chat/*` | 1 min  | 10           |
| `/api/auth/*`                         | 15 min | 5            |
| All other API routes                  | 1 min  | 60           |

The middleware runs on the Edge runtime and returns HTTP 429 with `Retry-After` when the limit
is exceeded.

#### Circuit Breaker ✅

`src/server/services/aiProviderService.ts` instantiates one `CircuitBreaker` per AI provider:

```
google → openai → anthropic → xai
```

Each breaker opens after 5 consecutive failures and resets after a 60-second half-open probe.
Tier routing (`generateTextWithTier`) checks breaker state before dispatching, so a tripped
Gemini breaker falls through automatically to Groq, then Claude, then xAI.

#### Budget Cap Enforcement ✅

`BillingService.checkBudget(userId)` is called in `route.ts` before invoking either orchestrator.
It compares monthly rolling spend against the tier hard cap ($30 basic / $70 premium / unlimited
enterprise) and returns HTTP 402 if the cap is exceeded. The enforcement is per-user, not global.

---

### What Was Actually Missing and Fixed

#### Gap 1 — Billing Not Tracked in v3 FC Path (Fixed ✅)

**File:** `src/lib/services/resumeGenerationOrchestrator.ts`  
**Problem:** `processFunctionCallingGeneration` never called `BillingService.trackCost()` after a
successful AI call. The `aiResponse` type also did not include `estimatedCost`, so the cost
returned by `generateTextWithTier` was silently discarded.  
**Fix:**

1. Extended `aiResponse` type with `estimatedCost?: number`.
2. Added fire-and-forget `BillingService.trackCost(userId, estimatedCost, "resume_chat_v3")`
   after each `generateTextWithTier` call succeeds.

#### Gap 2 — `templateService.getAllTemplates()` — Unbounded Uncached Firestore Scan (Fixed ✅)

**File:** `src/lib/services/templateService.ts`  
**Problem:** `getAllTemplates()` executed `getDocs(collection(db, "templates"))` on every API
request — no cache, no `.limit()`, full collection scan every time. `getTemplateById()` also
hit Firestore on every call.  
**Fix:**

- `getAllTemplates()` now wraps the Firestore call in `coalesce()` (request deduplication) +
  `MemoryCache<ResumeTemplate[]>` with a 30-minute TTL. The Firestore query has `.limit(50)`.
- `getTemplateById()` first checks the in-memory `RESUME_TEMPLATES` registry (always
  authoritative post-deploy). Firestore is only consulted for IDs not found locally, and the
  result is cached with a 30-minute TTL.
- Both cache singletons are module-level so they survive across requests in the same
  Node.js process.

#### Gap 3 — `trackResumeView()` Wrote Nothing (Fixed ✅)

**File:** `src/lib/services/resume/resumeFetching.ts`  
**Problem:** `trackResumeView()` contained:

```ts
await getDocs(
  query(
    viewsRef,
    where("resumeId", "==", resumeId),
    where("timestamp", "==", timestamp), // ← ISO string never matches any doc
  ),
);
// Track view would go here  ← comment confirmed it was broken
```

This was an unbounded read (no `.limit()`) that queried with a timestamp that could never match
an existing document, then discarded the snapshot. No view was ever recorded.  
**Fix:** Replaced with:

```ts
const { addDoc } = await import("firebase/firestore");
await addDoc(viewsRef, { resumeId, timestamp });
```

The view is now actually written to `resumeViews/{autoId}`.

#### Gap 4 — No Admin API for Conversation Sessions (Fixed ✅)

**Problem:** `getConversationSessions()` existed in `conversationStorageService.ts` but there
was no HTTP endpoint to call it. Debugging user sessions required direct Firestore console
access.  
**Fix:** Created `src/app/api/admin/conversations/route.ts`:

- Auth-gated with `getAuthenticatedUserId()` + `verifyAdminAccess()`
- Accepts `?userId=xxx&limit=20` (max 100, default 20) — validated with Zod
- Returns `{ sessions: ConversationSessionDoc[], count: number }`
- 6/6 unit tests pass

---

### Remaining Outstanding Items

| Item                                             | Status    | Notes                                                                     |
| ------------------------------------------------ | --------- | ------------------------------------------------------------------------- |
| Enable `resume_v3_function_calling` flag in prod | Next step | Set `enabled: true` in Firestore — start with one test user first         |
| Monitor conversation session writes              | Next step | Verify `conversationSessions` sub-collection populates after v3 use       |
| Add Redis/external cache for cross-instance data | Future    | In-process `MemoryCache` doesn't survive pod restarts or horizontal scale |
| Vector search / embedding pipeline               | Future    | Planned but not yet implemented                                           |
