# SwitchCV Comprehensive Code Review v2 (Consolidated)

**Last Updated:** May 26, 2026  
**Project:** SwitchCV (Next.js 16 + Firebase + Gemini + AI)  
**Status:** Production-capable architecture with documented launch blockers; rerun quality gates before any release  
**Scope:** Consolidation of 104-point audits, security reviews, lessons learned, and production incidents from Feb 6 - May 26, 2026

> **THIS IS YOUR SINGLE SOURCE OF TRUTH.** All coding standards, best practices, critical bugs, known limitations, and deployment procedures are documented here. Supersedes CODING_FINAL_REVIEW_v1.md.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [🔴 CRITICAL ISSUES — Must Fix Before Production](#critical-issues--must-fix-before-production)
3. [🟠 HIGH PRIORITY — Fix Soon After Launch](#high-priority--fix-soon-after-launch)
4. [🚨 MANDATORY RULES (Non-Negotiable)](#-mandatory-rules-non-negotiable)
5. [Security Standards](#security-standards)
6. [API Routes & Authentication](#api-routes--authentication)
7. [Input Validation & Error Handling](#input-validation--error-handling)
8. [Performance Patterns](#performance-patterns)
9. [React Hooks & State Management](#react-hooks--state-management)
10. [TypeScript & Type Safety](#typescript--type-safety)
11. [Testing Standards](#testing-standards)
12. [Logging & Observability](#logging--observability)
13. [Known Bugs & Limitations](#known-bugs--limitations)
14. [Deployment Procedures](#deployment-procedures)
15. [Common Pitfalls for AI Agents](#common-pitfalls-for-ai-agents)
16. [Metrics & Health](#metrics--health)
17. [Quick Wins](#quick-wins)
18. [Operations & Incident Response](#operations--incident-response)
19. [References](#references)

---

## Executive Summary

**Health Score: 7.2/10** — Production-capable with specific gaps.

| Category                 | Score | Status                                                            | Action                                |
| ------------------------ | ----- | ----------------------------------------------------------------- | ------------------------------------- |
| **API Route Compliance** | 10/10 | ✅ All 83 routes pass auth + Zod + error handling                 | Maintain                              |
| **TypeScript**           | 10/10 | ✅ Zero type errors                                               | Maintain                              |
| **Security**             | 6/10  | ⚠️ Strong defaults, but 3 critical bugs + in-memory rate limiting | FIX CRITICAL BUGS                     |
| **Test Coverage**        | 6/10  | ⚠️ 68.6% stmts (threshold: 75%) / 62.4% branches (threshold: 65%) | Add tests for 34 uncovered routes     |
| **Architecture**         | 7/10  | ⚠️ Clean separation, but cache + circuit breaker unused           | Wire cache; add CB to Cloud Functions |
| **Performance**          | 5/10  | ⚠️ $2,190/yr avoidable Firestore costs (cache unused)             | Implement caching                     |
| **Dependencies**         | 6/10  | ⚠️ 8 npm audit vulnerabilities (5 high), 29 outdated packages     | Run `npm audit fix`                   |
| **Linting**              | 8/10  | ⚠️ 0 errors, 44 warnings (mostly `max-lines`)                     | Refactor large files                  |

**Overall Assessment:**

- ✅ **Security foundations are strong** — All API routes authenticated, Zod validated, error handling standardized
- ✅ **Test suite is broad** — historical snapshots show 3,492-4,456 passing tests depending on branch/date; rerun before release
- ⚠️ **Critical bugs exist** — Quota bypass, Gemini schema 400, error leakage in Cloud Functions
- ⚠️ **Unused infrastructure** — Cache layer built but not wired; circuit breaker client-side only
- ⚠️ **Cost waste** — Estimated $2,000/year in avoidable Firestore reads due to missing cache integration

---

## 🔴 CRITICAL ISSUES — Must Fix Before Production

### 1. Gemini Schema Bug Causes All AI Resume Generation to Fail (April 2026)

**Severity:** CRITICAL  
**Status:** CONFIRMED OPEN  
**Discovery:** April 15, 2026 (Resume #30 analysis)  
**Impact:** ALL resume AI enhancement claims are FALSE — system runs in degraded mode

**Problem:**

The Gemini 2.5 Flash API returns 400 `INVALID_ARGUMENT` when sent structured output schema. This causes:

1. **Primary Pipeline Disabled**: `zodToGeminiSchema.ts` → Gemini rejects the schema request
2. **Fallback to Regex**: `resumeGenerationQuality.ts` degrades to v1 regex-based extraction
3. **Data Quality Destroyed**: All extractions run via regex pipeline, producing:
   - Empty `startDate`/`endDate` fields
   - No `achievements[]` array
   - Mangled names: `"Anilalapati"` instead of `"Anil Alapati"`
   - Missing phone, location, education details

**Downstream Issue Cascade (April 15, 2026):**

These are not independent bugs. They are mostly side effects of the Gemini schema failure and degraded regex fallback path:

| #   | Area          | Downstream symptom                                                | Likely relationship to schema bug                         |
| --- | ------------- | ----------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | AI Engine     | Primary AI fails on 100% of tested resume creation requests       | Direct root failure                                       |
| 2   | Data Quality  | `experience[].startDate` and `experience[].endDate` are empty     | Fallback keeps free-text `duration` but misses structure  |
| 3   | Rendering     | Experience dates render as `" – Present"`                        | Renderer trusts empty structured dates                    |
| 4   | Data Quality  | Name becomes `"Anilalapati"` instead of `"Anil Alapati"`          | Fallback appears to infer from email/user handle          |
| 5   | Data Quality  | Phone and location are empty                                      | Fallback extraction misses contact details                |
| 6   | Data Quality  | `achievements[]` is empty for all experience entries              | Fallback stores prose in `description` only               |
| 7   | Observability | Conversation sessions are not persisted to Firestore              | Separate serverless persistence bug, blocks debugging     |
| 8   | Data Model    | `templateId` is not saved on the resume document                  | Separate persistence gap                                  |
| 9   | Observability | `userId` missing from AI monitoring summaries                     | Separate monitoring schema gap                            |
| 10  | Observability | Firestore timestamps serialize as `{}` in admin scripts           | Date/Timestamp serialization gap                          |
| 11  | UX            | Resume is created as draft with no publish prompt                 | Separate product flow gap                                 |
| 12  | Rendering     | Legacy renderer reads `exp.title`, generated data uses `exp.role` | Separate compatibility gap                                |
| 13  | Admin         | `read-user-data.js` queries the wrong AI usage collection         | Separate admin tooling gap                                |

**Important:** Fix the Gemini structured-output schema first, then re-test the other items. Do not spend time patching every data-quality symptom until the primary pipeline is restored; otherwise the fallback path becomes the product.

**Root Cause:**

```typescript
// src/lib/utils/zodToGeminiSchema.ts
// This function produces a schema that Gemini rejects

// Example error from Gemini API (April 15, 2026):
// { error: { code: 400, message: "INVALID_ARGUMENT" } }
```

**How to Verify This Bug Is Real:**

1. Create resume from PDF: `src/__tests__/fixtures/sample_resume.pdf`
2. Check `src/app/api/resume/generate/route.ts` logs
3. Look for: `"Falling back to regex pipeline — Gemini returned error"`
4. Data will be corrupted (empty dates, mangled names)

**Files Affected:**

| File                                               | Role                  | Status                                    |
| -------------------------------------------------- | --------------------- | ----------------------------------------- |
| `src/lib/utils/zodToGeminiSchema.ts`               | Schema converter      | BUG HERE                                  |
| `src/lib/schemas/aiResumeSchema.ts`                | Zod schema definition | Likely incompatible format                |
| `src/lib/services/resumeGenerationOrchestrator.ts` | Orchestrator          | Line ~245: catches 400, degrades to regex |
| `functions/src/resumeService.ts`                   | Cloud Function        | Same fallback pattern                     |

**Fix Steps:**

1. **Debug `zodToGeminiSchema.ts`**: Test output against Gemini docs (https://ai.google.dev/api/rest/v1beta/models/generateContent)
2. **Verify schema format**: Gemini expects `JSONSchema` format, not raw JSON
3. **Compare with working examples**: Check Groq/Claude implementations in `ProviderFallbackChain.ts` to see correct format
4. **Test with simple schema**: Start with basic object, add complexity incrementally
5. **Add unit tests**: `zodToGeminiSchema.test.ts` to validate output format

**Testing After Fix:**

```bash
npm test -- src/lib/utils/__tests__/zodToGeminiSchema.test.ts
# Should show Gemini accepting schema, not 400 error

npm test -- src/lib/services/__tests__/resumeGenerationOrchestrator.test.ts
# Should show primary pipeline used, not fallback
```

**Cost Impact:** While broken, AI enhancement calls cost money while producing garbage output. Fix prevents waste + restores product credibility.

**MUST FIX BEFORE:** Claiming AI resume enhancement works, shipping to production, or processing user PDFs.

---

### 2. Resume Quota Bypass — Active Count vs. Lifetime Count (April 5, 2026)

**Severity:** CRITICAL  
**Status:** FIXED, but pattern documented for future prevention  
**Discovery:** April 5, 2026  
**Impact:** Users bypass tier limits by deleting resumes

**The Bug (Historical):**

```typescript
// WRONG — Resets to 0 after hard delete
const snapshot = await collectionRef(COLLECTIONS.RESUMES)
  .where("userId", "==", userId)
  .count()
  .get();

if (snapshot.data().count >= limit) return 403; // Allows re-creation after delete!
```

**Exploit Path:**

```
Basic user (limit=1)
  → Create resume (count=1)
  → Delete resume (hard delete, count=0)
  → "Create Resume" button re-appears
  → Create again (count=0 < 1) → ALLOWED ✓
  → Unlimited creates by deleting and re-creating
```

**The Fix (Implemented):**

**Rule: Count LIFETIME creations (increments only), not active documents.**

**Files Changed:**

| File                                     | Change                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/services/resumeQuotaService.ts` | NEW: `getLifetimeResumeCount()`, `checkResumeCreationQuota()`                    |
| `src/lib/services/resume/resumeCrud.ts`  | `createResume()` + `saveGeneratedResume()` call `incrementLifetimeResumeCount()` |
| `src/app/api/resumes/create/route.ts`    | Now checks quota for ALL tiers                                                   |
| `src/app/api/resume/generate/route.ts`   | Now checks quota for ALL tiers                                                   |
| `src/app/api/resumes/quota/route.ts`     | NEW: Returns quota status                                                        |
| `src/hooks/useResumeQuota.ts`            | NEW: Client-side quota hook                                                      |
| `src/app/create-resume/page.tsx`         | Redirects if `canCreate=false`                                                   |

**Pattern for All Future Quotas:**

```typescript
// ✅ CORRECT — Lifetime counter approach
const counter = await db.collection("users").doc(userId).get();

const lifetime = counter.data()?.lifetimeResumeCreations ?? 0;
if (lifetime >= tier.limit) return 403;

// Increment only AFTER successful save
await db
  .collection("users")
  .doc(userId)
  .update({
    lifetimeResumeCreations: FieldValue.increment(1),
  });
```

**Why This Works:**

- Lifetime counter **only increments**, never decrements
- Surviving hard deletes, soft deletes, any deletion model
- No migration needed (fallback: `max(lifetime, activeCount)`)
- Atomic operation prevents race conditions

---

### 3. Cloud Functions Error Detail Leakage (April 11, 2026)

**Severity:** CRITICAL  
**Status:** FIXED (April 11, 2026)  
**Impact:** Internal URLs, API keys, database structure exposed to clients

**Affected Services:**

| Service                | Location  | Exposure                                               |
| ---------------------- | --------- | ------------------------------------------------------ |
| **emailService.ts**    | Line 51   | `.message` from `sendgrid` errors leaks API URLs       |
| **jobMatchService.ts** | Line 378  | `.message` from Gemini errors leaks quota/billing info |
| **validation.ts**      | Lines ~40 | `HttpsError(..., error.message)` exposes Zod internals |

**Example Leak (jobMatchService):**

```typescript
// WRONG — Leaks Gemini error to client
throw new functions.https.HttpsError(
  "invalid-argument",
  error.message, // ← Firebase API key, usage quota, region info
);
```

**The Fix:**

All Cloud Functions now use generic messages + server-side logging:

```typescript
// ✅ CORRECT
logger.error({ err }, "Job match generation failed");
throw new functions.https.HttpsError(
  "internal",
  "Unable to generate job matches", // Generic
);
```

**Verify Fix Status:**

```bash
grep -r "error\.message" functions/src/
# Should return NO results in error responses
```

---

### 4. Rate Limiting In-Memory Only (Bypass via Multiple Instances)

**Severity:** CRITICAL  
**Status:** PARTIAL FIX (distributed version built, not wired)  
**Discovery:** March 14, 2026  
**Impact:** Attackers bypass by hitting different serverless instances

**The Problem:**

```typescript
// WRONG — Per-instance memory, no coordination
const limiter = new Map<string, { count: number; reset: number }>();

if (limiter.get(userId)?.count > 10) {
  return 429; // But attacker just hits a different instance!
}
```

With 100 serverless instances, each has independent counters. Attacker can:

- Hit instance-1 with 10 requests
- Hit instance-2 with 10 requests
- ... repeat to bypass rate limit entirely

**Status (March 14, 2026):**

- ✅ **Distributed fix built**: `src/lib/utils/distributedRateLimit.ts` (Firestore-backed, transactional)
- ❌ **Not wired**: Middleware still uses in-memory limiter

**The Solution:**

```typescript
// ✅ CORRECT — Firestore-backed, shared across instances
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  const isAllowed = await checkDistributedRateLimit(
    userId,
    "resume:create",
    { limit: 10, windowMs: 3600000 }, // 10 per hour
  );

  if (!isAllowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }
  // ... proceed
}
```

**Wiring Steps:**

1. **Middleware**: Update `src/middleware.ts` line ~120 to use `checkDistributedRateLimit`
2. **Critical Routes**: Explicitly call distributed limiter on `/api/auth/*`, `/api/ai/*`, `/api/resume/generate`
3. **Testing**: `tests/security/rate-limiting.test.ts` to verify cross-instance coordination

---

### 5. Budget Hard Caps Not Enforced Before AI Calls (March 14, 2026)

**Severity:** CRITICAL  
**Status:** PARTIAL (Search routes check, Resume generation doesn't)  
**Impact:** Can exceed $30/$70 monthly caps on agentic MVP

**Problem:**

Search routes have budget checks:

```typescript
// ✅ Resume search checks budget
if (!(await checkSystemBudget())) return 429;
```

But resume generation doesn't:

```typescript
// ❌ Missing budget check!
export async function POST(request: NextRequest) {
  const response = await gemini.generateText(prompt); // Can exceed cap!
  return NextResponse.json(response);
}
```

**Routes Missing Budget Checks:**

| Route                      | Missing Check                               | Impact                      |
| -------------------------- | ------------------------------------------- | --------------------------- |
| `/api/ai/generate`         | `checkSystemBudget()`                       | Unlimited AI generation     |
| `/api/ai/generate-resume`  | `checkSystemBudget()`                       | Unlimited resume generation |
| `/api/resume/generate`     | `checkSystemBudget()` + `checkUserBudget()` | Tier limits bypassed        |
| `/api/resume/enhance`      | `checkSystemBudget()`                       | Unlimited enhancement       |
| `/api/recruiter/jd-search` | `checkSystemBudget()`                       | Unlimited search            |

**Fix Pattern:**

```typescript
import {
  checkSystemBudget,
  checkUserBudget,
} from "@/lib/services/quotaService";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  // BEFORE ANY AI CALL
  if (!(await checkSystemBudget())) {
    return handleApiError(null, "System quota exceeded", 429, request);
  }
  if (!(await checkUserBudget(userId, tier))) {
    return handleApiError(null, "User quota exceeded", 429, request);
  }

  // NOW safe to call Gemini
  const response = await gemini.generateText(prompt);
  return NextResponse.json(response);
}
```

---

## 🟠 HIGH PRIORITY — Fix Soon After Launch

### 1. Cache Layer Built But Completely Unused ($2,190/yr cost waste)

**Status:** 3 cache services built (March 14, 2026), only 1 in use  
**Impact:** Estimated $2,190/yr in avoidable Firestore read costs

**What Exists:**

| Service           | Purpose                                       | Location                            |
| ----------------- | --------------------------------------------- | ----------------------------------- |
| **cacheService**  | Dual-tier (L1 memory + L2 Firestore) with TTL | `src/lib/services/cacheService.ts`  |
| **semanticCache** | Query normalization + similarity matching     | `src/lib/services/semanticCache.ts` |
| **searchCache**   | LRU with TTL for search results               | `src/lib/services/searchCache.ts`   |

**Currently Used:**

- ✅ **featureFlagService.ts** — Uses cacheService

**Should Use But Doesn't:**

- ❌ Resume reads (5,000+ reads/day possible)
- ❌ User settings fetches (2,000+ reads/day)
- ❌ Search results (1,000+ reads/day)
- ❌ Recruiter profiles (500+ reads/day)

**Wiring Plan:**

```typescript
// Example: Resume reads
import { cacheService } from "@/lib/services/cacheService";

export async function getResume(resumeId: string) {
  return cacheService.get(
    `resume:${resumeId}`,
    () => fetchResumeDocument(resumeId), // Fallback if cache miss
    5 * 60 * 1000, // 5 min TTL
  );
}
```

**Cost Savings Estimate:**

- Baseline Firestore cost: ~$2,190/yr (at current read volume)
- With cache (5 min TTL): ~$876/yr (60% reduction)
- **Annual savings: $1,314**

---

### 2. Circuit Breaker Client-Side Only, Not in Cloud Functions

**Status:** March 14, 2026 discovery  
**Impact:** Single point of failure if Gemini API goes down

**What Exists:**

✅ Client-side:

- `src/lib/services/ai/CircuitBreaker.ts` (failureThreshold=3, resetTimeout=60s)
- `src/lib/services/ai/ProviderFallbackChain.ts` (health-scored provider selection)

❌ Cloud Functions:

- Imports exist but **not actually used** in service handlers
- Single-provider fallback chain (Gemini only, Groq/Claude env vars unused)

**Problem:**

If Gemini fails:

1. Client-side circuit breaker closes ✅
2. But Cloud Functions don't know it failed ❌
3. Cloud Functions still try Gemini ❌
4. Resume generation cascades to failure ❌

**Fix:**

Integrate `ProviderFallbackChain` into Cloud Functions:

```typescript
// functions/src/resumeService.ts
import { ProviderFallbackChain } from "@/lib/services/ai/ProviderFallbackChain";

const aiChain = new ProviderFallbackChain({
  failureThreshold: 3,
  resetTimeout: 60000,
});

export async function generateResume(data: ResumeData) {
  // Use fallback chain instead of direct Gemini call
  const response = await aiChain.call("generateText", [buildPrompt(data)], {
    timeout: 5000,
  });

  return response;
}
```

---

### 3. Vector Search Auto-Indexing Missing

**Status:** March 14, 2026  
**Impact:** Stale search results when resumes updated

**Problem:**

- `functions/src/indexResumeService.ts` has manual `reindexResume()` callable
- But no Firestore trigger to auto-reindex on resume write
- Result: User updates resume → old version still searchable → 24+ hour stale data

**Solution:**

Add Firestore trigger in `functions/src/index.ts`:

```typescript
exports.autoReindexOnResumeUpdate = functions.firestore
  .document("resumes/{resumeId}")
  .onWrite(async (change, context) => {
    const resumeId = context.params.resumeId;
    if (change.after.exists) {
      await indexResumeService.reindexResume(resumeId);
    }
  });
```

---

### 4. npm Audit — 8 Vulnerabilities (5 High)

**Status:** March 14, 2026  
**Fixes Available:** Yes, all have patches

**Vulnerabilities:**

| Package                        | CVE                     | Severity | Fix                |
| ------------------------------ | ----------------------- | -------- | ------------------ |
| express-rate-limit 8.2.0-8.2.1 | IPv4-mapped IPv6 bypass | HIGH     | Upgrade to 8.2.2+  |
| flatted <3.4.0                 | Unbounded recursion DoS | HIGH     | Upgrade to 3.4.0+  |
| tar <=7.5.10                   | Symlink path traversal  | HIGH     | Upgrade to 7.6.0+  |
| hono <4.12.7                   | Prototype pollution     | MODERATE | Upgrade to 4.12.7+ |

**Fix Command:**

```bash
npm audit fix
# Installs patches for all 8 vulnerabilities
# Then test: npm test && npm run build
```

---

### 5. Test Coverage Below Thresholds (6/10)

**Status:** March 14, 2026  
**Gaps:**

| Metric         | Current | Threshold | Shortfall |
| -------------- | ------- | --------- | --------- |
| **Statements** | 68.6%   | 75%       | -6.4%     |
| **Branches**   | 62.4%   | 65%       | -2.6%     |
| **Lines**      | 69.2%   | 75%       | -5.8%     |

**Missing Coverage:**

- **34 API routes** without dedicated test files
- **AI Generation Service**: 58.8% branches (threshold: 85%), 66.7% functions (threshold: 90%)
- **Edge cases**: Retry/backoff, error scenarios, tier restrictions

**Action Plan:**

Create test files for uncovered routes:

```bash
# Find routes without tests
find src/app/api -name "route.ts" | while read f; do
  name=$(echo $f | sed 's|.*/||' | sed 's|\.ts||')
  if [ ! -f "src/__tests__/${name}.test.ts" ]; then
    echo "Missing tests: $f"
  fi
done

# Generate test templates
npm run generate:tests -- --missing-only
```

---

## 🚨 MANDATORY RULES (Non-Negotiable)

**These rules are ENFORCED automatically by pre-commit hooks. Your commit will be REJECTED if you violate them.**

### Rule 1: EVERY API Route MUST Have Authentication

```typescript
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  // Step 1: Auth check FIRST (before parsing body)
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error; // Returns 401

  // Step 2: Parse request body
  try {
    const body = await request.json();
    // ... business logic
    return NextResponse.json({ result }, { status: 200 });
  } catch (err) {
    return handleApiError(err, "Operation failed", 500, request);
  }
}
```

**ONLY exceptions (must add comment explaining why):**

- `/api/health` — public health check
- `/api/system-config` — public app config
- `/api/auth/*` — authentication endpoints themselves
- `/api/user-approval/*/route.ts` — token-based public auth

**WHY:** Two routes shipped without auth in February 2026. An attacker with curl can impersonate any user.

---

### Rule 2: EVERY API Route MUST Validate Input with Zod

```typescript
import { z } from "zod";

const InputSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  age: z.number().int().min(0),
});

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  try {
    const parseResult = InputSchema.safeParse(await request.json());

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }, // ALWAYS 400 for validation errors
      );
    }

    const data = parseResult.data; // ← Type-safe, validated
    // ... use data
  } catch (err) {
    return handleApiError(err, "Operation failed", 500, request);
  }
}
```

**WHY:** Manual `if (!field)` checks miss edge cases. Zod catches everything. Status code 400 (not 500) tells clients it's their fault.

---

### Rule 3: NEVER Leak Error Details to Clients

```typescript
// ❌ WRONG
return NextResponse.json({ error: error.message }, { status: 500 });
return NextResponse.json({ error: `Failed: ${err}` }, { status: 500 });

// ✅ CORRECT
return handleApiError(err, "Operation failed", 500, request);
```

**Pattern:**

- Log the REAL error server-side: `logger.error({ err }, "context")`
- Return a GENERIC message to the client
- NEVER include error.message, stack traces, or stringified errors

**WHY:** Firebase/AI API errors expose internal URLs, credentials, and database structure.

---

### Rule 4: React Hooks — Memoize Context Values and Callbacks

```typescript
// ❌ WRONG (re-renders entire app on every state change)
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);
  const value = {
    user,
    handleLogin: async (email: string) => { /* ... */ },
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ✅ CORRECT
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);

  const handleLogin = useCallback(async (email: string) => {
    /* ... auth logic ... */
  }, []);

  const value = useMemo(
    () => ({ user, handleLogin }),
    [user, handleLogin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

**Pattern:** ALL context providers must:

1. Wrap handler functions in `useCallback()`
2. Wrap the context value object in `useMemo()`
3. NEVER define plain functions without `useCallback`

**WHY:** Without this, every state change re-renders the ENTIRE app (performance death).

---

### Rule 5: Role Changes MUST Use `/api/user/update-role` + Token Refresh

```typescript
// Step 1: Frontend calls role-change endpoint (NOT PUT /api/user/settings)
const response = await fetch("/api/user/update-role", {
  method: "POST",
  body: JSON.stringify({ newRole: "recruiter" }),
});

// Step 2: Backend updates BOTH Firestore AND Firebase Auth custom claims
// (automatic in /api/user/update-role/route.ts)

// Step 3: Frontend refreshes the token
await user?.getIdToken(true); // Force refresh

// Step 4: Frontend reloads or invalidates all SWR caches
window.location.reload(); // or mutate(null);
```

**NEVER:**

- Use `PUT /api/user/settings` for role changes
- Skip token refresh — client will see old role
- Skip page reload — components will render stale data
- Use optimistic updates only

**WHY:** This bug occurred 3 times. Firestore alone is insufficient — Firebase Auth custom claims in JWT token MUST also be updated, or server-side auth sees old role.

**Why It Keeps Recurring:**

| Endpoint                     | Updates                                         | Correct role-change path? |
| ---------------------------- | ----------------------------------------------- | ------------------------- |
| `PUT /api/user/settings`     | Firestore settings fields                       | No; safety net only       |
| `POST /api/user/update-role` | Firestore role fields + Firebase custom claims  | Yes                       |

Developers naturally reach for `/api/user/settings` from the settings page, but role is not just a profile field. It is also an authorization claim embedded in the Firebase JWT, and that token can remain cached for up to 1 hour.

**Prevention Checklist:**

- If code changes `role` or `isRecruiter`, call `/api/user/update-role`.
- Backend must call `setCustomClaims()` for the new role.
- Client must call `user.getIdToken(true)` after the role change.
- Client must reload or invalidate every role-dependent SWR/cache entry.
- Tests must cover both recruiter -> jobseeker and jobseeker -> recruiter.

---

### Rule 6: All String Form Inputs MUST Initialize with Empty Strings

```typescript
// ❌ WRONG (React controlled/uncontrolled warning)
interface Settings {
  displayName?: string; // Optional = DANGER
}
const [settings, setSettings] = useState<Settings>({}); // No defaults
<input value={settings.displayName} /> // Can be undefined!

// ✅ CORRECT (Option 1: Initialize with empty strings)
const [settings, setSettings] = useState({
  displayName: "",
  email: "",
  phone: "",
});

// ✅ CORRECT (Option 2: Async data with defensive operators)
useEffect(() => {
  if (fetchedSettings) {
    setSettings({
      ...fetchedSettings,
      displayName: fetchedSettings.displayName ?? "",
      email: fetchedSettings.email ?? "",
    });
  }
}, [fetchedSettings]);
```

**Pattern:**

- Initialize all `useState` with default values (never empty object)
- Use `?? ""` or `|| ""` for form fields in useEffect
- No optional (`?:`) fields in interfaces used directly in form inputs

**WHY:** Controlled inputs MUST maintain consistent types throughout lifecycle. Even one cycle where value is `undefined` breaks React's input handling.

---

### Rule 7: Auth Ordering — Auth Check BEFORE Body Parse

```typescript
// ❌ WRONG (parses body for unauthenticated users)
const body = await request.json();
const { userId, error } = await getAuthenticatedUserId(request);
if (error) return error;

// ✅ CORRECT (auth first, then parse)
const { userId, error } = await getAuthenticatedUserId(request);
if (error) return error;
const body = await request.json();
```

**WHY:** Body parsing before auth wastes CPU and leaks endpoint behavior to unauthenticated users.

---

### Rule 8: Resume Data Must Use `fetchResumeDocument()` (Handles Legacy Collections)

```typescript
// ❌ WRONG (only checks one collection)
const resume = await db.collection("resumes").doc(id).get();

// ✅ CORRECT (checks both legacy collections)
import { fetchResumeDocument } from "@/lib/utils/api-helpers";

const resume = await fetchResumeDocument(id);
// Automatically queries: resumes → resumeProfiles (legacy fallback)
```

**WHY:** Data migrated from `resumeProfiles` to `resumes` but both collections exist. `fetchResumeDocument()` handles fallback automatically.

### Rule 9: Never Trust Client-Supplied User, Recruiter, or Admin IDs

```typescript
// ❌ WRONG — user can spoof another tenant
const { userId, recruiterId, resumeId } = await request.json();
await updateCandidate(recruiterId, resumeId, data);

// ✅ CORRECT — identity comes from token, ownership is checked server-side
const { userId, error } = await getAuthenticatedUserId(request);
if (error) return error;

const { resumeId } = CreateActionSchema.parse(await request.json());
const resume = await fetchResumeDocument(resumeId);
if (!resume || resume.data?.userId !== userId) {
  return handleApiError(null, "Forbidden", 403, request);
}
```

**Applies to:**

- Recruiter candidate, interview, bulk-action, pipeline, and request-contact routes
- Admin migration/init routes
- Resume/profile/draft reads and writes
- Notification delivery-status and statistics routes
- Any route accepting `userId`, `uid`, `recruiterId`, `candidateId`, or `adminId`

**WHY:** February 2026 reviews found multiple cross-tenant IDOR bugs where authenticated users could act on other recruiters' candidates, interviews, bulk actions, or migrations. Token identity must be the source of truth; body IDs are object identifiers, not authorization proof.

### Rule 10: State-Changing Routes Need CSRF/Origin Protection

```typescript
// Middleware-level rule:
// POST/PUT/PATCH/DELETE require a trusted Origin/Referer unless the request
// is an API client request authenticated only by Authorization: Bearer <token>.
```

**Rules:**

- Do not rely on an in-memory CSRF token store in serverless environments.
- Prefer stateless Origin/Referer validation in `src/middleware.ts` for browser requests.
- Keep bearer-token API client requests outside cookie-based CSRF assumptions.
- CORS must use explicit allowed origins; never use `*` for credentialed routes.
- Keep preview deployment origin rules documented and bounded.

**WHY:** CSRF existed as dead code in February 2026 until middleware enforced it globally. CORS was also historically applied inconsistently across routes.

---

## Security Standards

### 1. Authentication & Authorization

```typescript
// ✅ Always verify user ownership
export async function GET(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  const resumeId = searchParams.get("id");
  const resume = await fetchResumeDocument(resumeId);

  // Verify ownership
  if (resume.data?.userId !== userId) {
    return handleApiError(null, "Forbidden", 403, request);
  }

  return NextResponse.json(resume.data, { status: 200 });
}
```

### 2. Distributed Rate Limiting

```typescript
// ✅ Use Firestore-backed distributed limiter
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  const isAllowed = await checkDistributedRateLimit(userId, "resume:create", {
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });

  if (!isAllowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
}
```

### 3. Budget Enforcement BEFORE AI Calls (CRITICAL)

```typescript
// ✅ Check BOTH system and user budgets
import {
  checkSystemBudget,
  checkUserBudget,
} from "@/lib/services/quotaService";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  // Check BEFORE calling Gemini
  if (!(await checkSystemBudget())) {
    return handleApiError(null, "System quota exceeded", 429, request);
  }
  if (!(await checkUserBudget(userId, tier))) {
    return handleApiError(null, "User quota exceeded", 429, request);
  }

  const response = await gemini.generateText(prompt);
  return NextResponse.json(response);
}
```

**MUST apply to:**

- `/api/ai/generate`
- `/api/ai/generate-resume`
- `/api/resume/generate`
- `/api/resume/enhance`
- `/api/recruiter/jd-search`

### 4. Quota Enforcement — Use Lifetime Counters

```typescript
// ✅ CORRECT — Lifetime counter (never decrements)
import { checkResumeCreationQuota } from "@/lib/services/resumeQuotaService";

const allowed = await checkResumeCreationQuota(userId, userTier);
if (!allowed) return 403;

// After successful save:
await incrementLifetimeResumeCount(userId);
```

**Pattern:**

- Count LIFETIME operations (increment only)
- Never count active documents (resets on delete)
- Handles all tier levels uniformly

### 5. Prompt Injection Detection

```typescript
// ✅ Added to 7 AI routes (April 11, 2026)
import { containsPromptInjection } from "@/lib/utils/promptSafety";

export async function POST(request: NextRequest) {
  const { message, jdText } = await request.json();

  if (containsPromptInjection(message) || containsPromptInjection(jdText)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const response = await gemini.generateText(message);
  return NextResponse.json(response);
}
```

**Protected Routes:**

- `/api/ai/generate`
- `/api/ai/generate-resume`
- `/api/resume/generate*`
- `/api/resumes/[id]/chat`
- `/api/recruiter/jd-search`

### 6. PII Protection in Logs

```typescript
// ✅ Automatic redaction via logger
import { logger } from "@/lib/logger";

const userData = { email: "user@example.com", phone: "555-1234" };
logger.info(userData, "User created"); // Auto-redacts sensitive fields
```

**Redacted patterns:** emails, phones, SSNs, credit cards, IPs, API keys

### 7. CSP Headers (Content Security Policy)

```typescript
// ✅ Tightened img-src in middleware.ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  img-src https://www.google.com https://lh3.googleusercontent.com https://firebasestorage.googleapis.com;
  style-src 'self' 'unsafe-inline';
`;

response.headers.set("Content-Security-Policy", cspHeader);
```

**WHY:** Broad `img-src https:` allows any HTTPS origin. Tighten to specific domains.

### 8. Query-Level Visibility Filtering

```typescript
// ✅ Add .where("isPublic", "==", true) at Firestore query level
export async function search(query: string) {
  let q = db
    .collection("resumes")
    .where("isPublic", "==", true) // ← Query-level filter
    .where("title", ">=", query)
    .limit(50);

  const docs = await q.get();

  // ← Plus post-query filter: isRecruiterSearchableResume()
  const filtered = docs.docs
    .map((d) => d.data())
    .filter((d) => isRecruiterSearchableResume(d));

  return sanitizeResumeForPublicView(filtered);
}
```

**WHY:** Defense-in-depth. Query-level filter reduces reads; post-query filter catches edge cases.

### 9. Session Data Security

**Incident:** January 2, 2026 resume-session leakage. User A's resume creation chat could appear for User B on the same browser because localStorage used one global key.

**Required Pattern:**

```typescript
// WRONG — shared by every browser user
const SESSION_KEY = "resume_creation_session";

// CORRECT — scoped to the authenticated owner
const SESSION_KEY = `resume_creation_session_${user.uid}`;
```

Every browser-persisted session object must include an owner:

```typescript
interface SessionData {
  userId: string;
  messages: Message[];
  stage: "input" | "generating" | "complete";
}

const parsed = JSON.parse(savedSession) as SessionData;
if (parsed.userId !== user.uid) {
  localStorage.removeItem(SESSION_KEY);
  return;
}
```

**Rules:**

- Never store authenticated workflow state under a global localStorage key.
- Always validate `parsed.userId === currentUser.uid` before restoring session data.
- Clear user-scoped session keys on logout.
- Remove legacy global keys during migration.
- API routes behind these sessions must require auth. `/api/resume/generate` must never fall back to `"anonymous"`.

**Why:** Resume chat history can contain PII, work history, compensation hints, contact data, and private job-search context.

### 10. Cloud Run IAM Public Access Model

Cloud Run must allow `allUsers` with `roles/run.invoker` for the SSR website. Firebase Hosting proxies public web traffic to Cloud Run and does not provide end-user IAM credentials.

```text
Public Internet
  -> Cloud Run SSR service (allUsers invoker allowed)
  -> Next.js public/protected route boundary
  -> Firebase Auth JWT verification in API routes
  -> Firestore rules and document ownership checks
  -> Rate limiting in src/proxy.ts or src/middleware.ts
```

**Do not "fix" public Cloud Run access by removing `allUsers`.** That breaks the website. Real application security lives in:

| Layer              | Responsibility                                      |
| ------------------ | --------------------------------------------------- |
| Firebase Auth      | User identity and JWT claims                        |
| API route auth     | `getAuthenticatedUserId()` and role checks          |
| Firestore Rules    | Per-document authorization                          |
| App Check          | Bot abuse reduction for supported routes            |
| Rate limiting      | Abuse control at edge/API layers                    |
| CSP headers        | Browser-side XSS blast-radius reduction             |

**Operational check:**

```bash
gcloud run services get-iam-policy ssrswitchcve5136 \
  --region=us-central1 \
  --project=switchcv-e5136
```

### 11. Secret Rotation Strategy

Secret management is incomplete without rotation metadata, alerts, and a tested procedure.

| Secret                    | Rotation period | Notes                                  |
| ------------------------- | --------------- | -------------------------------------- |
| `GEMINI_API_KEY`          | 90 days         | Primary AI generation key              |
| `OPENAI_API_KEY`          | 90 days         | AI fallback key                        |
| `GROQ_API_KEY`            | 90 days         | AI fallback key                        |
| `HUGGINGFACE_TOKEN`       | 90 days         | Optional AI key                        |
| `TOKEN_SECRET`            | 30 days         | JWT/token signing, highest rotation    |
| `FIREBASE_ADMIN_SDK_KEY`  | 180 days        | Admin SDK, rotate less frequently      |

**Required Implementation:**

- Store secret values in Firebase Secret Manager, not committed files.
- Use a `secretManagerService` with short TTL caching to avoid per-request secret fetch cost.
- Track `lastRotated`, `nextRotation`, `version`, and `rotatedBy` metadata.
- Run a scheduled Cloud Function daily to alert when any secret is within 7 days of rotation.
- Keep previous versions available long enough for rollback, then disable old versions.
- Log secret access metadata, never secret values.

**Manual rotation shape:**

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase deploy --only functions
```

After rotation, run the affected smoke tests and verify AI/auth flows before disabling the previous version.

### 12. Token Security

Tokens must be treated as credentials even when they are short-lived.

**Rules:**

- Store password reset, email verification, recruiter access, approval, and one-time action tokens hashed, not raw.
- Never log raw tokens or include them in error responses.
- Expiration must use Firestore `Timestamp` or a consistently parsed epoch value. Do not overwrite expiration with "now" during persistence.
- Verification must handle Firestore `Timestamp`, ISO strings, and legacy numeric values during migrations.
- IP allowlists must use trusted proxy headers only when the hosting layer is configured to provide them.
- Token verification should always return generic success/failure messages to avoid account enumeration.

**Historical failures:** February 2026 reviews found raw recruiter access tokens in Firestore, raw security tokens in logs, password/email token plaintext storage, and incompatible expiration parsing.

### 13. Firestore Rules & Query Safety

Firestore rules must be explicit and defensive.

**Rules:**

- End every rules file with a default deny-all fallback:

```javascript
match /{document=**} {
  allow read, write: if false;
}
```

- Avoid broad recursive wildcards such as `profiles/{userId}/{document=**}` unless every subcollection is intentionally covered.
- Add ownership checks for every user-owned collection and recruiter-owned subcollection.
- Add query-level filters such as `where("userId", "==", userId)` and `where("isPublic", "==", true)` before reading data.
- Add `.limit()` to every collection query unless it is a bounded single-document lookup.
- Deploy Firestore indexes before functions/hosting when a release adds or changes composite queries.

**Historical failures:** Reviews found overbroad analytics writes, missing rules for new collections, recursive wildcard risk, and unbounded scans in admin/notification/access-status paths.

### 14. Billing & Quota Correctness

Billing and quota logic must be centralized enough that it cannot drift across app and function code.

**Rules:**

- Keep one authoritative quota/billing behavior layer, or document a narrow split between web app and Cloud Functions responsibilities.
- Budget checks must fail closed for spend-control paths. If budget state cannot be loaded, do not make the AI call.
- Reserve quota only after validating user, role, resume/profile ownership, duplicate-pending status, and input schema.
- Refund or roll back quota if a downstream Firestore write fails after quota reservation.
- Monthly rollover must be transactionally safe or partitioned by billing month.
- Billing shards should be bounded and read with defensive limits.

**Historical failures:** Duplicate `billingService.ts` implementations created drift risk, contact quota was consumed too early, and monthly rollover was flagged as race-prone around boundary writes.

### 15. App Check & Abuse-Prone Functions

Use App Check and explicit rate limiting for routes/functions that can spend money, send email, or expose search.

**Applies to:**

- AI generation, resume enhancement, vector search, and recruiter JD search
- Email resend / verification / approval flows
- Admin suspicious-activity notification flows
- Public or token-based approval endpoints

**Rules:**

- App Check is defense-in-depth, not a substitute for auth or role checks.
- Email sending routes must have per-user and per-IP rate limits.
- Admin notification routes must require admin role or trusted internal caller identity.
- All callable/HTTP Cloud Functions exposed to clients need explicit auth or a documented public-token/HMAC model.

---

## API Routes & Authentication

### Status Codes (REQUIRED)

| Code | Use Case                        | Example                        |
| ---- | ------------------------------- | ------------------------------ |
| 200  | Success                         | Resume created, data fetched   |
| 201  | Created                         | New record added               |
| 204  | Success, no content             | Deleted successfully           |
| 400  | Validation error (CLIENT fault) | Missing email, invalid format  |
| 401  | Unauthorized (no/invalid token) | Token expired                  |
| 403  | Forbidden (no permission)       | User can't delete other's data |
| 404  | Resource not found              | Resume ID doesn't exist        |
| 429  | Rate limited                    | Too many requests              |
| 500  | Server error (SERVER fault)     | Database connection failed     |

### Error Response Format

```typescript
// ✅ Use handleApiError helper
import { handleApiError } from "@/lib/utils/api-helpers";

try {
  // ... logic
} catch (err) {
  return handleApiError(err, "Operation failed", 500, request);
}

// Returns to client: { "error": "Operation failed" }
// Real error logged with full context server-side
```

### File Upload Pattern (Critical)

**Contract:** Upload is an authenticated extraction path that returns a structured draft. It must not send raw extracted JSON back into the chat as a hidden marker.

```text
User uploads PDF/DOCX/TXT
  -> API authenticates with Firebase bearer token
  -> API parses file with DocumentParser
  -> API normalizes with ResumeIntakeNormalizer.normalizeWithAI()
  -> UI shows editable structured draft
  -> User confirms
  -> useResumeCreation.handleUploadedDraft() seeds sessionData.collectedData
  -> /api/resume/generate creates the resume from seeded data
```

**Frontend requirement:** `getAuthenticatedUserId()` expects `Authorization: Bearer <token>`. Cookies are not enough.

```typescript
const idToken = await user.getIdToken();
const formData = new FormData();
formData.append("file", file);

const res = await fetch("/api/resume/upload-and-extract", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${idToken}`,
  },
  body: formData,
});
```

**Backend route shape:**

```typescript
export async function POST(request: NextRequest) {
  // Step 1: Auth FIRST, before formData()
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const ext = getAllowedExtension(file.name);
    if (!ext) {
      return NextResponse.json(
        { error: "Only PDF, DOCX, and TXT files are supported" },
        { status: 400 },
      );
    }

    if (!isAllowedMime(ext, file.type)) {
      return NextResponse.json(
        { error: "File type does not match the uploaded file extension" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await DocumentParser.parseFile(buffer, file.name, file.type);
    const normalized = await ResumeIntakeNormalizer.normalizeWithAI({
      sources: [{ channel: sourceChannelFor(ext), text: rawText }],
    });

    return NextResponse.json({
      uploadDraft: {
        sourceChannel: sourceChannelFor(ext),
        fileName: file.name,
        extractedData: normalized.draft.extractedData,
        extractedFields: normalized.draft.extractedFields,
        missingFields: normalized.missingCriticalFields,
        extractionMethod: normalized.extractionMethod,
      },
    });
  } catch (err) {
    return handleApiError(err, "Failed to process uploaded file", 500, request);
  }
}
```

**Critical Details:**

- Authenticate before `request.formData()` to avoid unauthenticated CPU/file parsing.
- Upload fetch must send `Authorization: Bearer ${await user.getIdToken()}`.
- Validate extension and MIME type. Safari may send `application/octet-stream`; decide whether to allow it by extension and document the exception.
- Use `DocumentParser.parseFile()`, not a one-off parser.
- Use `ResumeIntakeNormalizer.normalizeWithAI()`, not direct schema extraction from the upload route.
- Return structured draft data only; do not return raw extracted resume text to the browser.
- Do not inject `[RESUME_UPLOAD] ${JSON.stringify(data)}` into chat. There is no backend contract for that marker and it can trigger duplicate extraction.
- Add parser packages to `serverExternalPackages` in `next.config.ts`: `["pdf-parse", "pdfjs-dist"]`.
- Add route tests for 401, feature-flag disabled, rate limit, budget block, no file, oversized file, unsupported extension, MIME mismatch, scanned/short text, prompt injection, parser failure, and success.

### Cache-Control Headers on GET Routes

```typescript
// ✅ Set Cache-Control headers (34 routes corrected April 2026)

// Private user data
return NextResponse.json(userData, {
  headers: { "Cache-Control": "private, no-store" },
});

// Public health endpoint
return NextResponse.json(
  { status: "ok" },
  {
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
    },
  },
);

// Public templates
return NextResponse.json(templates, {
  headers: {
    "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
  },
});
```

### Auth, Approval, and Email Flow Lessons

Auth bugs often look like frontend routing bugs even when the root cause is config or backend state.

**Google Sign-In / Approval Gate Rules:**

- Pending Google users must not reserve usernames before approval.
- Declined users must release any reserved username.
- Redirect decisions must wait for profile/user initialization to complete; avoid racing `onAuthStateChanged` against server setup.
- `needsUsername`, `approvalStatus`, and role transitions must be tested together.

**Email Verification Rules:**

- `NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION=true` is development-only. It must be absent in production.
- Verification and approval links must use a configured base URL, not a hard-coded project ID map that throws for unknown projects.
- Centralize sender/from/reply-to addresses in config. Do not scatter `support@...` or `admin@...` literals.
- Custom-token verification flows must be monitored for Firebase API rate limits and email delivery failures.
- Email resend endpoints need rate limits and generic responses.

**Operational check:** after auth or email changes, test password signup, Google signup, pending approval, declined approval, email resend, verification click-through, and logout/login refresh.

---

## Input Validation & Error Handling

### Zod Schema Best Practices

```typescript
// ✅ Define schemas in src/lib/schemas/
import { z } from "zod";

export const CreateResumeSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(10),
  userId: z.string().uuid(),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
});

export type CreateResumeInput = z.infer<typeof CreateResumeSchema>;

// ✅ In your route
const parseResult = CreateResumeSchema.safeParse(await request.json());
if (!parseResult.success) {
  return NextResponse.json(
    { error: "Invalid input", details: parseResult.error.flatten() },
    { status: 400 },
  );
}
const data = parseResult.data;
```

### Request Size Limits

```typescript
const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

if (
  request.headers.get("content-length") &&
  parseInt(request.headers.get("content-length")!) > MAX_BODY_SIZE
) {
  return handleApiError(null, "Request body too large", 413, request);
}
```

---

## Performance Patterns

### 1. Caching Strategy (Built but Unused)

```typescript
// ✅ Wire cache into service layer
import { cacheService } from "@/lib/services/cacheService";

async function getResume(id: string) {
  return cacheService.get(
    `resume:${id}`,
    () => fetchResumeDocument(id),
    5 * 60 * 1000, // 5 min TTL
  );
}
```

**Status:** Services exist but only wired to feature flags. **ACTION:** Wire into resume reads, user settings, search.

**Wiring Checklist:**

| Flow                 | Cache key shape                 | TTL       | Invalidation trigger                         |
| -------------------- | ------------------------------- | --------- | -------------------------------------------- |
| Resume read          | `resume:${resumeId}`            | 5 min     | Resume update/delete/publish toggle          |
| User settings        | `user-settings:${userId}`       | 5 min     | Settings save, role change, logout           |
| Recruiter profile    | `recruiter-profile:${userId}`   | 5 min     | Profile save                                 |
| Search results       | `search:${normalizedQueryHash}` | 1-5 min   | Resume publish/unpublish or index refresh    |
| Feature flags        | `feature-flag:${flagName}`      | 5 min     | Admin flag update                            |

**Rules:**

- Cache at the service layer, not inside UI components.
- Never cache private user data under keys missing `userId`.
- Return stale data only where the product can tolerate it; never for role, billing, auth, or quota decisions.
- Invalidate immediately after writes. Do not wait for TTL on user-visible mutations.
- Keep distributed rate limits and quota counters out of general-purpose caches.

### 2. Pagination (Never Unbounded)

```typescript
// ✅ Always use limit + cursor
export async function search(
  query: string,
  cursor?: string,
  limit: number = 20,
) {
  let q = db
    .collection("resumes")
    .where("title", ">=", query)
    .limit(limit + 1); // Extra to detect more

  if (cursor) {
    const lastDoc = await db.collection("resumes").doc(cursor).get();
    q = q.startAfter(lastDoc);
  }

  return q.get();
}
```

### 3. SWR Polling Intervals (Minimum 60 seconds)

```typescript
// ❌ WRONG (30 second interval)
const { data } = useSWR("/api/data", fetcher, {
  dedupingInterval: 30000, // ← Too fast for Firestore reads
});

// ✅ CORRECT (60 second minimum)
const { data } = useSWR("/api/data", fetcher, {
  dedupingInterval: 60000, // 1 minute minimum
  revalidateOnFocus: false, // Don't revalidate on tab switch
});
```

**WHY:** Firestore costs scale with read volume. 60s minimum prevents excessive polling.

### 4. Lazy Loading Components

```typescript
const HeavyComponent = lazy(() => import('./HeavyComponent'));

export function Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 5. Circuit Breaker for AI Calls (Client-Side Works, Cloud Functions Missing)

```typescript
// ✅ Client-side uses fallback chain
import { getAIResponse } from "@/lib/services/ai/providerFallbackChain";

const response = await getAIResponse(prompt, {
  providers: ["gemini", "groq", "openai"],
  timeout: 5000,
});
```

**ACTION:** Integrate into Cloud Functions (`functions/src/resumeService.ts`, etc.)

### 6. Serverless & Firestore Correctness

Serverless runtimes make background work and in-memory state unreliable.

**Rules:**

- Do not use fire-and-forget writes for data that must exist. `await` them or use `after()`/task queues with a completion guarantee.
- Firestore triggers must be idempotent. Store and check `context.eventId` or an equivalent idempotency key with TTL.
- Long-running jobs should use Cloud Tasks or status documents instead of direct long HTTP calls.
- Avoid Firestore hotspotting by sharding high-write counters and logs.
- Do not keep correctness-critical state in process memory: rate limits, CSRF tokens, idempotency records, job state, and quotas must be shared.
- Debounce logic for indexing must not suppress real content changes. Prefer content-diff checks or delayed reindex jobs.
- Always cap vector search results and collection group reads.

**Historical failures:** Conversation persistence was fire-and-forget, in-memory rate limiting was bypassable across instances, CSRF token storage was not serverless-safe, resume indexing debounce could suppress updates, and high-volume counters required sharding.

### 7. Prompt & AI Operations

AI behavior needs versioning and observability like code.

**Rules:**

- Prompt templates should have names and versions. Hardcoded prompt changes must be treated as behavior changes.
- Persist `requestId`, `userId`, model, prompt version, fallback status, failure code, latency, and cost for AI calls.
- Cap input/output tokens before model calls.
- Validate structured output with Zod before saving.
- Prompt injection checks must cover both user prompts and data fields loaded from resumes, JDs, uploads, or Firestore.
- Use jittered retries for transient provider failures, then fallback chain/circuit breaker.

**Open improvement:** Dotprompt or another prompt registry is not required for MVP, but prompt version metadata should be recorded before serious experimentation.

### 8. Bundle, Runtime, and UI Quality Checks

Performance regressions are often deployment/runtime problems, not just React code problems.

**Rules:**

- Track SSR bundle size and deploy time after dependency or media-heavy changes.
- Use `next/image` or an equivalent optimized image path for production images.
- Lazy-load heavy renderers and demo-only components; resume templates should not all load if only one template is displayed.
- Keep parser packages such as `pdf-parse` and `pdfjs-dist` in `serverExternalPackages` where required by Next/Firebase SSR.
- Re-run accessibility checks after dashboard/recruiter UI changes. Spinners need `role="status"`/`aria-live`; decorative icons/SVGs need `aria-hidden`.
- Maintain a manual major-version migration list for Next.js, TypeScript, lucide, marked, lint-staged, and Firebase tooling.

---

## React Hooks & State Management

### Custom Hook Pattern

```typescript
// ✅ Memoize returned functions
export function useSearch() {
  const [results, setResults] = useState([]);

  const search = useCallback(async (query: string) => {
    const res = await fetch(`/api/search?q=${query}`);
    setResults(await res.json());
  }, []);

  return useMemo(() => ({ results, search }), [results, search]);
}
```

### Context Provider Pattern

```typescript
// ✅ Memoize context value
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string) => {
    // ... auth logic
  }, []);

  const logout = useCallback(async () => {
    // ... logout logic
  }, []);

  const value = useMemo(
    () => ({ user, login, logout }),
    [user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

---

## TypeScript & Type Safety

### Type Strictness

```typescript
// ✅ In tsconfig.json
"strict": true,
"strictNullChecks": true,
"strictFunctionTypes": true,
"noImplicitAny": true,
"noImplicitThis": true

// ✅ Explicit return types
export async function getUser(id: string): Promise<User | null> {
  // ...
}

// ✅ Discriminated unions
type Action =
  | { type: 'LOGIN'; payload: LoginPayload }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_PROFILE'; payload: ProfilePayload };
```

### No `any` Type (BLOCKED in pre-commit)

```typescript
// ❌ BLOCKED
const data: any = fetchData();

// ✅ CORRECT
interface UserData {
  id: string;
  name: string;
}
const data: UserData = fetchData();
```

---

## Testing Standards

### API Route Testing

```typescript
// ✅ Tests MUST call actual handler
import { POST } from "@/app/api/resumes/create/route";

describe("/api/resumes/create", () => {
  it("returns 400 on missing title", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/resumes/create",
      {
        method: "POST",
        body: JSON.stringify({
          /* missing title */
        }),
        headers: { Authorization: "Bearer valid-token" },
      },
    );

    // Mock getAuthenticatedUserId
    jest.mock("@/lib/utils/api-helpers", () => ({
      getAuthenticatedUserId: jest.fn(() => ({
        userId: "test-user",
        error: null,
      })),
    }));

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

### Test Quality Requirements

✅ **MUST:**

- Call actual route handlers (not just test request construction)
- Assert on response status AND body content
- Mock `getAuthenticatedUserId` properly
- Test both success and failure paths

❌ **NEVER:**

- Assert only on `request.method`
- Use `expect(true).toBe(true)` as placeholder
- Leave test bodies empty
- Swallow exceptions

---

## Logging & Observability

### Structured Logging with Pino

```typescript
// ✅ Use logger for all events
import { logger } from "@/lib/logger";

logger.info({ userId, action: "resume_created" }, "Resume created");
logger.warn({ resumeId }, "Resume soft-deleted");
logger.error({ err }, "Gemini API failed");

// ✅ PII is auto-redacted
logger.info({ email: "user@example.com" }, "User registered");
// Logged as: { email: "***@example.com" }
```

### PII Redaction Contract

`src/lib/logger.ts` sanitizes log payloads automatically. Resume content and contact data must never appear in application logs, Sentry context, or API error responses.

**Redacted patterns:**

| Data type      | Example input              | Logged value            |
| -------------- | -------------------------- | ----------------------- |
| Email          | `john@example.com`         | `[EMAIL_REDACTED]`      |
| Phone          | `555-123-4567`             | `[PHONE_REDACTED]`      |
| SSN            | `123-45-6789`              | `[SSN_REDACTED]`        |
| Credit card    | `1234 5678 9012 3456`      | `[CARD_REDACTED]`       |
| IP address     | `192.168.1.100`            | `192.168.***.***`       |
| Resume fields  | `resumeContent`, `skills`  | `[REDACTED]`            |
| Secrets/tokens | `apiKey`, `token`, `secret` | `[REDACTED]`            |

```typescript
logger.error({
  userId,
  resumeContent: "John Doe\njohn@example.com\n555-123-4567",
  error: "Parse failed",
});
// Safe log payload:
// { userId, resumeContent: "[REDACTED]", error: "Parse failed" }
```

**Rules:**

- Use `logger.info/warn/error`; do not use `console.log` in production paths.
- If sending data to Sentry, PostHog, or another vendor, run `sanitizeForLogging()` first or configure equivalent `beforeSend` sanitization.
- Add new sensitive field names to the `SENSITIVE_FIELDS` set in `src/lib/logger.ts`.
- Add tests in `src/__tests__/lib/logger-pii-redaction.test.ts` for any new redaction pattern.

**Current coverage:** `PII_REDACTION_IMPLEMENTATION.md` records 37/37 logger redaction tests passing.

### Error Monitoring (Sentry)

```typescript
// ✅ Capture critical errors
import * as Sentry from "@sentry/nextjs";

try {
  // ... code
} catch (err) {
  Sentry.captureException(err, {
    level: "error",
    tags: { route: "/api/resume/generate" },
  });

  return handleApiError(err, "Operation failed", 500, request);
}
```

### Correlation IDs and Release Tags

Every production request that crosses API routes, Cloud Functions, Firestore, and external providers should be traceable.

**Rules:**

- Generate or propagate a `requestId` for API calls and AI operations.
- Include `requestId`, route/function name, user tier, model/provider, and failure code in logs.
- Sentry client/server/edge configs must include `environment` and `release` tags.
- Do not put PII into tags; tags are indexed and easier to leak via dashboards.
- For incident debugging, logs should answer: who was affected, which route/function failed, which provider failed, and whether fallback succeeded.

---

## Known Bugs & Limitations

### 1. ⚠️ Gemini Schema 400 Error (CRITICAL, OPEN)

**Status:** CONFIRMED OPEN  
**Impact:** All resume AI enhancement uses degraded (regex) pipeline  
**Files:** `zodToGeminiSchema.ts`, `aiResumeSchema.ts`, `resumeGenerationOrchestrator.ts`  
**Data Quality:** Extracted resumes have empty dates, mangled names, missing achievements  
**Action:** See [Critical Issues Section 1](#1-gemini-schema-bug-causes-all-ai-resume-generation-to-fail-april-2026)

**April 15 Resume #30 issue bundle:**

1. Primary AI model fails on every tested request and runs degraded.
2. Experience dates are persisted as blank `startDate`/`endDate`.
3. Experience renderer shows `" – Present"` for blank dates.
4. Name extraction produced `"Anilalapati"` instead of `"Anil Alapati"`.
5. Phone and location were not extracted.
6. `achievements[]` is empty for every experience entry.
7. Conversation sessions were not written to Firestore because persistence was fire-and-forget.
8. `templateId` was not persisted.
9. `userId` was absent from AI monitoring summaries.
10. Timestamps serialized as `{}` in admin reads.
11. Resume was created as private draft with no publish prompt.
12. Legacy renderer reads `exp.title`; generated data uses `exp.role`.
13. `read-user-data.js` queries the wrong collection for AI logs.

**Triage rule:** Fix the Gemini schema and re-run the creation flow before treating items 2-6 as separate bugs. Items 7-13 are real follow-up issues even after the schema is fixed.

### 2. ⚠️ Rate Limiting In-Memory Only (CRITICAL, WIRED FIX NEEDED)

**Status:** Distributed fix built (`distributedRateLimit.ts`), not wired to middleware  
**Impact:** Attackers bypass by hitting different instances  
**Files:** `src/middleware.ts`, `src/lib/utils/distributedRateLimit.ts`  
**Action:** Wire distributed limiter to middleware

### 3. ⚠️ Budget Checks Missing on 5 Routes (CRITICAL, WIRED FIX NEEDED)

**Status:** Search routes check, resume generation doesn't  
**Impact:** Can exceed $30/$70 monthly caps  
**Routes:** `/api/ai/generate`, `/api/ai/generate-resume`, `/api/resume/generate`, `/api/resume/enhance`, `/api/recruiter/jd-search`  
**Action:** Add `checkSystemBudget()` and `checkUserBudget()` to all routes

### 4. ⚠️ Cache Layer Unused ($2,190/yr cost waste)

**Status:** 3 cache services built, only 1 in use  
**Impact:** Avoidable Firestore read costs  
**Files:** `src/lib/services/cacheService.ts`, `semanticCache.ts`, `searchCache.ts`  
**Action:** Wire into resume reads, user settings, search results

### 5. ⚠️ Circuit Breaker Only Client-Side

**Status:** Cloud Functions don't use `ProviderFallbackChain`  
**Impact:** Single point of failure if Gemini down  
**Files:** `functions/src/resumeService.ts`, `jobMatchService.ts`  
**Action:** Integrate `ProviderFallbackChain` into Cloud Functions

### 6. ⚠️ Vector Search Auto-Indexing Missing

**Status:** Manual `reindexResume()` only  
**Impact:** Stale search results after resume updates  
**Files:** `functions/src/indexResumeService.ts`  
**Action:** Add Firestore trigger to auto-reindex on write

### 7. ⚠️ npm Audit Vulnerabilities (8 total, 5 high)

**Status:** All have fixes available  
**Action:** Run `npm audit fix`

### 8. ⚠️ Test Coverage Below Thresholds

**Status:** 68.6% statements (threshold 75%), 62.4% branches (threshold 65%)  
**Gap:** 34 API routes without dedicated tests  
**Action:** Generate test templates for uncovered routes

### 9. ⚠️ ESLint `max-lines` Warnings (44 total)

**Status:** 19 files exceed 300-line limit, largest is 1,132 lines  
**Action:** Refactor large services into smaller modules

### 10. ⚠️ SWR Polling Interval Violation

**Status:** `useAiMonitoring.ts` line 41: `dedupingInterval: 30000` (should be 60000)  
**Action:** Change to `dedupingInterval: 60000`

### 11. ⚠️ Secret Manager Persistence/Audit Workflow May Be Partial

**Status:** May 25 review flagged secret metadata and access-log persistence TODOs  
**Impact:** Rotation and audit logging can look implemented while not persisting required metadata  
**Files:** `src/lib/services/secretManagerService.ts`  
**Action:** Verify `secretMetadata` and `secretAccessLogs` writes exist, have retention policy, and are covered by tests

### 12. ⚠️ Billing Logic Drift Risk

**Status:** Multiple reviews found duplicate billing service implementations  
**Impact:** App and Cloud Functions can diverge on quota, rollover, refund, and budget-fail behavior  
**Files:** `src/lib/services/billingService.ts`, `functions/src/services/billingService.ts`, `functions/src/billingService.ts`  
**Action:** Consolidate behavior or document strict ownership boundaries and add shared tests

### 13. ⚠️ Auth/Approval Edge Cases Need Regression Tests

**Status:** Google sign-in, approval gate, username reservation, and email verification had repeated edge-case failures  
**Impact:** Users can get stuck pending approval, reserve usernames before approval, or receive broken links  
**Action:** Add tests for pending/approved/declined Google users, username release on decline, project base URL fallback, and production skip-verification flag absence

---

## Deployment Procedures

### Pre-Deployment Checklist

```bash
# 1. Quality gates pass
npm run quality
# Should show: 0 errors, 0 critical issues

# 2. Tests pass
npm test -- --watch=false --ci
# Should show: 4,456 passing, 0 failing

# 3. Type safety
npx tsc --noEmit
# Should show: 0 errors

# 4. Audit pass
node scripts/audit-api-routes.js
# Should show: 0 critical/high issues

# 5. Dependencies
npm audit
# Should show: 0 vulnerabilities after `npm audit fix`

# 6. Firestore indexes
firebase deploy --only firestore:indexes
# MUST deploy first before functions/hosting

# 7. Functions
cd functions && npm ci && npm run build && firebase deploy --only functions

# 8. Hosting
npm ci && npm run build && firebase deploy --only hosting
```

### Deployment Order (CRITICAL)

1. **Firestore indexes** (`firebase deploy --only firestore:indexes`)
2. **Cloud Functions** (`firebase deploy --only functions`)
3. **Hosting** (`firebase deploy --only hosting` or Vercel)

**WHY:** Indexes must exist before functions query them. Functions must be ready before hosting redirects traffic.

### Dependency Sync Checklist (February 2026 Lesson)

When importing a new package:

```bash
# ✅ DO THIS (3 files)
1. Edit src/components/MyComponent.tsx → Add import
2. Run `npm install package-name`
3. Commit BOTH package.json AND package-lock.json

# ❌ DON'T DO THIS
- Commit code WITHOUT updating package.json
- Forget package-lock.json
- Skip local `npm ci` test
```

**Verify Before Commit:**

```bash
git diff --name-status
# Should show: package.json, package-lock.json, src/components/MyComponent.tsx

npm ci
# Should succeed (simulates CI environment)

npm run build
# Should succeed (final verification)
```

### Post-Deployment Verification

After every production deploy, run the verification flow in `docs/VERIFICATION_RUNBOOK.md`:

```bash
curl -s https://switchcv.com/api/health | jq .

curl -s https://switchcv.com/api/system-config \
  -H "Authorization: Bearer <ADMIN_TOKEN>" | jq .
```

Manual smoke tests must cover auth, resume chat/create, recruiter search, and admin dashboard. For AI-generation changes, also run the production AI quality gate from `docs/DEPLOYMENT_CHECKLIST.md`.

### Incident Readiness

Before launch or major deploys, confirm:

- `docs/INCIDENT_RESPONSE.md` is current for AI pipeline failure, auth bypass, Firestore cost spike, GDPR deletion, and deployment failure.
- On-call owner and Firebase admin escalation are known.
- Rollback commands are tested for hosting and Cloud Functions.
- Budget and billing alerts are enabled.

### Release Blocker Checklist

Do not ship production if any answer is "no":

- Auth audit passes: every non-public API route authenticates first.
- Cross-tenant audit passes: no route trusts body `userId`/`recruiterId` for authorization.
- CSRF/CORS audit passes: state-changing browser routes validate Origin/Referer and allowed origins are explicit.
- Firestore rules include default deny-all and new collections have explicit rules.
- Secret rotation status is persisted and stale secrets produce alerts.
- Billing budget checks fail closed before AI spend.
- Resume generation uses the primary AI pipeline without degraded schema fallback.
- Post-deploy smoke tests pass for auth, resume creation, recruiter search, admin dashboard, and email verification.
- `NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION` and dev override env vars are absent from production.
- `npm audit --omit=dev --audit-level=high` is clean or has an accepted documented exception.

---

## Common Pitfalls for AI Agents

### Anti-Pattern 1: Adding `eslint-disable` Instead of Fixing Root Cause

**❌ WRONG:**

```typescript
// ❌ This kills the rule
// eslint-disable-next-line no-restricted-imports
import * as admin from "firebase-admin"; // ← API route importing server-only SDK!
```

**Root Cause:** Firebase-admin should NEVER be in API routes (they're Next.js middleware, not Cloud Functions).

**✅ CORRECT FIX:**

```typescript
// Move logic to Cloud Function or use getAuthenticatedUserId()
import { getAuthenticatedUserId } from "@/lib/utils/api-helpers"; // ← Uses server-side SDK safely
export async function GET(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request); // No direct admin import
  // ...
}
```

**Why Agents Do This:**

- Importing firebase-admin triggers ESLint error
- AI sees error, wants it gone ASAP
- Fastest path: add `eslint-disable`
- Real path: move logic to appropriate layer

**Prevention:** Pre-commit hook blocks `eslint-disable` on restricted patterns.

---

### Anti-Pattern 2: Type Mismatches — Always Grep for Type Definition First

**❌ WRONG:**

```typescript
// Using stage value "enhancement" (doesn't exist!)
import { AIObservationStage } from "@/lib/services/aiMonitoring/types";

const stage: AIObservationStage = "enhancement"; // ← Compile error!
```

**Root Cause:** `AIObservationStage` only has `extraction | generation | repair`. "enhancement" is not a valid value.

**✅ CORRECT FIX:**

```typescript
// Check actual type definition FIRST
// AIObservationStage = "extraction" | "generation" | "repair"
const stage: AIObservationStage = "generation"; // ✓ Valid
```

**Prevention:** Grep for type definition before using:

```bash
grep -r "type AIObservationStage" src/
# Result: src/lib/services/aiMonitoring/types.ts:2:export type AIObservationStage = "extraction" | "generation" | "repair";
```

---

### Anti-Pattern 3: Using Services That Already Exist

**❌ WRONG:**

```typescript
// Creating NEW parser when one exists
export function parseResumeData(text: string) {
  // Custom regex-based parser (redundant!)
  return {
    name: text.match(/^(.+)/)?.[1],
    email: text.match(/email:(.+)/)?.[1],
  };
}
```

**Root Cause:** Didn't check if service already existed.

**✅ CORRECT FIX:**

```typescript
// Use existing, tested service
import { resumeDataExtractor } from "@/lib/services/resumeDataExtractor";

const parsed = await resumeDataExtractor.extract(text);
```

**Prevention:** Search for existing services:

```bash
find src/lib/services -name "*xtract*" -o -name "*arse*"
# Find: resumeDataExtractor.ts, DocumentParser.ts, jdParserService.ts
```

---

### Anti-Pattern 4: Removing Validation to Make Types Work

**❌ WRONG:**

```typescript
// Removing validation because Zod types are "inconvenient"
const data = await request.json(); // No parsing!
// Assuming it's valid based on type hint
const { userId, email } = data as CreateUserInput; // ← NOT validated!
```

**Root Cause:** Schema validation is verbose, easier to skip.

**✅ CORRECT FIX:**

```typescript
const parseResult = CreateUserSchema.safeParse(await request.json());
if (!parseResult.success) {
  return NextResponse.json(
    { error: "Invalid input", details: parseResult.error.flatten() },
    { status: 400 },
  );
}
const { userId, email } = parseResult.data; // ← Type-safe, validated
```

---

### Anti-Pattern 5: Catching and Swallowing Exceptions

**❌ WRONG:**

```typescript
try {
  const response = await gemini.generateText(prompt);
  return response;
} catch (err) {
  // Silent swallow — no logging, no user feedback
  return null; // User gets nothing
}
```

**Root Cause:** Error handling seems tedious; silent fail seems "safe".

**✅ CORRECT FIX:**

```typescript
try {
  const response = await gemini.generateText(prompt);
  return response;
} catch (err) {
  // Log for debugging
  logger.error({ err }, "Gemini generation failed");

  // Return meaningful error to user
  return handleApiError(err, "Resume generation failed", 500, request);
}
```

---

### Anti-Pattern 6: Using `// @ts-ignore` Instead of Fixing Types

**❌ WRONG:**

```typescript
// @ts-ignore — ignoring type error instead of fixing it
const data: User = fetchUserData(); // fetchUserData returns unknown
```

**Root Cause:** Type checking seems "too strict"; ignore shortcut.

**✅ CORRECT FIX:**

```typescript
async function fetchUserData(): Promise<User> {
  const response = await fetch("/api/user");
  const data = (await response.json()) as User; // Type assertion with contract
  return data;
}

const data = await fetchUserData(); // Now properly typed
```

---

## Metrics & Health

### Test Suite

| Metric        | Value | Target |
| ------------- | ----- | ------ |
| **Passing**   | 4,456 | 100%   |
| **Failing**   | 0     | 0      |
| **Skipped**   | 67    | <50    |
| **Pass Rate** | 99%+  | 99%+   |
| **Suites**    | 426   | -      |

### Type Safety

| Check                      | Status                       |
| -------------------------- | ---------------------------- |
| **TypeScript Compilation** | ✅ 0 errors                  |
| **Strict Mode**            | ✅ Enabled                   |
| **`any` Types**            | ✅ Blocked (3 in tests only) |
| **Explicit Return Types**  | ✅ 100% on exports           |

### Code Quality

| Metric              | Value | Target | Status |
| ------------------- | ----- | ------ | ------ |
| **ESLint Errors**   | 0     | 0      | ✅     |
| **ESLint Warnings** | 44    | <20    | ⚠️     |
| **API Routes**      | 83/83 | 100%   | ✅     |
| **Test Coverage**   | 68.6% | 75%    | ⚠️     |

### Dependencies

| Category                      | Value      | Status              |
| ----------------------------- | ---------- | ------------------- |
| **npm Audit Vulnerabilities** | 8 (5 HIGH) | ⚠️ (Fixable)        |
| **Outdated Packages**         | 29         | ⚠️ (Safe to update) |
| **Production Dependencies**   | 35         | ✅                  |
| **Dev Dependencies**          | 29         | ✅                  |

### Security

| Check                      | Status                              |
| -------------------------- | ----------------------------------- |
| **Unauthenticated Routes** | ✅ 0 (except public exemptions)     |
| **Zod Validation**         | ✅ 100% on routes                   |
| **Error Leakage**          | ⚠️ (Cloud Functions fixed April 11) |
| **Rate Limiting**          | ⚠️ (In-memory, fix available)       |
| **Prompt Injection**       | ✅ Protected (7 routes)             |

### Cloud Infrastructure

| Component               | Status                               |
| ----------------------- | ------------------------------------ |
| **Firestore Rules**     | ✅ 452 lines, comprehensive          |
| **Firestore Indexes**   | ✅ 15 composite indexes              |
| **Cloud Functions**     | ✅ 50+ functions                     |
| **Scheduled Functions** | ✅ 12 (all with prod guard except 1) |

---

## Quick Wins

| #   | Action                                               | Effort    | Impact                        | Blocker  |
| --- | ---------------------------------------------------- | --------- | ----------------------------- | -------- |
| 1   | Run `npm audit fix`                                  | 5 min     | Fixes 8 vulnerabilities       | None     |
| 2   | Wire cache into resume reads                         | 30 min    | Saves $2,190/yr Firestore     | None     |
| 3   | Fix `useAiMonitoring.ts` dedup interval (30s → 60s)  | 1 min     | Rule 7 compliance             | None     |
| 4   | Remove unused vars in HeroReveal.tsx                 | 2 min     | 2 fewer warnings              | None     |
| 5   | Add `checkDistributedRateLimit()` to middleware      | 15 min    | Fixes rate limit bypass       | None     |
| 6   | Add budget checks to 5 AI routes                     | 20 min    | Prevents quota overage        | None     |
| 7   | Debug Gemini schema bug (`zodToGeminiSchema.ts`)     | 2-4 hours | **UNBLOCKS AI FEATURE**       | CRITICAL |
| 8   | Integrate `ProviderFallbackChain` to Cloud Functions | 1 hour    | Fixes single point of failure | HIGH     |
| 9   | Generate test templates for 34 uncovered routes      | 2 hours   | Improves coverage to 75%      | None     |
| 10  | Add Firestore trigger for auto-reindexing            | 1 hour    | Fixes stale search results    | None     |

---

## Operations & Incident Response

Use the operational docs as runbooks, not background reading.

| Situation                  | Primary runbook                              | Required action                                  |
| -------------------------- | -------------------------------------------- | ------------------------------------------------ |
| Production deploy          | `docs/DEPLOYMENT_CHECKLIST.md`               | Run clean install, build, typecheck, lint, tests |
| Post-deploy smoke test     | `docs/VERIFICATION_RUNBOOK.md`               | Verify health, config, auth, resume, recruiter   |
| SEV-1/SEV-2 incident       | `docs/INCIDENT_RESPONSE.md`                  | Triage by severity and follow playbook           |
| Cloud Run 403 everywhere   | `docs/SECURITY_CLOUD_RUN.md`                 | Verify `allUsers` invoker binding                |
| Secret rotation due        | `docs/SECRET_ROTATION_IMPLEMENTATION.md`     | Rotate secret, deploy functions, verify flow     |
| Resume session privacy bug | `docs/SECURITY_FIX_RESUME_SESSION.md`        | Confirm user-scoped localStorage and auth        |

**Severity shortcuts:**

- SEV-1: data breach, auth bypass, site down. Response target: 15 minutes.
- SEV-2: major feature broken, all AI generation failing, cost spike. Response target: 1 hour.
- SEV-3: non-blocking feature issue or localized deployment failure. Response target: 4 hours.
- SEV-4: cosmetic or low-impact issue. Response target: next business day.

**Post-incident minimum:**

- Record user impact, root cause, mitigation, permanent fix, and tests added.
- Run `node scripts/audit-api-routes.js --ci` after auth/security incidents.
- Check Firestore rules and indexes after data-access incidents.
- Update this document if the incident teaches a repeatable prevention pattern.

### Six-Month Lessons Coverage Matrix

Use this matrix to sanity-check future reviews against the known mistake categories.

| Category                  | Covered in this doc                                           | Main prevention pattern                              |
| ------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| API auth gaps             | Rules 1, 7, 9; Security Standards 1                           | Auth before parse, token identity only               |
| Cross-tenant IDOR         | Rule 9; Security Standards 1, 13                              | Ownership checks on every object/action              |
| CSRF/CORS                 | Rule 10; Security Standards 15                                | Stateless Origin/Referer + explicit origins          |
| Error/data leakage        | Rule 3; Security Standards 6, 12; Logging                     | Generic responses, redacted logs, hashed tokens      |
| AI failures/cost          | Critical Issues 1, 5; Performance 5, 7                       | Schema validation, budget checks, fallbacks          |
| Serverless state bugs     | Critical Issues 4; Performance 6                              | Shared stores, awaited writes, idempotency keys      |
| Firestore safety          | Security Standards 8, 13; Deployment order                    | Query filters, limits, indexes, default deny         |
| Billing/quota drift       | Critical Issues 2, 5; Security Standards 14                   | Lifetime counters, fail closed, one behavior layer   |
| Auth/approval/email flows | API Routes auth/email section; Known Bugs 13                  | No prod skip flags, config URLs, approval tests      |
| Secret management         | Security Standards 11; Known Bugs 11                          | Secret Manager, metadata, access logs, rotation      |
| PII/privacy               | Security Standards 9; Logging PII redaction                   | User-scoped storage and automatic sanitization       |
| Testing false confidence  | Testing Standards; Known Bugs 8; Anti-patterns 4-6            | Real handler tests, no placeholders/trivial asserts  |
| Deployment/runtime        | Deployment Procedures; Performance 8                          | Quality gates, smoke tests, bundle/runtime checks    |
| UI/a11y regressions       | Performance 8; React Hooks                                    | Accessibility checks and memoized state boundaries   |

---

## References

### Files to Know

| Category            | File                                           | Purpose                                             |
| ------------------- | ---------------------------------------------- | --------------------------------------------------- |
| **API Helpers**     | `src/lib/utils/api-helpers.ts`                 | Auth, resume fetching, error handling (475 lines)   |
| **Config**          | `src/lib/config.client.ts`                     | Client-safe config with dev overrides               |
| **Config**          | `src/lib/config.server.ts`                     | Server-only config (admin SDK setup)                |
| **Schemas**         | `src/lib/schemas/`                             | Zod input validation (all routes)                   |
| **Services**        | `src/lib/services/resumeQuotaService.ts`       | Lifetime quota logic                                |
| **Services**        | `src/lib/services/cacheService.ts`             | Dual-tier cache (NEEDS WIRING)                      |
| **Services**        | `src/lib/services/distributedRateLimit.ts`     | Firestore-backed rate limiting (NEEDS WIRING)       |
| **Services**        | `src/lib/services/ai/ProviderFallbackChain.ts` | Multi-provider AI with health scoring (client-only) |
| **Security**        | `src/lib/utils/promptSafety.ts`                | Prompt injection detection                          |
| **Logging**         | `src/lib/logger.ts`                            | Pino logger with PII redaction                      |
| **Rules**           | `firestore.rules`                              | Access control (452 lines)                          |
| **Indexes**         | `firestore.indexes.json`                       | Query optimization (15 indexes)                     |
| **Scripts**         | `scripts/audit-api-routes.js`                  | Pre-commit API audit                                |
| **Scripts**         | `scripts/audit-test-quality.js`                | Pre-commit test quality audit                       |
| **Cloud Functions** | `functions/src/services/*.ts`                  | Business logic (11 services)                        |

### Review Documents Referenced

- `CODING_FINAL_REVIEW_v1.md` — Previous standard (superseded by this doc)
- `CODEBASE_REVIEW_360_MARCH_14.md` — Full 360 review (March 14, 2026)
- `CODE_QUALITY.md` — Quality baseline (November 2025)
- `LESSONS_LEARNED.md` — Historical incidents + fixes (Feb 6 + April 5, 2026)
- `code_review_security_april_11.md` — Security audit (April 11, 2026)
- `CODEBASE_REVIEW_FEB_22_OVERALL.md` — Health check (February 22, 2026)
- `RESUME_CREATION_ISSUES_APRIL_15.md` — Resume #30 AI degraded-mode issue bundle
- `ROLE_CHANGE_FIX.md` — Permanent role-change prevention pattern
- `RESUME_FILE_UPLOAD_IMPLEMENTATION.md` — Upload/extract implementation contract
- `SECURITY_FIX_RESUME_SESSION.md` — January 2026 localStorage privacy incident
- `SECURITY_CLOUD_RUN.md` — Public Cloud Run IAM model
- `SECRET_ROTATION_IMPLEMENTATION.md` — Firebase Secret Manager and rotation plan
- `PII_REDACTION_IMPLEMENTATION.md` — Logger redaction contract and tests
- `INCIDENT_RESPONSE.md` — Production incident playbooks
- `VERIFICATION_RUNBOOK.md` — Post-deployment verification flow
- `DEPLOYMENT_CHECKLIST.md` — Pre-deploy and AI quality gate checklist
- `code_review_feb_14_v2.md` / `code_review_feb_15_v3.md` — IDOR, token, Firestore, billing, and CSRF lessons
- `code_review_march_06.md` — Billing drift, accessibility, rate limiting, and dependency watch items
- `Code_review_March_23.md` — Approval/username and email URL generation edge cases
- `Code_review_April_03.md` / `code_review_april_4.md` — Function-calling, persistence, renderer, dependency, load-test, and audit updates
- `review_may_25.md` — Secret Manager persistence and CORS documentation follow-up
- `docs/CORS_IMPLEMENTATION.md` — Explicit origin validation and CORS rollout checklist
- `docs/GOOGLE_SIGNIN_RCA.md` — Google sign-in, approval gate, and environment-cache RCA
- `docs/EMAIL_TROUBLESHOOTING.md` — Verification email, quota, and SMTP operations
- `docs/FIREBASE_BACKEND_CODE_REVIEW_JAN_15_2026.md` — Cloud Tasks, idempotency, LLMOps, App Check, and backend scalability lessons
- `docs/security/OWASP_Top_10_Security_Audit_2026-01-15.md` — OWASP security posture and action items

### Related Commands

```bash
# Quality checks
npm run quality              # Full check (TS + lint + build + tests)
npm run quality:quick        # Fast check (TS + lint only)
npm run quality:watch        # Continuous watch mode

# Testing
npm test                     # Jest unit tests
npm run test:coverage        # Coverage report
npm run e2e                  # Playwright E2E tests

# Deployment
firebase deploy --only firestore:indexes  # Step 1
firebase deploy --only functions          # Step 2
firebase deploy --only hosting            # Step 3

# Audits
node scripts/audit-api-routes.js           # API security audit
node scripts/audit-test-quality.js         # Test quality audit
npm audit                                  # Dependency vulnerabilities
```

---

## Document History

| Date           | Version       | Changes                                                    |
| -------------- | ------------- | ---------------------------------------------------------- |
| Feb 6, 2026    | v1            | Initial comprehensive review (104-point audit)             |
| Feb 22, 2026   | —             | Health check confirms 99.5% test pass rate                 |
| April 5, 2026  | —             | Quota bypass bug discovered + fixed                        |
| April 11, 2026 | —             | Security audit: 3 findings, all resolved                   |
| May 25, 2026   | v1 (final)    | `CODING_FINAL_REVIEW_v1.md` published                      |
| May 26, 2026   | **v2 (this)** | Comprehensive consolidation of all reviews + critical bugs |
| May 26, 2026   | v2.1          | Added missing review learnings and operational runbooks     |
| May 26, 2026   | v2.2          | Added final six-month coverage matrix and missing auth/security/runtime lessons |

---

**Last Updated:** May 26, 2026  
**Next Review:** June 15, 2026 (or after completing Quick Wins list)  
**Owner:** Development Team  
**Approval:** Architecture Review Board
