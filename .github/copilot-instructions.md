# SwitchCV AI Coding Assistant Instructions

**READ THIS FIRST:** See [docs/LESSONS_LEARNED.md](../docs/LESSONS_LEARNED.md) for the full investigation of what went wrong, why AI agents fail, and how to avoid it.

## ⛔ MANDATORY RULES — NEVER SKIP THESE

**These rules are NON-NEGOTIABLE. Every single piece of code you generate MUST comply. Violation = broken product. No exceptions, no "I'll add it later", no "this is just a prototype".**

### Rule 1: EVERY API Route MUST Have Authentication

```
BEFORE writing ANY code in src/app/api/**/route.ts:
1. Import getAuthenticatedUserId from "@/lib/utils/api-helpers"
2. Call it as the FIRST line in every handler (GET, POST, PUT, PATCH, DELETE)
3. Return the error if auth fails: `if (error) return error;`
4. Use the returned userId — NEVER accept userId from request body

ONLY exceptions (must add comment explaining why):
- /api/health — public health check
- /api/system-config — public app config
- /api/auth/* — authentication endpoints themselves
- /api/user-approval/*/route.ts — token-based public auth
```

**WHY:** Two routes shipped without auth. An attacker with curl can impersonate any user. This is not theoretical.

### Rule 1.5: Role Changes MUST Use `/api/user/update-role` + Token Refresh

```
WHEN changing a user's role (jobseeker ↔ recruiter):
1. Frontend MUST call POST /api/user/update-role (NOT PUT /api/user/settings)
2. Backend MUST update BOTH Firestore AND Firebase Auth custom claims via setCustomClaims()
3. Frontend MUST call user.getIdToken(true) after a successful role change
4. Frontend MUST reload the page (window.location.reload()) or invalidate ALL SWR caches

NEVER:
- Use PUT /api/user/settings as the primary path for role changes
- Skip the token refresh — the client will see the old role
- Skip the page reload — components will render with stale role data
- Use optimistic update only without ensuring server persistence
```

**WHY:** This bug has occurred 3 times. The root cause is that Firestore update alone is not sufficient — Firebase Auth custom claims in the JWT token must also be updated, or server-side auth checks see the old role. See [docs/ROLE_CHANGE_FIX.md](../docs/ROLE_CHANGE_FIX.md) for full explanation.

### Rule 2: EVERY API Route MUST Validate Input with Zod

```
BEFORE processing ANY request body or query params:
1. Define or import a Zod schema
2. Parse with schema.parse() or schema.safeParse()
3. Return 400 on validation failure — NEVER 500
4. NEVER pass raw request.json() to Firestore or any service

Template:
  const parseResult = InputSchema.safeParse(await request.json());
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parseResult.error.flatten() },
      { status: 400 }
    );
  }
  const data = parseResult.data; // ← Type-safe, validated
```

**WHY:** Manual `if (!field)` checks miss edge cases and allow type confusion. Zod catches everything.

### Rule 3: NEVER Leak Error Details to Clients

```
WRONG: return NextResponse.json({ error: error.message }, { status: 500 });
WRONG: return NextResponse.json({ error: `Failed: ${err}` }, { status: 500 });
RIGHT: return handleApiError(err, "Operation failed");

In catch blocks:
- Log the real error with logger.error({ err }, "context message")
- Return a GENERIC message to the client
- NEVER include error.message, error.stack, or stringified errors in responses
```

**WHY:** Error messages from Firebase/AI APIs can expose internal URLs, credentials, database structure.

### Rule 4: React Hooks — Memoize Context Values and Callbacks

```
EVERY Context Provider MUST:
1. Wrap handler functions in useCallback()
2. Wrap the context value object in useMemo()
3. NEVER define plain functions inside provider body without useCallback

EVERY custom hook returning functions MUST:
1. Wrap returned functions in useCallback() with correct deps
2. NEVER put side effects (logger, fetch, mutations) inside useMemo()

Template:
  const handleAction = useCallback(async () => {
    // logic here
  }, [dependencies]);

  const value = useMemo(() => ({
    state, handleAction
  }), [state, handleAction]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
```

**WHY:** Without this, every state change in AuthProvider re-renders the ENTIRE app. This was found in code review.

### Rule 5: Accessibility is Not Optional

```
EVERY interactive element MUST have:
1. Form inputs: aria-invalid, aria-describedby linking to error message
2. Buttons: descriptive text or aria-label (not just an icon)
3. Loading states: role="status" and aria-live="polite"
4. Error feedback: NEVER use window.alert() — use toast/sonner notifications
5. SVG icons: aria-hidden="true" if decorative, or <title> if meaningful

Template for form errors:
  <input
    id="email"
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? "email-error" : undefined}
  />
  {errors.email && <p id="email-error" role="alert">{errors.email}</p>}
```

**WHY:** 10+ locations use window.alert(), auth forms lack aria attributes. This blocks accessibility compliance.

### Rule 6: Security by Default on All New Code

```
EVERY new feature MUST consider:
1. "What if someone calls this with curl instead of the UI?"
2. Server-side validation — NEVER trust client-only checks
3. Firestore queries — ALWAYS use .limit() or pagination
4. User input in AI prompts — ALWAYS sanitize (use detectPromptInjection from security/)
5. New Firestore collections — MUST have rules in firestore.rules (default: deny all)
6. Sensitive data — NEVER log PII, use sanitizeForLogging()
```

### Rule 7: Performance Budget

```
1. Heavy components (3D, charts, galleries) → React.lazy() + Suspense
2. SWR polling intervals → minimum 5 minutes in production, NEVER under 60 seconds
3. Firestore reads → ALWAYS .limit(), ALWAYS paginate
4. Context values → ALWAYS useMemo (see Rule 4)
5. NEVER use revalidateOnFocus: true on hooks that read Firestore
```

### Rule 8: Controlled Form Inputs — Always Initialize String Values

```
CRITICAL: React warns about switching between controlled/uncontrolled inputs when a value goes from undefined to string or vice versa.

PATTERN TO AVOID:
  interface Settings {
    displayName?: string;  // ← Optional = DANGER
  }
  const [settings, setSettings] = useState<Settings>({});  // ← No initial values
  useEffect(() => {
    if (fetchedSettings) {
      setSettings(fetchedSettings);  // ← If displayName is undefined sometimes, React breaks
    }
  });
  <input value={settings.displayName} />  // ← Can be undefined!

CORRECT PATTERNS:

Option 1 - Initialize with empty strings:
  const [settings, setSettings] = useState({
    displayName: "",
    companyName: "",
    email: "",
  });

Option 2 - Use defensive operators when syncing async data:
  useEffect(() => {
    if (fetchedSettings) {
      setSettings({
        ...fetchedSettings,
        displayName: fetchedSettings.displayName ?? "",
        companyName: fetchedSettings.companyName ?? "",
      });
    }
  }, [fetchedSettings]);

Option 3 - Use defensive operators inline (less preferred):
  <input value={settings.displayName || ""} />

Option 4 - Type-safe defaults (best for APIs):
  const API_DEFAULT_SETTINGS = {
    displayName: "",
    companyName: "",
  };
  const [settings, setSettings] = useState(API_DEFAULT_SETTINGS);
```

**WHY:** Controlled inputs MUST maintain consistent types throughout component lifecycle. Even one update cycle where a value is undefined breaks React's input handling, producing "changing from controlled to uncontrolled" console errors. This breaks form state management.

**COMMON VIOLATIONS:**

- Optional fields in interfaces used in useState without defaults
- SWR/fetch hooks where response fields can be undefined
- Object spread without nullish coalescing: `setData(apiResponse)` instead of `setData({ ...apiResponse, field: apiResponse.field ?? "" })`
- Forgetting to initialize state when fetching from APIs

**IN CODE REVIEW, CHECK:**

- [ ] All `useState` with string/number fields initialized with default values (never empty object `{}`)
- [ ] All useEffect that syncs API data uses `?? ""` or `|| ""` for form fields
- [ ] No optional (`?:`) fields in interfaces being used directly in form inputs
- [ ] If optional field exists, it has a fallback in the input: `value={state.field ?? ""}`

---

## Project Overview

SwitchCV is a Next.js 16 + Firebase + AI platform connecting jobseekers with recruiters. Frontend uses RSC with App Router, backend is Cloud Functions, data in Firestore. **Key constraint:** Agentic MVP budgets are hard-capped at $30/$70 USD monthly—no cost tracking yet.

## Architecture Essentials

**Frontend Stack:** Next.js 16 App Router, React 19, Tailwind, SWR for data fetching
**Backend Stack:** Cloud Functions (Node.js), Firestore, Cloud Storage
**Data Model:** Users → Resumes/Profiles → Recruiter Requests; all with `userId`, `createdAt`, `updatedAt` metadata
**Auth:** Firebase Auth + JWT custom claims for roles (`jobseeker`, `recruiter`, `admin`)
**AI:** Gemini primary; Groq/Claude as fallbacks (tiered routing by subscription tier)
**Search:** Vector embeddings planned but not fully implemented; currently keyword-based

## Critical Workflows

### Dev Tier Testing (Hard-block at production)

```bash
npm run dev:enterprise:recruiter  # recruiter + unlimited features
npm run dev:enterprise:jobseeker  # jobseeker + unlimited features
npm run dev:premium               # premium tier limits (50 API calls/month)
npm run dev:basic                 # basic tier (1 resume, 2 contacts lifetime)
```

Uses `NEXT_PUBLIC_DEV_MODE`, `NEXT_PUBLIC_DEV_TIER`, `NEXT_PUBLIC_DEV_ROLE` env vars. **Cannot run in production** (checked in config.ts).

### Deployment Order (Firestore indexes first!)

```bash
firebase deploy --only firestore:indexes  # Must be first
cd functions && npm run build && firebase deploy --only functions
npm run build && firebase deploy --only hosting  # or deploy to Vercel
```

### Testing

```bash
npm test                    # Jest with ~99% pass rate (3,352/3,376 tests)
npm run test:coverage       # Full coverage report
npm run e2e                 # Playwright headless
npm run e2e:debug           # Playwright with browser visible
npm run lint                # ESLint (current: 8 errors, 40 warnings to fix)
```

## Core Patterns (Non-Negotiable)

### API Route Template

```typescript
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  try {
    // Validate input with Zod
    const data = InputSchema.parse(await request.json());
    // Business logic
    return NextResponse.json({ result }, { status: 200 });
  } catch (err) {
    return handleApiError(err, "Operation failed");
  }
}
```

**Key:** Return 400 for validation errors (test coverage confirms this), 500 for server errors.

### Firestore Document Fetching

Use `fetchResumeDocument()` from api-helpers—it handles legacy data by fetching from both `resumes` AND `resumeProfiles` collections. Always include fallback handling for cross-collection reads.

### Logging & Errors

- Pino logger: `logger.info({ context }, "message")` with JSON in prod
- `handleApiError()` standardizes responses
- **Circuit breaker missing:** Need fallback chain for Gemini → Groq → Claude

### Validation & Limits

- All inputs validated with Zod schemas (see `src/lib/schemas/`)
- Request body: 1MB max, file uploads: 5MB max
- **Rate limiting missing:** Critical for quota enforcement

## Production Blockers (Fix Before Launch)

1. **No rate limiting** → Brute force vulnerability, quota abuse on free tier
2. **No billing service** → Can't enforce $30/$70 hard caps for agentic MVP
3. **No circuit breaker** → Single point of failure if Gemini fails
4. **No caching** → ~$2,190/yr in avoidable Firestore read costs

## Key Files & What They Do

| File                           | Purpose                                                      |
| ------------------------------ | ------------------------------------------------------------ |
| `src/lib/utils/api-helpers.ts` | Auth, resume fetching, error handling (475 lines)            |
| `src/lib/config.client.ts`     | Client-safe config with dev overrides                        |
| `src/lib/config.server.ts`     | Server-only config (admin SDK setup)                         |
| `functions/src/services/*.ts`  | Business logic: resume, quota, recruiter, billing (missing!) |
| `firestore.rules`              | Role/ownership/tier validation (452 lines)                   |
| `firestore.indexes.json`       | Query optimization indexes                                   |
| `src/lib/schemas/`             | Zod input validation schemas                                 |

## Subscription Tiers

| Feature            | Basic      | Premium | Enterprise |
| ------------------ | ---------- | ------- | ---------- |
| Resumes            | 1          | 50      | Unlimited  |
| AI Search          | ❌         | 50/mo   | Unlimited  |
| Recruiter Requests | 2 lifetime | 50/mo   | Unlimited  |
| Data Retention     | 7 days     | Forever | Forever    |

**Soft limits** enforced at client; **hard limits** should be enforced server-side (check quotaService.ts).

## Integration Points

- **PostHog:** User analytics (events tracked in components)
- **Sentry:** Error monitoring (initialized in sentry.\*.config.ts)
- **Nodemailer:** Email delivery via Cloud Functions
- **Firebase Admin SDK:** Server-side Firestore/Auth access

## Known Issues & TODOs

- **Linting:** 8 errors (console.log in WillingnessToPaySurvey.tsx, useAuthPage.ts, costControlService.ts)
- **Tests:** 24 failures (mock setup issues, not logic errors—check test files for mock patterns)
- **Vector search:** Planned but not implemented; no embedding generation pipeline
- **Caching:** No Redis/in-memory cache for public resumes
- **Rate limiting:** No global middleware; only partial implementation in supportFeedbackService.ts

## Commands That Aren't Obvious

```bash
npm run setup:dev          # Initialize dev environment
npm run secrets:sync:dev   # Sync Firebase secrets to .env.local
npm run health-check       # Validate repo structure
npm run cleanup            # Auto-maintenance script
npm run release            # Increment version before deploy
```

## Test Patterns & Selectors

Use `data-testid` attributes in JSX (many tests are brittle due to hardcoded selectors). Example:

```typescript
// Component
<button data-testid="submit-resume">Save</button>;

// Test
await screen.getByTestId("submit-resume").click();
```

## Common Pitfalls

1. **Mixing server/client code:** Never import firebase-admin in client components
2. **Forgetting legacy data handling:** Old resumes in `resumeProfiles` collection must be supported
3. **Validation status codes:** Zod errors must return 400, not 500
4. **Dev mode bypass:** Cannot test tier restrictions in production (mode check prevents this)
5. **Firestore costs:** Unbounded queries = expensive; always use `.limit()` or pagination

## Pre-Commit Enforcement

Every commit is automatically audited by `scripts/audit-api-routes.js`. This script:

- Scans ALL API route files for missing authentication
- Checks for Zod schema validation
- Detects error detail leakage patterns
- Flags routes missing CORS handling
- **BLOCKS the commit** if any critical issue is found

Run manually: `node scripts/audit-api-routes.js`

## Self-Check Before Submitting Code

Before presenting any code as "done", verify:

- [ ] Every API route calls `getAuthenticatedUserId()` (or is in the explicit public allowlist)
- [ ] Every request body is validated with a Zod schema
- [ ] No `error.message` or raw error details in client responses
- [ ] No `window.alert()` — use sonner toast instead
- [ ] Context provider values wrapped in `useMemo()`
- [ ] All callbacks in providers wrapped in `useCallback()`
- [ ] Form inputs have `aria-invalid` and `aria-describedby`
- [ ] **ALL string form inputs initialized with `""` (never undefined)**
- [ ] **All async data synced to state uses `?? ""` for string fields**
- [ ] **No optional (`?:`) fields in interfaces used directly in form inputs**
