# SwitchCV AI Coding Assistant Instructions

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
