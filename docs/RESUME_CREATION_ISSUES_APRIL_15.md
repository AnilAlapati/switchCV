# Resume Creation — Full Issue Report (April 15, 2026)

**User:** anilalapati.66@gmail.com (UID: `pr2cdNhWizLmzehy6v6oVImRX6C3`)  
**Resume:** Firestore `resumes/30` | URL: https://switchcv.com/resumes/30  
**Generation request:** `6db5faa4-5cdb-4639-aacb-2e6a8b5841db` (deploy v0.1.66)  
**Scope:** Conversation chat → live preview → resume creation → resume view

---

## Summary Table

| #   | Severity    | Area          | Issue                                                                                   |
| --- | ----------- | ------------- | --------------------------------------------------------------------------------------- |
| 1   | 🔴 CRITICAL | AI Engine     | Primary AI model fails on 100% of requests — runs degraded always                       |
| 2   | 🔴 CRITICAL | Data Quality  | Experience date fields `startDate`/`endDate` are blank strings                          |
| 3   | 🔴 CRITICAL | Rendering     | `ResumeExperienceSection` renders `" – Present"` when dates are blank                   |
| 4   | 🟠 HIGH     | Data Quality  | Name extracted incorrectly: `"Anilalapati"` instead of `"Anil Alapati"`                 |
| 5   | 🟠 HIGH     | Data Quality  | Phone and location not extracted (empty strings)                                        |
| 6   | 🟠 HIGH     | Data Quality  | `achievements[]` is empty for all 4 experience entries                                  |
| 7   | 🟠 HIGH     | Observability | Conversation sessions never written to Firestore (fire-and-forget breaks in serverless) |
| 8   | 🟡 MEDIUM   | Data Model    | `templateId` not persisted to Firestore document                                        |
| 9   | 🟡 MEDIUM   | Observability | `userId` not stored in AI monitoring summaries                                          |
| 10  | 🟡 MEDIUM   | Observability | Timestamps stored as `{}` (Firestore Timestamp objects not serialized)                  |
| 11  | 🟡 MEDIUM   | UX            | Resume created in `draft` state with no prompt/flow to publish it                       |
| 12  | 🔵 LOW      | Rendering     | `LegacyResumeRenderer` uses `exp.title` but generated data uses `exp.role`              |
| 13  | 🔵 LOW      | Admin         | `read-user-data.js` queries wrong collection for AI usage logs                          |

---

## Issue Details

---

### Issue 1 🔴 CRITICAL — Primary AI Model Fails on Every Single Request

**What happens:** Every resume creation runs in `"degraded"` status because the primary model always fails.

**Evidence (all 5 `resume_created` requests across all users):**

```json
{
  "status": "degraded",
  "failureCount": 3,
  "fallbackCount": 2,
  "stages": {
    "generation": {
      "failureCodes": [
        "AI_PROVIDER_4XX",
        "AI_ALL_MODELS_FAILED",
        "AI_SCHEMA_VALIDATION_FAILED"
      ],
      "fallbackSucceeded": true,
      "status": "degraded"
    },
    "extraction": {
      "failureCodes": ["AI_SCHEMA_VALIDATION_FAILED"],
      "fallbackSucceeded": true,
      "status": "degraded"
    }
  }
}
```

**Failure event messages:**

```
"All AI providers failed. Errors: {"gemini-2.5-flash-lite":"Gemini API error (400)..."
"Gemini API error (400): {"error":{"code":400,"message":"The spec..."
"AI response failed schema validation"
```

**Root cause:**

- `gemini-2.5-flash-lite` returns HTTP 400 on the generation call — "The spec..." error is a structured output schema validation failure in the Gemini API itself (the JSON schema passed to Gemini is rejected as invalid)
- `gemini-2.0-flash-lite` also fails
- Falls through to a regex/v1 pipeline fallback
- Extraction stage (using `gemini-2.5-pro`) also fails schema validation on first attempt, then falls back

**Impact:**

- Every resume generation takes 3x longer than it should (extra fallback calls)
- Higher AI API costs (paying for failed calls)
- Data quality is worse because fallback pipeline has lower accuracy (hence Issues 2–6)
- This has been happening since at least deploy v0.1.56 (all historical `resume_created` docs show the same pattern)

**Where to look:**

- `src/lib/utils/zodToGeminiSchema.ts` — the conversion from Zod to Gemini JSON schema format
- `src/lib/schemas/aiResumeSchema.ts` — the Zod schema sent to Gemini
- Check if any recent Gemini API spec changes broke the schema format

---

### Issue 2 🔴 CRITICAL — Experience Dates are Empty Strings

**What's in Firestore:**

```json
{
  "company": "JPMorgan Chase & Co",
  "role": "Software Engineer III",
  "startDate": "",
  "endDate": "",
  "duration": "01-2024 - Present"
}
```

**What should be there:**

```json
{
  "startDate": "2024-01",
  "endDate": "present",
  "duration": "01-2024 - Present"
}
```

**Root cause:** The AI extraction (degraded fallback path) correctly populates `duration` as a free-text string but fails to parse it into structured `startDate`/`endDate` fields. The primary model (when working) would likely handle this correctly.

**All 4 experience entries affected** (same pattern for IBM, TEKsystems, JPMC Eng II, JPMC Eng III).

---

### Issue 3 🔴 CRITICAL — Dates Render as " – Present" on the Resume Page

**Affected component:** `src/components/resume/ResumeExperienceSection.tsx` line 42:

```tsx
{exp.startDate} – {exp.endDate || "Present"}
```

**What renders:** ` – Present` (blank start date, dash, then "Present")

**Screenshot of impact:** All 4 experience rows show:

```
                                            – Present
                                    – 12-2023
                                    – 10-2020
                                    – 03-2020
```

**Note:** The `LegacyResumeRenderer` correctly uses `{exp.duration}` (which has the right value). But the modern `TemplateRenderer` (masonry-v1) uses `ResumeExperienceSection` which uses the empty fields.

---

### Issue 4 🟠 HIGH — Name Extracted Without Space: "Anilalapati" vs "Anil Alapati"

**Firestore value:** `personalInfo.name = "Anilalapati"`  
**Expected:** `"Anil Alapati"` (Google Auth display name)

**What likely happened:** The AI fallback pipeline extracted the name from the email address prefix `anilalapati` (or username `anilalapati`) and capitalised it as a single word rather than two words. The correct name "Anil Alapati" is in the Google Auth profile (`authUser.displayName`).

**Impact:** The resume header shows the wrong name. The resume title in the dashboard also shows "Anilalapati's Resume".

---

### Issue 5 🟠 HIGH — Phone and Location Not Extracted

**Firestore value:**

```json
{
  "personalInfo": {
    "name": "Anilalapati",
    "email": "Anilalapati.66@gmail.com",
    "phone": "",
    "location": ""
  }
}
```

**Whether the user provided them:** Unknown — conversation sessions are not persisted (Issue 7), so the chat cannot be reviewed. If the user provided phone/location in the chat, the extraction failed. If not provided, the AI should have asked.

**Impact:** Resume shows blank phone and location in the header section.

---

### Issue 6 🟠 HIGH — Zero Achievement Bullets in All Experience Entries

**Firestore value for each of 4 experience entries:**

```json
{
  "description": "Led a team of 5 delivering enterprise automation...",
  "achievements": []
}
```

**Root cause:** The AI fallback pipeline puts all content into `description` as a paragraph but does not split bullet points into the `achievements[]` array. The primary model (when working) would likely structure these correctly.

**Rendering impact:** In `LegacyResumeRenderer.tsx`:

```tsx
{
  exp.achievements && exp.achievements.length > 0 && (
    <ul>
      {exp.achievements.map((ach) => (
        <li>{ach}</li>
      ))}
    </ul>
  );
}
```

→ No bullet list is rendered. The `description` paragraph is shown instead, which is unformatted.

In the `TemplateRenderer` (masonry-v1), the experience `description` field IS shown, so this is less critical there.

---

### Issue 7 🟠 HIGH — Conversation Sessions Never Written to Firestore

**Evidence:** `users/pr2cdNhWizLmzehy6v6oVImRX6C3/conversationSessions` = **0 documents** despite resume being successfully created (meaning multiple conversation turns completed).

**Code location:** `src/lib/services/resumeGenerationOrchestrator.ts` line ~915 — `finally` block:

```typescript
} finally {
  // Fire-and-forget — NOT awaited
  persistConversationSession({...}).catch((err) => { logger.error(...) });

  // IS awaited:
  await persistAIRequestSummary({...});
}
```

**Root cause (serverless lifecycle):** `persistConversationSession` is fire-and-forget (not awaited). In Cloud Run / serverless environments, after the HTTP response is sent to the client, the runtime can reclaim the Node.js process. The `finally` block starts the Firestore write but the process is killed before the write completes.

The `persistAIRequestSummary` IS awaited, which is why monitoring records exist but conversation sessions don't.

**Why this matters:**

- Cannot debug what the user said in the conversation
- No training data for model improvement
- No audit trail for abuse detection
- The observation in the code comment "Sessions are stored per-API-call, not per chat window" is incorrect from the user's perspective — nothing is stored at all

**Fix:** Await `persistConversationSession` or use `waitUntil()` pattern from Next.js 15:

```typescript
// Option A: just await it (slight latency increase)
await persistConversationSession({...});

// Option B: Next.js 15 waitUntil (non-blocking but guaranteed to complete)
import { after } from 'next/server';
after(() => persistConversationSession({...}));
```

---

### Issue 8 🟡 MEDIUM — templateId Not Saved to Firestore

**Firestore value:** `templateId: undefined` (field absent from document)

**Code behavior:** The page falls back to `"masonry-v1"`:

```typescript
const templateId = (resume?.templateId as string) || "masonry-v1";
```

**Problem:** When the user goes back to a resume (or the AI-edit page reads the resume), it doesn't know which template was originally chosen. The template preference is lost on every page refresh.

**Impact:** Minor for now (only one template exists), but will become a bug when multiple templates are supported.

---

### Issue 9 🟡 MEDIUM — userId Not Stored in AI Monitoring Summaries

**Firestore path:** `monitoring/aiRequestSummaries/requests/{requestId}`

**Evidence:** All docs show `userId=?` (field not present).

**Code location:** `src/lib/services/aiMonitoring/persistence.ts` — `summaryDoc` object does not include `userId`:

```typescript
const summaryDoc = removeUndefined({
  requestId: input.context.requestId,
  entrypoint: input.context.entrypoint,
  // ... but NO userId field!
});
```

**Impact:** Cannot trace which user experienced degraded AI performance. Cannot build per-user failure analytics. Cannot correlate tier (`basic`/`premium`) with failure rates.

---

### Issue 10 🟡 MEDIUM — Timestamps Stored as Empty Objects `{}`

**Evidence from Firestore:**

```json
{
  "startedAt": {},
  "completedAt": {},
  "updatedAt": {}
}
```

**Root cause:** `input.context.startedAt` is a JavaScript `Date` object. Firestore Admin SDK stores it as a Firestore `Timestamp` object. When read back by the admin script, `Timestamp.toJSON()` may serialize as `{}` or `{_seconds, _nanoseconds}`. However, when using `admin.firestore.FieldValue.serverTimestamp()` for `updatedAt` it should work — the issue is the raw Date objects for `startedAt`/`completedAt`.

In `persistence.ts`, the timestamps should be converted:

```typescript
// WRONG (current):
startedAt: input.context.startedAt,  // Raw Date object

// RIGHT:
startedAt: admin.firestore.Timestamp.fromDate(input.context.startedAt),
```

**Impact:** Cannot query by time range, cannot calculate latency from stored fields.

---

### Issue 11 🟡 MEDIUM — Resume Created in "draft" With No Publish Flow

**Firestore state:**

```json
{
  "status": "draft",
  "isPublic": false,
  "published": false,
  "visibility": "private"
}
```

**What happens when user visits `/resumes/30` while **not** logged in:**  
→ API returns 404 → Page shows `"Resume not found"`.  
(This is correct security behavior — but confusing if the user shares the URL with a recruiter before publishing.)

**What happens when user visits `/resumes/30` while **logged in** as owner:**  
→ API returns resume with `access: "owner"` → Page renders correctly with PrivacyMenu.

**Missing UX:** After resume creation, there is no modal, toast, or redirect that says:

> "Your resume is ready! It's currently private. Click the 🔒 icon to make it public so recruiters can discover it."

The privacy toggle IS on the page (the lock icon), but most users won't know to look for it.

---

### Issue 12 🔵 LOW — LegacyResumeRenderer Uses `exp.title`, Generated Data Has `exp.role`

**In `LegacyResumeRenderer.tsx`:**

```tsx
<h3 className="text-lg font-bold">{exp.title}</h3>
```

**In generated resume data:**

```json
{ "role": "Software Engineer III" }
```

**Impact:** If the `LegacyResumeRenderer` is used (when template fetch fails or template ID is not `masonry-v1`-compatible), job titles will be blank/undefined.

The modern `TemplateRenderer` correctly uses `exp.role`. The legacy renderer is a fallback path only, but it's on the same page and accessible via `DashboardResume.experience` typing.

---

### Issue 13 🔵 LOW — `read-user-data.js` Queries Wrong Collection for AI Logs

**In `scripts/read-user-data.js`:**

```javascript
// Queries top-level collection (does not exist):
const usageSnap = await db
  .collection("aiUsageLogs")
  .where("userId", "==", uid)
  .limit(5)
  .get();
```

**Actual location of AI request summaries:**

```
monitoring/aiRequestSummaries/requests/{requestId}   ← nested subcollection, no userId filter
```

**Impact:** Admin queries always show "No AI usage logs found" even when the user has generated resumes. The script is misleading.

---

## Resume `resumes/30` — Final Data State

```
Numeric ID    : 30
Name          : Anilalapati  ← WRONG (should be "Anil Alapati")
Email         : Anilalapati.66@gmail.com
Phone         : (empty)  ← MISSING
Location      : (empty)  ← MISSING
Status        : draft    ← not published
isPublic      : false
Template      : (none)   ← defaults to masonry-v1 in UI

Experience (4 entries):
  ✅ Company names correct
  ✅ Role titles correct
  ✅ Descriptions are substantive 1-2 sentence summaries
  ❌ startDate: "" for all 4 entries  ← BROKEN rendering
  ❌ endDate: "" for all 4 entries    ← BROKEN rendering
  ✅ duration: "01-2024 - Present" etc. (correct but only used by LegacyRenderer)
  ❌ achievements: [] for all 4 entries  ← no bullet points

Education (1 entry):
  ✅ SBCE Telangana, B.Tech, Electronics & Telecom, 7.2/10, 2014
  (education rendering uses endDate field too — likely also blank)

Skills (15):
  ✅ Python, React, Node.js, SQL, JavaScript, Firebase, Azure, AWS,
     Microservices, Angular, API, Nextjs, UiPath, Prompt Engineering, Vibe coding
```

---

## Action Items (Prioritized)

### Immediate (blocks usability)

1. **Fix Gemini schema** (`zodToGeminiSchema.ts` + `aiResumeSchema.ts`) so primary model stops returning 400 — this fixes most data quality issues as a downstream effect
2. **Fix date rendering** in `ResumeExperienceSection.tsx` to fall back to `duration` when `startDate` is empty:
   ```tsx
   {exp.startDate || exp.duration?.split(' - ')[0] || ''} – {exp.endDate ? exp.endDate : exp.duration?.includes('Present') ? 'Present' : ''}
   ```
   Or better: parse `duration` into `startDate`/`endDate` at save time in the orchestrator.

### Short-term (data quality & observability)

3. **Await `persistConversationSession`** or use `next/server` `after()` to guarantee session persistence
4. **Add `userId` to `summaryDoc`** in `persistence.ts`
5. **Fix timestamp serialization** — use `admin.firestore.Timestamp.fromDate()` for `startedAt`/`completedAt`
6. **Save `templateId`** to Firestore during resume creation

### UX

7. **Add post-creation publish prompt** — toast or modal after "Resume created!" directing user to publish
8. **Update `read-user-data.js`** to query the correct monitoring subcollection with userId filter
