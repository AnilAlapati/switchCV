# SwitchCV Coding Standards & Final Review v1

**Last Updated:** May 25, 2026  
**Project:** SwitchCV (Next.js 16 + Firebase + AI)  
**Enforced By:** Pre-commit hooks + CI/CD + Auto-audit scripts  
**Status:** Production Ready (97.7% compliance, 3,492/3,549 tests passing)

> **This document consolidates all coding standards, best practices, and lessons learned from 104-point audits, code reviews, and production incidents. Use this as your single source of truth.**

---

## Table of Contents

1. [🚨 MANDATORY RULES (Non-Negotiable)](#-mandatory-rules-non-negotiable)
2. [TypeScript & Type Safety](#typescript--type-safety)
3. [API Routes & Authentication](#api-routes--authentication)
4. [Input Validation & Error Handling](#input-validation--error-handling)
5. [Security Standards](#security-standards)
6. [Performance Patterns](#performance-patterns)
7. [React Hooks & State Management](#react-hooks--state-management)
8. [Logging & Observability](#logging--observability)
9. [Testing Standards](#testing-standards)
10. [Common Pitfalls & How to Avoid](#common-pitfalls--how-to-avoid)
11. [Quality Gates & Enforcement](#quality-gates--enforcement)
12. [References](#references)

---

## 🚨 MANDATORY RULES (Non-Negotiable)

**These rules are ENFORCED automatically. Your commit will be REJECTED if you violate them.**

### Rule 1: EVERY API Route MUST Have Authentication

```typescript
// BEFORE writing ANY code in src/app/api/**/route.ts:

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

**WHY:** Two routes shipped without auth. An attacker with curl can impersonate any user.

---

### Rule 2: EVERY API Route MUST Validate Input with Zod

```typescript
// Template for any route that processes input

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
    // Parse with safeParse (returns success/failure, doesn't throw)
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
import { handleApiError } from "@/lib/utils/api-helpers";
return handleApiError(err, "Operation failed", 500, request);
```

**Pattern:**

- Log the REAL error server-side: `logger.error({ err }, "context")`
- Return a GENERIC message to the client
- NEVER include error.message, stack traces, or stringified errors in responses

**WHY:** Firebase/AI API errors expose internal URLs, credentials, and database structure.

---

### Rule 4: React Hooks — Memoize Context Values and Callbacks

```typescript
// ❌ WRONG (re-renders entire app on every state change)
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);

  const value = {
    user,
    handleLogin: async (email: string) => {
      // ... auth logic
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ✅ CORRECT
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);

  const handleLogin = useCallback(async (email: string) => {
    // ... auth logic
  }, []);

  const value = useMemo(
    () => ({ user, handleLogin }),
    [user, handleLogin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

**Pattern for all Context Providers:**

1. Wrap handler functions in `useCallback()`
2. Wrap the context value object in `useMemo()`
3. NEVER define plain functions inside provider body without `useCallback`

**WHY:** Without this, every state change in `AuthProvider` re-renders the ENTIRE app (performance death).

---

### Rule 5: Role Changes MUST Use `/api/user/update-role` + Token Refresh

```typescript
// When changing a user's role (jobseeker ↔ recruiter):

// Step 1: Frontend calls the role-change endpoint (not PUT /api/user/settings)
const response = await fetch("/api/user/update-role", {
  method: "POST",
  body: JSON.stringify({ newRole: "recruiter" }),
});

// Step 2: Backend updates BOTH Firestore AND Firebase Auth custom claims
// (see src/app/api/user/update-role/route.ts)

// Step 3: Frontend refreshes the token
await user?.getIdToken(true); // Force refresh

// Step 4: Frontend reloads or invalidates all SWR caches
window.location.reload(); // or
mutate(null); // Clear all SWR caches
```

**NEVER:**

- Use `PUT /api/user/settings` as the primary path for role changes
- Skip the token refresh — the client will see the old role
- Skip the page reload — components will render with stale role data
- Use optimistic updates only without ensuring server persistence

**WHY:** This bug occurred 3 times. Firestore alone is NOT sufficient — Firebase Auth custom claims in the JWT token must also be updated, or server-side auth checks see the old role.

---

### Rule 6: All String Form Inputs MUST Initialize with Empty Strings

```typescript
// ❌ WRONG (React warns about switching between controlled/uncontrolled)
interface Settings {
  displayName?: string; // Optional = DANGER
}
const [settings, setSettings] = useState<Settings>({}); // No initial values
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

- All `useState` with string/number fields → initialize with default values (never empty object)
- All `useEffect` syncing API data → use `?? ""` or `|| ""` for form fields
- No optional (`?:`) fields in interfaces used directly in form inputs

**WHY:** Controlled inputs MUST maintain consistent types throughout the component lifecycle. Even one update cycle where a value is `undefined` breaks React's input handling.

---

## TypeScript & Type Safety

### Type Strictness

```typescript
// ✅ Use strict type checking
"strict": true in tsconfig.json
"strictNullChecks": true
"strictFunctionTypes": true
"noImplicitAny": true
"noImplicitThis": true

// ✅ Explicit return types on all exported functions
export async function getUser(id: string): Promise<User | null> {
  // ...
}

// ✅ Type-safe error handling
type Result<T, E> = { success: true; data: T } | { success: false; error: E };

// ✅ Use discriminated unions for exhaustiveness checking
type Action =
  | { type: 'LOGIN'; payload: LoginPayload }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_PROFILE'; payload: ProfilePayload };
```

### No `any` Type

```typescript
// ❌ BLOCKED in pre-commit
const data: any = fetchData();

// ✅ CORRECT
interface UserData {
  id: string;
  name: string;
  email: string;
}
const data: UserData = fetchData();
```

---

## API Routes & Authentication

### Status Codes (REQUIRED)

| Code | Use Case                        | Example                            |
| ---- | ------------------------------- | ---------------------------------- |
| 200  | Success                         | Resume created, data fetched       |
| 201  | Created (not always required)   | New record added                   |
| 204  | Success with no content         | Deleted successfully               |
| 400  | Validation error (CLIENT fault) | Missing email, invalid format      |
| 401  | Unauthorized (no/invalid token) | Token expired, missing Auth header |
| 403  | Forbidden (no permission)       | User can't delete other's data     |
| 404  | Resource not found              | Resume ID doesn't exist            |
| 429  | Rate limited                    | Too many requests                  |
| 500  | Server error (SERVER fault)     | Database connection failed         |

### Error Response Format

```typescript
// ✅ Use handleApiError helper
import { handleApiError } from "@/lib/utils/api-helpers";

try {
  // ... logic
} catch (err) {
  // handleApiError logs the real error server-side
  // and returns a generic message to the client
  return handleApiError(err, "Operation failed", 500, request);
}

// Returns to client:
// { "error": "Operation failed" }
// Real error logged with full context server-side
```

---

## Input Validation & Error Handling

### Zod Schema Best Practices

```typescript
// ✅ Define schemas in src/lib/schemas/
import { z } from "zod";

export const CreateResumeSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(10),
  userId: z.string().uuid(), // Validated format
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
const { title, content, userId } = parseResult.data;
```

### Request Size Limits

```typescript
// ✅ Enforce limits
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

### 2. Rate Limiting

```typescript
// ✅ Use distributed rate limiting
import { checkRateLimit } from "@/lib/utils/distributedRateLimit";

export async function POST(request: NextRequest) {
  const userId = request.headers.get("user-id")!;
  const isAllowed = await checkRateLimit(userId, "resume:create", {
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  });

  if (!isAllowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
}
```

### 3. CORS Validation

```typescript
// ✅ Validate origin
import { validateCorsRequest } from "@/lib/utils/cors";

export async function POST(request: NextRequest) {
  const corsResult = validateCorsRequest(request, ["https://switchcv.com"]);
  if (!corsResult.isValid) {
    return NextResponse.json({ error: "CORS denied" }, { status: 403 });
  }
}
```

### 4. PII Protection

```typescript
// ✅ Redact sensitive data in logs
import { logger } from "@/lib/logger";

const sensitiveData = { email: "user@example.com", phone: "555-1234" };
// Logger automatically redacts emails, phones, SSNs, credit cards, IPs
logger.info(sensitiveData, "User data");
```

### 5. Secret Management

```typescript
// ✅ Use secretManagerService for API keys
import { getSecret } from "@/lib/services/secretManagerService";

const geminiKey = await getSecret("GEMINI_API_KEY");
// Secrets are cached with 5-min TTL, never logged
```

### 6. Rate Limiting (Distributed, Not In-Memory)

```typescript
// ❌ WRONG - In-memory rate limiter bypassed per instance
const limiter = new Map();
if (limiter.get(userId)?.count > 10) return 429;

// ✅ CORRECT - Firestore-backed, transactional
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  const isAllowed = await checkDistributedRateLimit(userId, "resume:create", {
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  });

  if (!isAllowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
}
```

**WHY:** In-memory limiters are per-instance. Attackers bypass by hitting different serverless instances. Use Firestore-backed transactional limiter for true distributed control.

### 7. Budget Enforcement Before AI Calls (CRITICAL)

```typescript
// ❌ WRONG - Calls Gemini without checking budget
export async function POST(request: NextRequest) {
  const { userId } = await getAuthenticatedUserId(request);
  const response = await gemini.generateText(prompt); // Might exceed $30 cap!
  return NextResponse.json(response);
}

// ✅ CORRECT - Check both system and user budgets
import {
  checkSystemBudget,
  checkUserBudget,
} from "@/lib/services/quotaService";

export async function POST(request: NextRequest) {
  const { userId } = await getAuthenticatedUserId(request);

  // Check BEFORE calling AI
  const systemAllowed = await checkSystemBudget();
  if (!systemAllowed) {
    return handleApiError(null, "System budget exceeded", 429, request);
  }

  const userAllowed = await checkUserBudget(userId);
  if (!userAllowed) {
    return handleApiError(null, "User quota exceeded", 429, request);
  }

  const response = await gemini.generateText(prompt);
  return NextResponse.json(response);
}
```

**MUST enforce on these routes:** `/api/ai/generate`, `/api/ai/generate-resume`, `/api/resume/generate`, `/api/resume/enhance`, `/api/recruiter/jd-search`

### 8. Prompt Injection Detection

```typescript
// ✅ Added to 7 AI routes (April 11, 2026)
import { containsPromptInjection } from "@/lib/utils/promptSafety";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  const { message, jdText } = await request.json();

  // Check BEFORE sending to AI model
  if (containsPromptInjection(message) || containsPromptInjection(jdText)) {
    return NextResponse.json(
      { error: "Invalid input detected" },
      { status: 400 },
    );
  }

  const response = await gemini.generateText(message);
  return NextResponse.json(response);
}
```

**Protected routes:** `/api/ai/generate`, `/api/ai/generate-resume`, `/api/resume/generate*`, `/api/resumes/[id]/chat`, `/api/recruiter/jd-search`

### 9. CSP Headers (Content Security Policy)

```typescript
// ✅ In middleware.ts, tighten CSP img-src
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  img-src https://www.google.com https://lh3.googleusercontent.com https://firebasestorage.googleapis.com https://via.placeholder.com;
  style-src 'self' 'unsafe-inline';
`;

response.headers.set("Content-Security-Policy", cspHeader);
```

**WHY:** Broad `img-src https:` allows any HTTPS origin. Tighten to specific allowed domains to prevent attacker-controlled image injection.

### 10. Query-Level Visibility Filtering

```typescript
// ✅ Add .where("isPublic", "==", true) at Firestore query level
import { performSemanticSearch } from "@/lib/services/searchEngine";

// Defense-in-depth: Query-level + post-query filtering
export async function search(query: string) {
  let q = db
    .collection("resumes")
    .where("isPublic", "==", true)  // ← Firestore-level filter
    .where("title", ">=" query)
    .limit(50);

  const docs = await q.get();

  // ← Plus post-query filter: isRecruiterSearchableResume()
  const filtered = docs.docs
    .map(d => d.data())
    .filter(d => isRecruiterSearchableResume(d, currentUserId));

  return sanitizeResumeForPublicView(filtered);
}
```

**WHY:** Query-level filtering reduces Firestore reads and provides defense-in-depth alongside post-query filtering.

---

## Performance Patterns

### 0. Cache-Control Headers on GET Routes

```typescript
// ✅ Set appropriate Cache-Control headers (34 routes fixed)

// Private user data — browsers/CDNs must NOT cache
return NextResponse.json(userData, {
  headers: { "Cache-Control": "private, no-store" },
});

// Public health endpoints
return NextResponse.json(
  { status: "ok" },
  {
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=60",
    },
  },
);

// Public template listings
return NextResponse.json(templates, {
  headers: {
    "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
  },
});
```

**Policy Summary:**
| Type | Cache Header | Routes |
|------|--------------|--------|
| Private/Auth | `private, no-store` | User data, recruiter data, admin data |
| Auth flows | `no-store` | /api/auth/\*, redirects, token pages |
| Public health | `public, max-age=30, stale-while-revalidate=60` | /api/health |
| Public templates | `public, max-age=300, stale-while-revalidate=600` | Public listings, templates |

**WHY:** Without Cache-Control headers, browsers cache auth-sensitive data, CDNs serve stale cross-user data, public content gets refetched on every navigation.

### 1. Caching Strategy

```typescript
// ✅ In-memory cache with TTL (L1) + Firestore (L2)
import { MemoryCache } from "@/lib/utils/cache";
import { cacheService } from "@/lib/services/cacheService";

const userCache = new MemoryCache<User>(5 * 60 * 1000); // 5 min TTL

async function getUser(id: string): Promise<User> {
  const cached = userCache.get(id);
  if (cached) return cached;

  const user = await db.collection("users").doc(id).get();
  userCache.set(id, user.data() as User);
  return user.data() as User;
}

// ✅ MUST wire cache into service layer
// Resume reads MUST use cacheService
const cachedResume = await cacheService.get(
  `resume:${resumeId}`,
  () => fetchResumeDocument(resumeId),
  5 * 60 * 1000 // 5 min TTL
);

// ✅ Request deduplication (coalesce)
import { coalesce } from "@/lib/utils/cache";

const coalescedFetch = coalesce(
  (id: string) => db.collection("users").doc(id).get(),
  (id: string) => id,
);

**Cost Impact:** Estimated $2,190/yr → ~$876/yr (60% reduction in Firestore reads)
**Status (March 14, 2026):** Cache layer built but ONLY wired into featureFlagService. Action: Wire into resume reads, user settings, search results.
```

### 2. Pagination (Never Unbounded Queries)

```typescript
// ✅ Always use limit + cursor
import { SearchResult } from "@/lib/types";

export async function search(
  query: string,
  cursor?: string,
  limit: number = 20,
): Promise<SearchResult[]> {
  let q = db
    .collection("resumes")
    .where("title", ">=", query)
    .limit(limit + 1); // Fetch extra to detect more results

  if (cursor) {
    const lastDoc = await db.collection("resumes").doc(cursor).get();
    q = q.startAfter(lastDoc);
  }

  return q.get();
}
```

### 3. Lazy Loading Components

```typescript
// ✅ Use React.lazy + Suspense
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export function Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 4. AI Provider Fallback Chain

```typescript
// ✅ Multiple providers with health scoring
import { getAIResponse } from "@/lib/services/ai/providerFallbackChain";

const response = await getAIResponse(prompt, {
  providers: ["gemini", "groq", "openai", "claude"],
  timeout: 5000,
});
// Automatically tries providers in order, skips unhealthy ones
```

### 5. Circuit Breaker for Cloud Functions (CRITICAL)

```typescript
// ✅ Integrate ProviderFallbackChain into Cloud Functions
// Client-side fallback chain exists but NOT used in Cloud Functions

import { ProviderFallbackChain } from "@/lib/services/ai/ProviderFallbackChain";

const aiChain = new ProviderFallbackChain({
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
});

export const generateResume = functions.https.onCall(async (data, context) => {
  // ✅ Use fallback chain instead of direct Gemini call
  const response = await aiChain.call("generateText", prompt);
  return response;
});
```

**WHY:** If Gemini API fails, single provider causes cascade failure. Multiple providers with health scoring provide 99.9% availability.

**Status (March 14, 2026):** ProviderFallbackChain exists but Cloud Functions don't use it. Action: Integrate into all AI handlers.

---

## React Hooks & State Management

### Custom Hook Pattern

```typescript
// ✅ Memoize returned functions
import { useCallback, useMemo } from "react";

export function useSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${query}`);
      setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps because no external dependencies

  return useMemo(
    () => ({ results, loading, search }),
    [results, loading, search],
  );
}
```

### Context Provider Pattern

```typescript
// ✅ Memoize context value
import { createContext, useCallback, useMemo } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    // ... login logic
  }, []);

  const logout = useCallback(async () => {
    // ... logout logic
  }, []);

  const value = useMemo(
    () => ({ user, login, logout }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

---

## Logging & Observability

### Pino Logger (NOT console)

```typescript
// ✅ CORRECT - Context first, then message
import { logger } from "@/lib/logger";

logger.info({ userId, resumeId, action: "create" }, "Resume created");
logger.warn({ err: error, context: "auth" }, "Authentication failed");
logger.error({ err: error, stack: true }, "Database connection lost");
logger.debug({ query, params }, "Firestore query executed");

// ✅ PII is automatically redacted
logger.info({ email: "user@example.com" }, "User data");
// Output: { email: "[REDACTED]" } User data

// ❌ BLOCKED - console.log not allowed in production
console.log("Resume saved", { id, title });

// ❌ BLOCKED - Message first (wrong order)
logger.info("Resume saved", { id, title });
```

---

## Testing Standards

### API Route Testing

```typescript
// ✅ Test the actual handler, not the request/response
import { POST } from "@/app/api/resumes/create/route";

describe("POST /api/resumes/create", () => {
  it("should require authentication", async () => {
    const request = new Request("http://localhost/api/resumes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "My Resume" }),
      // NO Authorization header
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("should validate input schema", async () => {
    const request = new Request("http://localhost/api/resumes/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer valid-token",
      },
      body: JSON.stringify({ title: "" }), // Invalid: empty title
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

### Component Testing

```typescript
// ✅ Test behavior, not implementation
import { render, screen } from '@testing-library/react';
import { ResumeForm } from '@/components/ResumeForm';

describe('ResumeForm', () => {
  it('should show validation error on empty title', async () => {
    render(<ResumeForm />);

    const submitButton = screen.getByRole('button', { name: /save/i });
    await userEvent.click(submitButton);

    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });
});
```

### Test Coverage Expectations

**Required Thresholds:**

- **Statements:** 75% minimum (current: 68.6% — shortfall: 6.4%)
- **Branches:** 65% minimum (current: 62.4% — shortfall: 2.6%)
- **Lines:** 75% minimum (current: 69.2% — shortfall: 5.8%)
- **AI Generation Service:** 85% branches (current: 58.8%), 90% functions (current: 66.7%)

**Per-Test Expectations:**

- Unit tests: 80%+ line coverage
- API routes: 100% of happy path + error cases
- Security critical paths: 100% coverage
- Skip tests: Use `it.skip()` with a comment explaining why

**Security Test Suite (Currently Minimal):**

```typescript
// ✅ Add tests for these areas (missing as of March 14, 2026)
- Auth bypass attempts
- Prompt injection payloads
- Rate limiting enforcement
- CORS validation
- PII leakage in error responses
- Role change token refresh
```

**Verification:** `npm test -- --coverage` must show all metrics above thresholds before merge.

---

## Common Pitfalls & How to Avoid

### Pitfall 1: Mixing Server/Client Code

```typescript
// ❌ WRONG - importing firebase-admin in client component
import { initializeApp } from "firebase-admin/app";

export function MyComponent() {
  // This will break in browser
  return <div>Component</div>;
}

// ✅ CORRECT - use "use server" or split files
// server-action.ts
"use server";
import { adminDb } from "@/lib/firebase-admin";

export async function fetchData() {
  return await adminDb.collection('data').get();
}

// component.tsx
import { fetchData } from './server-action';

export async function MyComponent() {
  const data = await fetchData();
  return <div>{data}</div>;
}
```

### Pitfall 2: Legacy Resume Collection Handling

```typescript
// ❌ WRONG - only checks one collection
const doc = await adminDb.collection("resumes").doc(id).get();

// ✅ CORRECT - use helper that checks both collections
import { fetchResumeDocument } from "@/lib/utils/api-helpers";
const { data, docRef } = await fetchResumeDocument(id);
// Returns data from either "resumes" or "resumeProfiles" collection
```

### Pitfall 3: Accepting userId from Request Body

```typescript
// ❌ WRONG - trusting user input
const { userId } = await request.json();
// Attacker can claim any userId

// ✅ CORRECT - extract from verified token
const { userId, error } = await getAuthenticatedUserId(request);
if (error) return error;
// userId is verified from JWT
```

### Pitfall 4: Unbounded Firestore Queries

```typescript
// ❌ WRONG - expensive, slow, hits billing limits
const allResumes = await db.collection("resumes").get();

// ✅ CORRECT - always limit
const resumes = await db.collection("resumes").limit(50).get();

// ✅ CORRECT - pagination with cursor
const resumes = await db
  .collection("resumes")
  .limit(20)
  .startAfter(lastDocSnapshot)
  .get();
```

### Pitfall 5: Quota Based on Active Documents (Gets Bypassed)

```typescript
// ❌ WRONG - can be reset by deleting documents
const count = await db
  .collection("resumes")
  .where("userId", "==", userId)
  .count()
  .get();

if (count.data().count >= limit) return 403;
// User deletes resume → count resets → they can create another

// ✅ CORRECT - atomic counter that only increments
const userDoc = await adminDb.collection("users").doc(userId).get();
const lifetimeCount = userDoc.data()?.lifetimeResumeCreations || 0;

if (lifetimeCount >= limit) return 403;
// Increment on creation: increment(1)
// NEVER decrement on deletion
```

### Pitfall 6: Ignoring Token Refresh After Role Changes

```typescript
// ❌ WRONG - client still has old role in JWT
await fetch("/api/user/update-role", { body: { newRole: "recruiter" } });
// Frontend thinks user is still 'jobseeker'

// ✅ CORRECT - refresh token and reload
const response = await fetch("/api/user/update-role", {
  body: { newRole: "recruiter" },
});

if (response.ok) {
  await auth.currentUser?.getIdToken(true); // Force refresh
  window.location.reload(); // Reload to pick up new role
}
```

### Pitfall 7: Async Unhandled Rejections in Event Handlers

```typescript
// ❌ WRONG - errors swallowed
const handleClick = async () => {
  await fetch("/api/resumes/create"); // Rejection silently ignored
};

// ✅ CORRECT - proper error handling
const handleClick = async () => {
  try {
    const res = await fetch("/api/resumes/create");
    if (!res.ok) throw new Error("Failed to create");
    toast.success("Resume created!");
  } catch (err) {
    logger.error({ err }, "Failed to create resume");
    toast.error("Failed to create resume");
  }
};
```

### Pitfall 8: Circuit Breaker NOT Integrated in Cloud Functions

```typescript
// ❌ WRONG - direct call, no fallback
export const generateWithGemini = functions.https.onCall(async (data) => {
  return await gemini.generateText(data.prompt); // Dies if Gemini fails
});

// ✅ CORRECT - use ProviderFallbackChain
import { ProviderFallbackChain } from "@/lib/services/ai/ProviderFallbackChain";

const aiChain = new ProviderFallbackChain();

export const generateWithFallback = functions.https.onCall(async (data) => {
  return await aiChain.call("generateText", data.prompt);
  // Tries: Gemini → Groq → OpenAI → Claude
});
```

**Status:** Built (March 14, 2026) but Cloud Functions don't use it. Action: Integrate.

### Pitfall 9: npm Audit Vulnerabilities NOT Fixed

```bash
# ❌ Status (March 14, 2026): 8 vulnerabilities (5 high)
# - express-rate-limit: IPv4-mapped IPv6 bypass (HIGH)
# - flatted: Unbounded recursion DoS (HIGH)
# - tar: Symlink path traversal (HIGH)
# - hono: Prototype pollution (MODERATE)

# ✅ Action: Run npm audit fix
npm audit fix

# Verify all vulnerabilities have fixes available
npm audit --audit-level=moderate
```

### Pitfall 10: Vector Search Auto-Indexing Missing

```typescript
// ❌ WRONG - manual reindex only
export async function reindexResume(resumeId: string) {
  // Must be called manually via UI or API
  const embedding = await generateEmbedding(resumeText);
  await db.collection("embeddings").doc(resumeId).set({ embedding });
}

// ✅ CORRECT - auto-index on resume update
import { onDocumentWritten } from "firebase-functions/firestore";

export const autoReindexResume = onDocumentWritten(
  "resumes/{documentId}",
  async (event) => {
    const resumeDoc = event.data?.after;
    if (!resumeDoc) return; // Deleted

    const resumeText = `${resumeDoc.title} ${resumeDoc.content}`;
    const embedding = await generateEmbedding(resumeText);

    await db
      .collection("embeddings")
      .doc(resumeDoc.id)
      .set({ embedding, updatedAt: new Date() });
  },
);
```

**Status:** Manual indexing only (March 14, 2026). Action: Add Firestore trigger.

---

## Quality Gates & Enforcement

### Pre-Commit Checks (Auto-Enforced)

```bash
# Run before every commit
npm run precommit

# Checks:
# 1. API route authentication (@checked by audit-api-routes.js)
# 2. No console.log in production code
# 3. No eslint-disable bypasses
# 4. TypeScript strict mode
# 5. Jest tests pass
```

### CI/CD Pipeline

```bash
# On every push:
npm run lint          # ESLint (0 errors, warnings only)
npm run build         # Next.js build
npm test              # Jest tests (3,492/3,549 passing)
npm run test:coverage # Coverage report
```

### Quality Audit Scripts

```bash
# Audit API routes
node scripts/audit-api-routes.js
# Output: CRITICAL (auth missing), HIGH (validation), MEDIUM (error handling)

# Audit test quality
node scripts/audit-test-quality.js
# Output: Placeholder tests, trivial assertions, broken mocks

# Check repo health
npm run health-check
# Validates structure, dependencies, build artifacts
```

---

## State Consistency & Invariants (Learned Feb 12, 2026)

**Problem:** Resume visibility was checked using THREE different fields (`isPublic`, `visibility`, `published`), leading to race conditions where a resume marked `isBeingEdited: true` could still be publicly visible.

```typescript
// ❌ WRONG - Visibility split across multiple fields
// resumeAccess.ts
if (data.isPublic || data.visibility === "public" || data.published === true) {
}

// JobSeekerDashboard.tsx (different logic)
if (typeof resume.isPublic === "boolean") return resume.isPublic;
if (resume.visibility === "public") return true;

// ✅ CORRECT - Single source of truth
import { resolveResumeIsPublic } from "@/lib/utils/resumeVisibility";

// ALWAYS use this function
const isPublic = resolveResumeIsPublic(resume);

// Add invariant validation
validateResumeVisibilityInvariants(resume);
// Asserts: if (isBeingEdited) { !isPublic && visibility !== "public" }
```

**Pattern:**

- Define ONE canonical function for state resolution (`resolveResumeIsPublic`)
- Add invariant validation functions (`validateResumeVisibilityInvariants`)
- Use throughout codebase, never re-implement logic
- Test invariants in unit tests: `if (editing) expect(isPublic).toBe(false)`

**WHY:** Multi-field state without invariants causes invisible consistency bugs that pass individual tests but fail in integration.

---

## Async Fire-and-Forget Patterns (Learned Feb 12, 2026)

**Problem:** Async operations that don't wait for completion silently fail. Optimistic updates assume server success without verification.

```typescript
// ❌ WRONG - Fire and forget
export async function unpublishResume(resumeId: string) {
  // Don't wait for these to complete
  db.collection("resumes").doc(resumeId).update({ isPublic: false });
  db.collection("resumes").doc(resumeId).update({ visibility: "private" });
  // Frontend immediately shows "unpublished" (optimistic)
  // But if update fails, data is inconsistent
}

// ✅ CORRECT - Verify before optimistic update
export async function unpublishResume(resumeId: string, userId: string) {
  try {
    // Wait for BOTH operations
    const batch = writeBatch(db);

    batch.update(db.collection("resumes").doc(resumeId), {
      isPublic: false,
      visibility: "private",
      isBeingEdited: false,
      updatedAt: serverTimestamp(),
    });

    await batch.commit(); // Wait for completion

    // Add post-commit invariant check
    const updated = await db.collection("resumes").doc(resumeId).get();
    validateResumeVisibilityInvariants(updated.data());

    // NOW show success to user
    return { success: true };
  } catch (err) {
    logger.error({ err, resumeId }, "Failed to unpublish resume");
    throw err; // Don't swallow
  }
}
```

**Pattern:**

- Use `writeBatch()` for multi-field updates (atomic)
- ALWAYS `await` completion before optimistic UI update
- Add post-commit validation on state-critical operations
- Never use `.then()` without `.catch()`

---

## IDOR Prevention & Cross-Tenant Isolation (Learned Feb 14, 2026)

**Problem:** Recruiter APIs allowed arbitrary access across tenants (read/modify other recruiters' candidates, bulk actions, interviews).

```typescript
// ❌ WRONG - Missing ownership check
export async function GET(request: NextRequest) {
  const { userId } = await getAuthenticatedUserId(request);
  const { candidateId } = searchParams;

  // Anyone can fetch any candidate!
  const candidate = await db
    .collection("recruiter-candidates")
    .doc(candidateId)
    .get();

  return NextResponse.json(candidate.data());
}

// ✅ CORRECT - Verify ownership at document level
export async function GET(request: NextRequest) {
  const { userId } = await getAuthenticatedUserId(request);
  const { candidateId } = searchParams;

  const candidate = await db
    .collection("recruiter-candidates")
    .doc(candidateId)
    .get();

  // MUST verify ownership/tenant
  if (candidate.data()?.createdBy !== userId) {
    return handleApiError(null, "Forbidden", 403, request);
  }

  return NextResponse.json(candidate.data());
}

// ✅ BETTER - Firestore rules + query-level filtering
// In firestore.rules:
match /recruiter-candidates/{doc} {
  allow read, write: if request.auth.uid == resource.data.createdBy;
}

// In API route:
const candidates = await db
  .collection("recruiter-candidates")
  .where("createdBy", "==", userId)
  .where("status", "==", filter)
  .get();
```

**Applies to:** Any multi-tenant or multi-user resource. Check on:

- `/recruiter/candidates`
- `/recruiter/bulk-actions`
- `/recruiter/interviews`
- `/user/resumes` (own only)

---

## AI Output Sanitization & Field Mapping (Learned April 3, 2026)

**Problem:** Resume chat extraction returned raw JSON fences and `RESUME_COMPLETE` markers to users. AI model output used `grade` but schema expected `gpa`.

````typescript
// ❌ WRONG - Return raw model output
export async function POST(request: NextRequest) {
  const response = await gemini.generateText(prompt);
  return NextResponse.json({
    message: response, // Contains ```json ... ``` and RESUME_COMPLETE
  });
}

// ✅ CORRECT - Sanitize model output
import { sanitizeAIOutput } from "@/lib/utils/aiOutputSanitization";

export async function POST(request: NextRequest) {
  const response = await gemini.generateText(prompt);

  // Step 1: Extract JSON from fences
  const cleaned = response
    .replace(/```json[\s\S]*?```/gi, "")
    .replace(/```[\s\S]*?```/gi, "")
    .replace(/RESUME_COMPLETE/gi, "")
    .trim();

  // Step 2: Normalize field names (AI uses different names than schema)
  const normalized = normalizeEducationFields(cleaned);

  // Step 3: Validate against Zod schema
  const parseResult = ResumeDataSchema.safeParse(normalized);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid resume data", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  // Step 4: Return only user-safe message
  const userMessage = cleaned.split("{")[0].trim(); // Extract text before JSON
  return NextResponse.json({ message: userMessage });
}

// Helper for field normalization
function normalizeEducationFields(data: any) {
  if (!data.education) return data;

  return {
    ...data,
    education: data.education.map((entry: any) => ({
      ...entry,
      gpa: entry.gpa || entry.grade, // Normalize grade → gpa
      grade: undefined, // Remove source field
    })),
  };
}
````

**Pattern:**

- Strip markdown fences from model outputs
- Remove sentinel markers (RESUME_COMPLETE, etc.)
- Map AI field names to canonical schema names
- Validate against Zod before returning

---

## Username Reservation & Time-Based Access (Learned March 23, 2026)

**Problem:** Unapproved users could reserve usernames before admin approval. Declined accounts never released the reserved names.

```typescript
// ❌ WRONG - Reserve before approval
export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  const user = await getUserProfile(userId);

  // Allow username set even if approvalStatus === "pending"
  await db.collection("usernames").doc(username).set({
    reservedBy: userId,
    reservedAt: new Date(),
  });

  return NextResponse.json({ success: true });
}

// ✅ CORRECT - Only after approval
export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  const user = await getUserProfile(userId);

  // Check approval status
  if (user.approvalStatus !== "approved") {
    return handleApiError(
      null,
      "Cannot reserve username until account approval is complete",
      403,
      request,
    );
  }

  // Reserve atomically
  const usernameDoc = await db.collection("usernames").doc(username).get();
  if (usernameDoc.exists) {
    return handleApiError(null, "Username already taken", 409, request);
  }

  await db.collection("usernames").doc(username).set({
    reservedBy: userId,
    reservedAt: serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}

// On account decline, RELEASE username
export async function declineAccount(userId: string) {
  const user = await getUserProfile(userId);

  // MUST release reserved username
  if (user.reservedUsername) {
    await db.collection("usernames").doc(user.reservedUsername).delete();
  }

  // Then decline account
  await db.collection("users").doc(userId).update({
    approvalStatus: "declined",
    disabledAt: serverTimestamp(),
  });
}
```

**Pattern:**

- Time-gated features: approval status before resource allocation
- Release resources on account deletion/decline
- Use transactional operations for cleanup

---

## Environment Configuration & Secrets Management (Learned March 23 & Jan 18, 2026)

**Problem:** `PROJECT_BASE_URLS` was hardcoded for 3 environments. Any new environment/project ID would throw undefined reference.

```typescript
// ❌ WRONG - Hardcoded per-project config
const PROJECT_BASE_URLS = {
  "switchcv-prod": "https://switchcv.com",
  "switchcv-staging": "https://staging.switchcv.com",
  "switchcv-dev": "http://localhost:3000",
};

export function resolvePublicBaseUrl(projectId: string) {
  const url = PROJECT_BASE_URLS[projectId];
  // Throws if projectId not in map!
  return normalizeBase(url); // undefined → error
}

// ✅ CORRECT - Environment-driven with fallback
const PROJECT_BASE_URLS = {
  "switchcv-prod": "https://switchcv.com",
  "switchcv-staging": "https://staging.switchcv.com",
  "switchcv-dev": "http://localhost:3000",
};

export function resolvePublicBaseUrl(projectId: string): string {
  const url = PROJECT_BASE_URLS[projectId];

  if (!url) {
    // Use env var as fallback
    const fallback = process.env.PUBLIC_BASE_URL;

    if (!fallback) {
      throw new Error(
        `No PUBLIC_BASE_URL configured for project ${projectId}. ` +
        `Add to PROJECT_BASE_URLS or set PUBLIC_BASE_URL env var.`
      );
    }

    logger.warn(
      { projectId, fallback },
      "Using PUBLIC_BASE_URL fallback (add to PROJECT_BASE_URLS)"
    );

    return normalizeBase(fallback);
  }

  return normalizeBase(url);
}

// In .env files:
PUBLIC_BASE_URL=https://your-deployment-url.com
```

**Pattern:**

- Config with per-environment overrides
- Environment variables as fallback
- Fail with clear error message (what's missing, how to fix)
- Log warnings when using fallbacks

---

## Test Mocking & Jest Patterns (Learned Feb 22, 2026)

**Problem:** Tests failed when code changed from `router.push()` to `window.location.href`. Jest/JSDOM doesn't support direct `window.location` assignment.

```typescript
// ❌ WRONG - Code works but tests fail
export function useAuthNavigation() {
  return {
    goToDashboard: () => {
      window.location.href = "/dashboard"; // Tests crash
    },
  };
}

// ✅ CORRECT - Mock window.location in tests
describe("useAuthNavigation", () => {
  beforeEach(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = { href: "" } as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should navigate to dashboard", () => {
    const { goToDashboard } = renderHook(() => useAuthNavigation());

    goToDashboard();

    expect(window.location.href).toBe("/dashboard");
  });
});

// ✅ BETTER - Create test helper
function mockWindowLocation(url = "/") {
  delete (window as any).location;
  window.location = { href: url } as any;
  return () => jest.restoreAllMocks();
}

describe("useAuthNavigation", () => {
  it("should navigate to dashboard", () => {
    const cleanup = mockWindowLocation();
    try {
      const { goToDashboard } = renderHook(() => useAuthNavigation());
      goToDashboard();
      expect(window.location.href).toBe("/dashboard");
    } finally {
      cleanup();
    }
  });
});
```

**Pattern:**

- Mock `window.location` in `beforeEach`
- Test both happy path and error cases
- Use helper functions to reduce test boilerplate

---

## File Budgeting & Module Complexity (Learned Feb 22, 2026)

**Problem:** 19 files exceeded 500-line budget. Largest file (`swagger.ts`) was 1,132 lines, making it hard to test and maintain.

```typescript
// ❌ WRONG - Everything in one file
// swagger.ts (1,132 lines)
export function generateSwaggerSpec() {
  // 500+ lines of inline object definitions
  const spec = {
    paths: {
      "/api/resumes": {
        /* 200 lines */
      },
      "/api/users": {
        /* 200 lines */
      },
      // ... more endpoints
    },
  };
}

// ✅ CORRECT - Split by concern
// swagger/paths.ts
export const resumePaths = {
  "/api/resumes": {
    /* definitions */
  },
};

// swagger/paths/resumes.ts
export const resumesPaths = {
  /* ... */
};

// swagger/paths/users.ts
export const usersPaths = {
  /* ... */
};

// swagger.ts (now ~200 lines)
import { resumePaths } from "./swagger/paths/resumes";
import { usersPaths } from "./swagger/paths/users";

export function generateSwaggerSpec() {
  return {
    paths: {
      ...resumePaths,
      ...usersPaths,
      // imported from other modules
    },
  };
}
```

**Enforce via ESLint:**

```javascript
// eslint.config.mjs
{
  rules: {
    "max-lines": ["warn", { max: 500 }],
    "max-depth": ["warn", 4],
    "complexity": ["warn", 10]
  }
}
```

**Pattern:**

- Max 500 lines per file (enforce via ESLint)
- Split by feature, not by type
- One responsible per module

---

## Debug Information Security (Learned Jan 18, 2026)

**Problem:** Health endpoints exposed debug information that could leak infrastructure details.

```typescript
// ❌ WRONG - Too much debug info
export async function GET(request: NextRequest) {
  try {
    const adminAuth = await initializeAdminSDK();
    const healthCheck = await adminAuth.verifyIdToken("test-token");

    return NextResponse.json({
      status: "ok",
      firebase: {
        projectId: process.env.FIREBASE_PROJECT_ID, // Leaked!
        databaseUrl: process.env.FIREBASE_DATABASE_URL, // Leaked!
        serviceAccountEmail: "...", // Leaked!
      },
    });
  } catch (err) {
    return NextResponse.json({
      status: "error",
      error: err.message, // Detailed error! Leaked!
      debug: {
        stack: err.stack, // Stack trace! Leaked!
      },
    });
  }
}

// ✅ CORRECT - Minimal, no infrastructure leakage
export async function GET(request: NextRequest) {
  try {
    // Verify we can reach Firestore
    await adminDb
      .collection("_health")
      .doc("ping")
      .set({ timestamp: serverTimestamp() }, { merge: true });

    // Return only boolean status
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, "Health check failed");

    // Return generic status, no details to client
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
```

**Pattern:**

- Debug endpoints return boolean status only
- Never expose project IDs, URLs, or service account details
- Log full errors server-side, return generic messages to clients

---

## CSRF Protection Integration (Learned Feb 11, 2026)

**Problem:** CSRF protection middleware was implemented but never called in routes.

```typescript
// ✅ Middleware exists
// src/middleware.ts
import { csrfProtection } from "@/lib/utils/csrf";

export function middleware(request: NextRequest) {
  // Verify CSRF token on state-changing requests
  if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    const result = csrfProtection.verify(request);
    if (!result.valid) {
      return NextResponse.json(
        { error: "CSRF token invalid" },
        { status: 403 },
      );
    }
  }
}

// ✅ BUT apply to all routes
export const config = {
  matcher: [
    "/api/:path*", // All API routes
    "/:path*/auth:path*", // Auth pages
  ],
};

// ✅ Frontend includes token
export function useCSRFToken() {
  const [token, setToken] = useState("");

  useEffect(() => {
    setToken(csrfProtection.getToken());
  }, []);

  return token;
}

// In forms/requests
const token = useCSRFToken();

const response = await fetch("/api/resumes/create", {
  method: "POST",
  headers: {
    "X-CSRF-Token": token,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(data),
});
```

---

## Frontend Accessibility Requirements (Learned Feb 11 & Feb 22, 2026)

**Problem:** SVG icons and loading spinners missing `aria-hidden` or `role="status"`, violating WCAG 2.1 AA.

```typescript
// ❌ WRONG
export function LoadingSpinner() {
  return (
    <svg className="animate-spin" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

export function QuickActionsGrid() {
  return (
    <div>
      <svg className="icon" /> Add Resume
      <svg className="icon" /> Upload JD
    </div>
  );
}

// ✅ CORRECT
export function LoadingSpinner() {
  return (
    <svg
      className="animate-spin"
      viewBox="0 0 24 24"
      role="status"
      aria-live="polite"
      aria-label="Loading..."
    >
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

export function QuickActionsGrid() {
  return (
    <div>
      <svg className="icon" aria-hidden="true" /> Add Resume
      <svg className="icon" aria-hidden="true" /> Upload JD
    </div>
  );
}

// ✅ Form error accessibility
export function FormField({ error }: { error?: string }) {
  const errorId = `error-${Math.random()}`;

  return (
    <div>
      <input
        id={errorId}
        aria-invalid={!!error}
        aria-describedby={error ? `${errorId}-error` : undefined}
      />
      {error && (
        <p id={`${errorId}-error`} role="alert" className="text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
```

**Accessibility Checklist:**

- [ ] Forms: `aria-invalid`, `aria-describedby` on all inputs
- [ ] Loading: `role="status"`, `aria-live="polite"` on spinners
- [ ] Icons: `aria-hidden="true"` if decorative, `<title>` if meaningful
- [ ] Buttons: Descriptive text or `aria-label` (not just icon)
- [ ] Modals: `role="dialog"`, `aria-labelledby` on heading
- [ ] Notifications: `role="alert"`, `aria-live="assertive"` on errors

---

## References

For detailed information, see:

- **Security Details:** [docs/CODE_QUALITY.md](CODE_QUALITY.md)
- **Lessons Learned:** [docs/LESSONS_LEARNED.md](LESSONS_LEARNED.md) — Quota bugs, token sync, deployment issues
- **Final Status:** [docs/VIBE_CODING_FINAL_STATUS.md](VIBE_CODING_FINAL_STATUS.md) — 104-point audit results
- **API Catalog:** [docs/API_ROUTES_CATALOG.md](API_ROUTES_CATALOG.md) — All endpoints + schemas
- **Performance:** [docs/PERFORMANCE_TESTING.md](PERFORMANCE_TESTING.md) — Optimization patterns
- **Testing:** [docs/API_TESTING.md](API_TESTING.md) — Test patterns + examples
- **Original Instructions:** [.github/copilot-instructions.md](.github/copilot-instructions.md) — Detailed rule explanations

---

## Quick Checklist Before Submitting Code

Use this before presenting any code as "done":

- [ ] **Authentication:** Every API route calls `getAuthenticatedUserId()` (or is in public allowlist)
- [ ] **Validation:** Every request body validated with Zod schema
- [ ] **Error Handling:** No error.message leaked to clients; using `handleApiError()`
- [ ] **Logging:** Using `logger.info()` with context-first pattern (no `console.log`)
- [ ] **Types:** Explicit return types on all exported functions; no `any`
- [ ] **Testing:** Related tests pass: `npm test -- --findRelatedTests src/file.tsx`
- [ ] **Performance:** Context values wrapped in `useMemo()`, callbacks in `useCallback()`
- [ ] **Accessibility:** Form inputs have `aria-invalid`, `aria-describedby`; no `window.alert()`
- [ ] **Forms:** All string inputs initialized with `""` (never undefined)
- [ ] **Async Data:** API data synced to state uses `?? ""` for string fields
- [ ] **Rate Limiting:** Public endpoints have rate limit checks
- [ ] **Firestore:** Using limits on all queries; checking both resume collections
- [ ] **Pre-Commit:** Passing `npm run precommit` (won't block you, but catching issues early)

---

**Status:** ✅ PRODUCTION READY  
**Last Audit:** January 8, 2026 (3,492/3,549 tests passing, 97.7% compliance)  
**Maintained By:** Engineering team  
**Questions?** Refer to specific docs or reach out to the team lead.
