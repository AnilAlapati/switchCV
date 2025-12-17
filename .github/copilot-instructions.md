# SwitchCV AI Coding Assistant Instructions

## Project Overview

SwitchCV is a modern resume creation and recruitment platform built with Next.js 16, Firebase, and AI-powered features. The system connects job seekers with recruiters through semantic search and AI-enhanced resume building.

### Architecture Overview

**Frontend:** Next.js 16 App Router with React Server Components for optimal SEO and performance
**Backend:** Firebase Cloud Functions (serverless Node.js)
**Database:** Firestore NoSQL with real-time capabilities
**AI Layer:** Tiered gateway routing (Groq/Llama → Gemini → GPT/Claude) with circuit breaker fallbacks
**Search:** Vector embeddings for semantic resume-job matching
**Background:** Pub/Sub for async processing (cleanup, analytics, notifications)

## Critical Developer Workflows

### Development Mode Overrides
Use dev mode to bypass subscription tiers and roles during development:
```bash
npm run dev:enterprise:recruiter  # Full recruiter access + enterprise features
npm run dev:enterprise:jobseeker  # Full jobseeker access + enterprise features
npm run dev:premium              # Premium tier testing
npm run dev:basic                # Basic tier limitations
```

**Safety:** Dev mode is impossible in production (`NODE_ENV !== "production"` hard block).

### Deployment Sequence
```bash
# 1. Deploy Firestore indexes (required first)
firebase deploy --only firestore:indexes

# 2. Build & deploy functions
cd functions && npm run build
firebase deploy --only functions

# 3. Deploy frontend to Vercel/Firebase Hosting
npm run build
```

### Testing Commands
```bash
npm test              # Jest unit tests (~90% coverage)
npm run e2e           # Playwright E2E tests (headless)
npm run e2e:ui        # Playwright with interactive UI
npm run e2e:debug     # Debug mode with browser visible
```

## Core Patterns & Conventions

### API Route Structure
All API routes follow this pattern:
```typescript
import { getAuthenticatedUserId, handleApiError } from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  try {
    // Business logic here
  } catch (err) {
    return handleApiError(err, "Operation failed");
  }
}
```

### Authentication & Authorization
- `getAuthenticatedUserId()`: Verifies JWT and returns user ID
- `maybeGetAuthenticatedUserId()`: Optional auth for public endpoints
- `verifyResumeOwnership()`: Ensures user owns the resume
- Role checks: `recruiter`, `jobseeker`, `admin`

### Data Access Patterns
- `fetchResumeDocument()`: Fetches from both `resumes` and `resumeProfiles` collections (legacy support)
- Firestore document structure includes metadata: `userId`, `numericId`, `createdAt`, `updatedAt`
- Vector search uses embeddings for semantic matching

### Error Handling
- `handleApiError()`: Standardized error responses with proper logging
- Pino logger: Pretty output in dev, JSON in prod, mirrors to console
- Circuit breaker pattern for external API failures

### Validation
- Zod schemas for all input validation
- Request body size limits (1MB default)
- File upload limits (5MB for resumes)

## Integration Points

### Firebase Ecosystem
- **Auth:** User authentication with custom claims for roles
- **Firestore:** NoSQL with real-time listeners and security rules
- **Functions:** Serverless backend with event triggers
- **Storage:** File uploads (resumes, profile images)

### AI Providers
- **Gemini:** Primary for embeddings and text generation
- **Tiered Routing:** Cost optimization based on user subscription
- **Fallback Chain:** Automatic failover between providers

### External Services
- **PostHog:** Analytics and user behavior tracking
- **Sentry:** Error monitoring and alerting
- **Nodemailer:** Email notifications and digests

## Key Files & Directories

- `src/lib/utils/api-helpers.ts`: Core API utilities and patterns
- `src/lib/config.client.ts`: Client-safe configuration with dev overrides
- `src/lib/logger.ts`: Structured logging setup
- `functions/src/`: Cloud Functions business logic
- `docs/ARCHITECTURE_DIAGRAM.md`: Detailed system design and decisions
- `docs/DEPLOYMENT_CHECKLIST.md`: Pre-deployment security validation

## Subscription Tiers & Features

| Feature | Basic | Premium | Enterprise |
|---------|-------|---------|------------|
| Resume Creation | 1 | 50 | Unlimited |
| AI Search | ❌ | 50/mo | Unlimited |
| Contact Requests | 2 lifetime | 50/mo | Unlimited |
| Retention | 7 days | Forever | Forever |

## User Roles

- **jobseeker:** Create/manage own resume, respond to recruiter requests
- **recruiter:** AI search, request candidate contacts, manage pipelines
- **admin:** All features plus system administration

## Development Best Practices

- Always use the API helper functions for consistency
- Test with multiple dev mode overrides to ensure tier isolation
- Run full test suite before commits (`npm test`)
- Use structured logging with appropriate levels (info/warn/error)
- Validate all inputs with Zod schemas
- Handle Firestore document fallbacks for legacy data