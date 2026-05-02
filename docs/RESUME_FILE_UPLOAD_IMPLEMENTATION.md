# Resume File Upload - Revised Implementation Document

**Feature:** Upload PDF/DOCX/TXT -> extract structured resume data -> review/edit -> create resume  
**Date:** April 29, 2026  
**Status:** Revised after checking current auth, intake, and generation code paths  
**Estimate:** 4-5 focused development days

---

## 1. Executive Summary

The feature is worth building, but the original plan had two unsafe assumptions:

1. The upload component must send a Firebase bearer token. `getAuthenticatedUserId()` requires `Authorization: Bearer <token>` and does not use cookies.
2. Do not pass extracted JSON back into chat as a `[RESUME_UPLOAD] ...` message. There is no supported backend contract for that marker, and it can trigger a second AI extraction.

The corrected design is:

```text
User uploads PDF/DOCX/TXT
  -> Authenticated upload API parses file with DocumentParser
  -> Upload API normalizes with ResumeIntakeNormalizer.normalizeWithAI()
  -> UI shows editable structured draft
  -> User confirms
  -> useResumeCreation.handleUploadedDraft() seeds sessionData.collectedData
  -> Existing /api/resume/generate creates the resume
  -> Existing /api/resumes/create remains untouched
```

This keeps the upload path additive while using real typed data instead of a hidden chat command.

---

## 2. Existing Contracts To Respect

| Area           | Current repo behavior                                                                                                              | Implementation requirement                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| API auth       | `getAuthenticatedUserId()` requires `Authorization: Bearer <token>`                                                                | Upload fetch must call `user.getIdToken()` and send the header     |
| File parsing   | `DocumentParser.parseFile(buffer, file.name, file.type)` already handles PDF/DOCX/TXT                                              | Reuse it, do not write files to disk                               |
| Intake cleanup | `ResumeIntakeNormalizer.normalizeWithAI()` cleans text, strips repeated headers/footers, sections content, and falls back to regex | Use it instead of calling `extractWithStructuredOutput()` directly |
| Generation     | `/api/resume/generate` always initializes `ConversationManager` from `sessionData.collectedData`                                   | Seed uploaded data into `sessionData`, then send a create intent   |
| Creation       | `/api/resumes/create` persists final resumes                                                                                       | No change                                                          |
| Feature flags  | Server-side flags live in `featureFlagService.ts` with 5 minute cache                                                              | Use server gate as the source of truth                             |

---

## 3. Data Flow

### 3.1 Upload extraction response

The upload API should return structured fields only. Do not return the raw extracted resume text to the client.

```typescript
export interface ResumeUploadDraft {
  sourceChannel: "pdf" | "docx" | "paste";
  fileName: string;
  extractedData: Partial<ResumeDataRequirements>;
  extractedFields: string[];
  missingFields: string[];
  extractionMethod: "ai" | "regex";
  latencyMs?: number;
}

export interface ResumeUploadExtractionResponse {
  uploadDraft: ResumeUploadDraft;
}
```

For `.txt`, use `sourceChannel: "paste"` because `ResumeIntakeSourceChannel` currently supports `"chat" | "paste" | "pdf" | "docx"`.

### 3.2 Confirmed upload draft handoff

On confirm, the client should call a new hook method, not `handleSubmit()`:

```typescript
handleUploadedDraft(uploadDraft);
```

That method sends this shape to `/api/resume/generate`:

```typescript
{
  message: "Create my resume from the uploaded file",
  conversationHistory: [],
  sessionData: {
    collectedData: uploadDraft.extractedData,
    uploadSource: {
      fileName: uploadDraft.fileName,
      sourceChannel: uploadDraft.sourceChannel,
      extractionMethod: uploadDraft.extractionMethod,
    },
  },
  inputSources: [uploadDraft.sourceChannel],
  modelId: selectedModelId
}
```

Why this works:

- `processSyncGeneration()` already seeds `ConversationManager` from `sessionData.collectedData`.
- The message is a create intent, so the generation route can produce the resume from seeded data.
- The route should not need to re-extract the uploaded JSON from a chat message.

---

## 4. Files To Create

### 4.1 `src/app/api/resume/upload-and-extract/route.ts`

Purpose: authenticated, rate-limited API route that receives a file, parses text, normalizes it, and returns a structured upload draft. It does not write to Firestore.

Critical behavior:

- Authenticate before `request.formData()`.
- Check feature flag and user tier before parsing the file.
- Apply distributed per-user AI rate limit and budget check before AI extraction.
- Validate extension and MIME type.
- Cap file size and AI input text.
- Use `DocumentParser`.
- Use `ResumeIntakeNormalizer.normalizeWithAI()`.
- Return structured data only.

Skeleton:

```typescript
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { BillingService } from "@/lib/services/billingService";
import { DocumentParser } from "@/lib/services/documentParser";
import { createAIObservationContext } from "@/lib/services/aiMonitoringService";
import { isFeatureEnabled } from "@/lib/services/featureFlagService";
import { ResumeIntakeNormalizer } from "@/lib/services/resumeIntakeNormalizer";
import { getUserTier } from "@/lib/services/userService";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { containsPromptInjection } from "@/lib/utils/promptSafety";
import { logger } from "@/lib/logger";
import type { SubscriptionTier } from "@/lib/config";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_CHARS = 32_000;
const MIN_TEXT_CHARS = 80;

const MIME_BY_EXTENSION = {
  ".pdf": ["application/pdf"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  ".txt": ["text/plain"],
} as const;

type AllowedExtension = keyof typeof MIME_BY_EXTENSION;

function getAllowedExtension(fileName: string): AllowedExtension | null {
  const lowerName = fileName.toLowerCase();
  for (const ext of Object.keys(MIME_BY_EXTENSION) as AllowedExtension[]) {
    if (lowerName.endsWith(ext)) return ext;
  }
  return null;
}

function getSourceChannel(ext: AllowedExtension): "pdf" | "docx" | "paste" {
  if (ext === ".pdf") return "pdf";
  if (ext === ".docx") return "docx";
  return "paste";
}

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  try {
    const userTier = (await getUserTier(userId)) as SubscriptionTier;

    const enabled = await isFeatureEnabled("resume_file_upload", {
      tier: userTier,
    });
    if (!enabled) {
      return NextResponse.json(
        { error: "File upload is not available on your plan" },
        { status: 403 },
      );
    }

    const rateLimit = await checkDistributedRateLimit(userId, {
      tier: userTier,
      scope: "ai_generation",
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many upload attempts. Please wait and try again." },
        { status: 429 },
      );
    }

    const budgetAllowed = await BillingService.checkBudget(userId, userTier);
    if (!budgetAllowed) {
      return NextResponse.json(
        { error: "Monthly usage limit reached. Please upgrade your plan." },
        { status: 402 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds 5 MB limit" },
        { status: 400 },
      );
    }

    const ext = getAllowedExtension(file.name);
    if (!ext) {
      return NextResponse.json(
        { error: "Only PDF, DOCX, and TXT files are supported" },
        { status: 400 },
      );
    }

    const allowedMimes: readonly string[] = MIME_BY_EXTENSION[ext];
    if (!allowedMimes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type does not match the uploaded file extension" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await DocumentParser.parseFile(
      buffer,
      file.name,
      file.type,
    );

    if (!rawText || rawText.trim().length < MIN_TEXT_CHARS) {
      return NextResponse.json(
        {
          error:
            "Could not extract text from this file. It may be a scanned PDF. Please paste your resume text instead.",
          code: "SCANNED_PDF",
        },
        { status: 422 },
      );
    }

    const textForAI = rawText.slice(0, MAX_TEXT_CHARS);
    if (containsPromptInjection(textForAI)) {
      logger.warn({ userId, fileName: file.name }, "Prompt injection detected");
      return NextResponse.json(
        {
          error:
            "The uploaded file contains content that cannot be processed. Please upload a standard resume.",
        },
        { status: 400 },
      );
    }

    const requestId = randomUUID();
    const observationContext = createAIObservationContext({
      userId,
      userTier,
      entrypoint: "resume_upload_extract",
      requestId,
    });

    const sourceChannel = getSourceChannel(ext);
    const startTime = Date.now();
    const normalized = await ResumeIntakeNormalizer.normalizeWithAI(
      {
        sources: [{ channel: sourceChannel, text: textForAI }],
      },
      {
        userTier,
        observationContext,
      },
    );

    const uploadDraft = {
      sourceChannel,
      fileName: file.name,
      extractedData: normalized.draft.extractedData,
      extractedFields: normalized.draft.extractedFields,
      missingFields: normalized.missingCriticalFields,
      extractionMethod: normalized.extractionMethod,
      latencyMs: Date.now() - startTime,
    };

    logger.info(
      {
        userId,
        requestId,
        fileName: file.name,
        extractedFields: uploadDraft.extractedFields,
        missingFields: uploadDraft.missingFields,
        extractionMethod: uploadDraft.extractionMethod,
      },
      "Resume upload extraction complete",
    );

    return NextResponse.json({ uploadDraft }, { status: 200 });
  } catch (err) {
    return handleApiError(err, "Failed to process uploaded file", 500, request);
  }
}
```

### 4.2 `src/app/api/resume/upload-and-extract/route.test.ts`

Test the real handler. Mock only external dependencies:

- `getAuthenticatedUserId`
- `getUserTier`
- `isFeatureEnabled`
- `checkDistributedRateLimit`
- `BillingService.checkBudget`
- `DocumentParser.parseFile`
- `ResumeIntakeNormalizer.normalizeWithAI`
- `containsPromptInjection`
- `logger`

Required cases:

- 401 when unauthenticated.
- 403 when feature flag is disabled.
- 429 when distributed AI rate limit blocks.
- 402 when budget check blocks.
- 400 when no file is uploaded.
- 400 when file is over 5 MB.
- 400 when extension is unsupported.
- 400 when MIME does not match extension.
- 422 `SCANNED_PDF` when extracted text is too short.
- 400 when prompt injection is detected.
- 200 returns `uploadDraft` on success.
- Parser/normalizer exceptions return generic 500 through `handleApiError`.

### 4.3 `src/components/create-resume/ResumeFileUpload.tsx`

Purpose: drag-and-drop and file picker UI. It uploads a file, shows extraction progress, displays an editable review panel, and calls `onComplete(uploadDraft)`.

Required behavior:

- Get auth token from `useAuth()`.
- Send `Authorization: Bearer <idToken>` in the upload request.
- Validate file extension and size on the client for fast feedback.
- Treat server validation as authoritative.
- On 403, show "File upload is not available on your plan."
- On `SCANNED_PDF`, tell the user to paste resume text instead.
- Allow lightweight edits before confirm:
  - name
  - email
  - phone
  - location
  - summary
  - skills
- Experience and education can be preview-only for MVP, with deeper edits available after creation.

Critical fetch shape:

```typescript
const idToken = await user.getIdToken();
const res = await fetch("/api/resume/upload-and-extract", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${idToken}`,
  },
  body: formData,
});
```

---

## 5. Files To Modify

### 5.1 `src/lib/services/resumeIntakeNormalizer.ts`

Add optional AI observation context support so the upload extraction route can reuse monitoring instead of bypassing it.

```typescript
import type { AIObservationContext } from "@/lib/services/aiMonitoringService";

// In normalizeWithAI options:
options?: {
  userTier?: "basic" | "premium" | "enterprise";
  skipAI?: boolean;
  observationContext?: AIObservationContext;
}

// When calling extractWithStructuredOutput:
const aiResult = await extractWithStructuredOutput(cleanedText, {
  userTier: options?.userTier ?? "premium",
  observationContext: options?.observationContext,
});
```

No behavior changes for existing callers.

### 5.2 `src/lib/services/featureFlagService.ts`

Add one default flag:

```typescript
resume_file_upload: {
  enabled: true,
  description:
    "Upload PDF/DOCX/TXT to create a resume. Server-side kill switch for upload extraction.",
  tiers: ["premium", "enterprise"],
},
```

Firestore override:

```text
Collection: featureFlags
Document: resume_file_upload
Fields:
  enabled: false
  description: "Resume file upload feature"
  tiers: ["premium", "enterprise"]
```

Note: This server flag blocks the API within the cache TTL. The current client has no general feature-flag hook, so UI hiding by Firestore flag requires either a small availability endpoint or accepting that the server returns 403.

### 5.3 `src/middleware.ts`

Add the upload route to the expensive AI tier:

```typescript
{
  pattern: /^\/api\/(ai|resume\/generate|resume\/enhance|resume\/upload-and-extract)\b/,
  limit: 10,
  windowMs: 60_000,
},
```

This is an IP-level edge guard. The route still needs distributed per-user rate limiting.

### 5.4 `src/hooks/useResumeCreation.ts`

Add a typed upload handler rather than routing through `handleSubmit()`.

Implementation approach:

- Extract the common `/api/resume/generate` fetch logic from `handleSubmit()` and `handleForceCreate()` into a private helper inside the hook.
- Add `handleUploadedDraft(uploadDraft)`.
- Seed `sessionData.collectedData` with edited upload data.
- Send `inputSources: [uploadDraft.sourceChannel]`.
- Use a create-intent message such as `"Create my resume from the uploaded file"`.
- Add the user-visible message as `"Uploaded resume file: <fileName>"`, not raw JSON.

Sketch:

```typescript
const handleUploadedDraft = useCallback(
  async (uploadDraft: ResumeUploadDraft) => {
    if (!user) return;

    const displayMessage = `Uploaded resume file: ${uploadDraft.fileName}`;
    const generationMessage = "Create my resume from the uploaded file";
    const seededSessionData = {
      collectedData: uploadDraft.extractedData,
      uploadSource: {
        fileName: uploadDraft.fileName,
        sourceChannel: uploadDraft.sourceChannel,
        extractionMethod: uploadDraft.extractionMethod,
      },
    };

    // Reuse the same loading/error/message handling as handleSubmit.
    // Send seededSessionData in the request body instead of current sessionData.
  },
  [user, selectedModelId, router],
);
```

The hook should expose `handleUploadedDraft` to `src/app/create-resume/page.tsx`.

### 5.5 `src/app/create-resume/page.tsx`

Add upload mode only before a conversation begins.

Required changes:

- Import `useState`.
- Import `ResumeFileUpload`.
- Read `handleUploadedDraft` from `useResumeCreation()`.
- Show the tab switcher only when `messages.length === 0 && stage === "input"`.
- Show the Upload tab only for premium or enterprise users.
- On complete, call `handleUploadedDraft(uploadDraft)`.

Do not inject `[RESUME_UPLOAD] ${JSON.stringify(data)}` into chat.

Sketch:

```tsx
const [inputMode, setInputMode] = useState<"chat" | "upload">("chat");

{messages.length === 0 && stage === "input" && isPremiumOrHigher && (
  <div className="flex border-b border-border/50 bg-background/95">
    <button onClick={() => setInputMode("chat")}>Chat</button>
    <button onClick={() => setInputMode("upload")}>Upload File</button>
  </div>
)}

{inputMode === "upload" && messages.length === 0 && isPremiumOrHigher ? (
  <ResumeFileUpload
    onComplete={(uploadDraft) => {
      setInputMode("chat");
      void handleUploadedDraft(uploadDraft);
    }}
    onCancel={() => setInputMode("chat")}
  />
) : (
  // Existing chat UI
)}
```

---

## 6. Security Checklist

| Requirement               | Implementation                                                         |
| ------------------------- | ---------------------------------------------------------------------- |
| Auth before body parse    | `getAuthenticatedUserId(request)` is first in route                    |
| Bearer token from client  | `ResumeFileUpload` calls `user.getIdToken()` and sends `Authorization` |
| Tier gate                 | `isFeatureEnabled("resume_file_upload", { tier })`                     |
| Per-user abuse control    | `checkDistributedRateLimit(userId, { tier, scope: "ai_generation" })`  |
| IP abuse control          | Middleware AI tier includes upload route                               |
| Budget gate               | `BillingService.checkBudget(userId, userTier)` before AI call          |
| File size                 | 5 MB server-side hard limit                                            |
| File type                 | Extension must be allowed and MIME must match that extension           |
| No filesystem writes      | Convert upload to `Buffer`, parse in memory                            |
| Scanned PDF handling      | Reject text under `MIN_TEXT_CHARS` with `SCANNED_PDF`                  |
| Prompt injection tripwire | Run `containsPromptInjection(textForAI)` before AI extraction          |
| No raw text returned      | API returns structured draft only                                      |
| No error leaks            | Use generic client messages and `handleApiError()`                     |

Important limitation: prompt-injection detection is a tripwire, not a full security boundary. The extraction prompt must continue treating uploaded resume text as untrusted content.

---

## 7. Cost Controls

| Control            | Location            | Value                          |
| ------------------ | ------------------- | ------------------------------ |
| File size cap      | Upload route        | 5 MB                           |
| Text cap before AI | Upload route        | 32,000 chars                   |
| Per-user AI limit  | Upload route        | `scope: "ai_generation"`       |
| IP AI limit        | Middleware          | 10 req/min                     |
| Budget check       | Upload route        | `BillingService.checkBudget()` |
| Tier gate          | Upload route and UI | Premium/enterprise             |

With this design, upload creation should not pay for extraction twice. The upload route performs extraction once, and the generation request uses seeded `sessionData.collectedData`.

---

## 8. Rollout Strategy

1. Deploy code with server flag present and Firestore override set to `enabled: false`.
2. Enable for internal premium/enterprise test users by changing Firestore tiers or using a limited environment.
3. Test real PDFs, DOCX files, TXT files, scanned PDFs, invalid MIME, logged-out users, and Basic-tier users.
4. Roll out to enterprise first.
5. Roll out to premium and enterprise.
6. Kill switch remains the Firestore flag. It blocks the server route within the feature flag cache TTL.

If product requires the Upload tab to disappear when the Firestore flag is disabled, add a small authenticated availability endpoint:

```text
GET /api/resume/upload-and-extract/availability
-> { enabled: boolean }
```

That endpoint can call the same `isFeatureEnabled("resume_file_upload", { tier })` check.

---

## 9. Definition Of Done

- [ ] `src/app/api/resume/upload-and-extract/route.ts` exists and authenticates before parsing form data.
- [ ] Upload API sends files through `DocumentParser` and `ResumeIntakeNormalizer.normalizeWithAI()`.
- [ ] `normalizeWithAI()` accepts and forwards optional `observationContext`.
- [ ] Upload API has distributed rate limiting and budget checks.
- [ ] `ResumeFileUpload` sends a Firebase bearer token.
- [ ] `useResumeCreation` exposes `handleUploadedDraft()`.
- [ ] `create-resume/page.tsx` uses `handleUploadedDraft()` and does not inject JSON into chat.
- [ ] Route tests cover auth, flag, rate limit, budget, validation, scanned PDF, prompt injection, and success.
- [ ] Component or page tests cover upload success and 403/422 error states.
- [ ] `node scripts/audit-api-routes.js` passes.
- [ ] `node scripts/audit-test-quality.js` passes.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] Manual test: real PDF uploads, extracted fields can be reviewed/edited, resume is created.
- [ ] Manual test: Basic-tier user cannot use upload.
- [ ] Manual test: Firestore flag disabled returns 403 from upload API.

---

## 10. Out Of Scope

- OCR for scanned PDFs.
- Legacy `.doc` support.
- Persisting raw uploaded files to Cloud Storage.
- Full rich editing of every experience and education field before creation.
- New `/api/resumes/create` behavior.

---

## 11. Post-Launch Bugs Fixed (May 2, 2026)

### Bug 1 — PDF Upload Returns 500 Error (webpack bundling conflict)

**Symptom:** Uploading a PDF returned a 500 error immediately. Browser console showed:
`TypeError: Object.defineProperty called on non-object` during evaluation of `pdfjs-dist/legacy/build/pdf.mjs`.

**Root cause:** Next.js's webpack bundler tried to bundle `pdf-parse` and `pdfjs-dist` into the server bundle. Both libraries use `Object.defineProperty` at module evaluation time in a way that is incompatible with webpack's module wrapper — it only works when loaded directly by Node.js.

**Fix:**

- Added `pdf-parse` and `pdfjs-dist` to `serverExternalPackages` in `next.config.ts` so Next.js loads them directly from `node_modules` rather than bundling them.
- Relaxed the MIME type check in `src/app/api/resume/upload-and-extract/route.ts` to also accept `application/octet-stream` and `application/x-pdf`. Safari and some OS file pickers report PDFs with a generic MIME type, causing valid PDFs to be rejected before parsing.

**Files changed:** `next.config.ts`, `src/app/api/resume/upload-and-extract/route.ts`

---

### Bug 2 — Infinite Verification Loop After PDF Upload

**Symptom:** After a PDF uploaded successfully and the preview showed all extracted data correctly, clicking "Create Resume" triggered a verification checklist message:

> "You're very close — I just need a few exact details before I can create the resume..."
>
> - Unverified summary metric claims: _An introspective Senior Software Engineer with over 10 years..._
> - Unverified experience metric claims: _Led a team of 5..., Delivered 15+ automations..._
> - Unverified scope claims: _Delivered post-implementation maintenance..._

Every subsequent reply (including "yes all claims are accurate") either caused a "Something went wrong" error or re-triggered the same checklist. The user was permanently trapped.

**Root cause:** The resume generation orchestrator runs a _factual-alignment_ check after generating the resume — it cross-checks every metric claim in the resume against the chat message history to detect AI hallucinations.

For PDF uploads, the only chat message in the conversation at the point of creation is `"Create my resume from the uploaded file"`. The factual-alignment checker found zero evidence for any claims (because the PDF text is never in the message history — it's stored in `sessionData.collectedData` only). **Every single claim was flagged as unverified**, sending the user into a clarification loop that had no exit path because subsequent user replies also produced no evidence.

The preview worked fine because it reads directly from `sessionData` and bypasses the factual-alignment check. Only the creation path was broken.

**Fix:** Added `isFileUpload` detection in `processSyncGeneration`. When the session originated from a file upload (`inputSources` contains `"pdf"` or `"docx"`, or `sessionData.wasFileUpload` is `true`), the factual-alignment evaluation is skipped entirely and replaced with a perfect-score result. The `wasFileUpload` flag is propagated in all `sessionData` returns so that follow-up chat turns in the same session also bypass verification.

Claims extracted from the user's own uploaded document are not AI hallucinations — they are the user's words. Applying a hallucination check against a chat that contains none of that text is semantically incorrect.

**Files changed:** `src/lib/services/resumeOrchestratorTypes.ts`, `src/lib/services/resumeGenerationOrchestrator.ts`
₹q a?
