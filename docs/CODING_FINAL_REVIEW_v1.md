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
        { status: 400 } // ALWAYS 400 for validation errors
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
const response = await fetch('/api/user/update-role', {
  method: 'POST',
  body: JSON.stringify({ newRole: 'recruiter' })
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

| Code | Use Case                          | Example                            |
|------|-----------------------------------|------------------------------------|
| 200  | Success                           | Resume created, data fetched       |
| 201  | Created (not always required)     | New record added                   |
| 204  | Success with no content           | Deleted successfully               |
| 400  | Validation error (CLIENT fault)   | Missing email, invalid format      |
| 401  | Unauthorized (no/invalid token)   | Token expired, missing Auth header |
| 403  | Forbidden (no permission)         | User can't delete other's data     |
| 404  | Resource not found                | Resume ID doesn't exist            |
| 429  | Rate limited                      | Too many requests                  |
| 500  | Server error (SERVER fault)       | Database connection failed         |

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
    { status: 400 }
  );
}
const { title, content, userId } = parseResult.data;
```

### Request Size Limits

```typescript
// ✅ Enforce limits
const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

if (request.headers.get('content-length') && 
    parseInt(request.headers.get('content-length')!) > MAX_BODY_SIZE) {
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

  const resumeId = searchParams.get('id');
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
  const userId = request.headers.get('user-id')!;
  const isAllowed = await checkRateLimit(userId, 'resume:create', {
    limit: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  });

  if (!isAllowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429 }
    );
  }
}
```

### 3. CORS Validation

```typescript
// ✅ Validate origin
import { validateCorsRequest } from "@/lib/utils/cors";

export async function POST(request: NextRequest) {
  const corsResult = validateCorsRequest(request, ['https://switchcv.com']);
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

const geminiKey = await getSecret('GEMINI_API_KEY');
// Secrets are cached with 5-min TTL, never logged
```

---

## Performance Patterns

### 1. Caching Strategy

```typescript
// ✅ In-memory cache with TTL
import { MemoryCache } from "@/lib/utils/cache";

const userCache = new MemoryCache<User>(5 * 60 * 1000); // 5 min TTL

async function getUser(id: string): Promise<User> {
  const cached = userCache.get(id);
  if (cached) return cached;

  const user = await db.collection('users').doc(id).get();
  userCache.set(id, user.data() as User);
  return user.data() as User;
}

// Request deduplication (coalesce)
import { coalesce } from "@/lib/utils/cache";

const coalescedFetch = coalesce(
  (id: string) => db.collection('users').doc(id).get(),
  (id: string) => id
);
```

### 2. Pagination (Never Unbounded Queries)

```typescript
// ✅ Always use limit + cursor
import { SearchResult } from "@/lib/types";

export async function search(
  query: string,
  cursor?: string,
  limit: number = 20
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
  providers: ['gemini', 'groq', 'openai', 'claude'],
  timeout: 5000,
});
// Automatically tries providers in order, skips unhealthy ones
```

---

## React Hooks & State Management

### Custom Hook Pattern

```typescript
// ✅ Memoize returned functions
import { useCallback, useMemo } from 'react';

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

  return useMemo(() => ({ results, loading, search }), [results, loading, search]);
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
        "Authorization": "Bearer valid-token"
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

- Unit tests: 80%+ line coverage
- API routes: 100% of happy path + error cases
- Security critical paths: 100% coverage
- Skip tests: Use `it.skip()` with a comment explaining why

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
await fetch('/api/user/update-role', { body: { newRole: 'recruiter' } });
// Frontend thinks user is still 'jobseeker'

// ✅ CORRECT - refresh token and reload
const response = await fetch('/api/user/update-role', {
  body: { newRole: 'recruiter' }
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
  await fetch('/api/resumes/create'); // Rejection silently ignored
};

// ✅ CORRECT - proper error handling
const handleClick = async () => {
  try {
    const res = await fetch('/api/resumes/create');
    if (!res.ok) throw new Error('Failed to create');
    toast.success('Resume created!');
  } catch (err) {
    logger.error({ err }, "Failed to create resume");
    toast.error('Failed to create resume');
  }
};
```

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
