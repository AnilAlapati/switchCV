# Security Guidelines for Developers

This document outlines security best practices for developing on the SwitchCV platform.

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [API Security](#api-security)
3. [Data Protection](#data-protection)
4. [Environment Variables](#environment-variables)
5. [Error Handling](#error-handling)
6. [Input Validation](#input-validation)
7. [Common Vulnerabilities](#common-vulnerabilities)
8. [Testing Security](#testing-security)

---

## Authentication & Authorization

### ✅ Do's

- **Always verify authentication** before processing protected endpoints
  ```typescript
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;
  ```

- **Verify ownership** of resources before allowing modifications
  ```typescript
  const { success, userId } = await verifyResumeOwnership(request, resumeId);
  if (!success) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  ```

- **Check user roles** for sensitive operations
  ```typescript
  const userDoc = await adminDb.collection("users").doc(userId).get();
  if (userDoc.data()?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  ```

- **Use Firestore rules** to enforce security at the database level
  - Rules in `firestore.rules` prevent unauthorized access
  - Rules validate data structure and types

### ❌ Don'ts

- ❌ Trust client-provided user IDs without verification
- ❌ Skip Firestore rule checks (they're your safety net)
- ❌ Expose internal error messages to users
- ❌ Cache authentication status longer than necessary

---

## API Security

### Input Validation

**Always validate API inputs** before processing:

```typescript
import { validateInput, CommonSchemas } from '@/lib/middleware/validateInput';
import { z } from 'zod';

const schema = z.object({
  email: CommonSchemas.email,
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
});

export async function POST(request: NextRequest) {
  const { data, error } = await validateInput(request, schema);
  if (error) return error; // Returns 400 response
  
  // data is now type-safe and validated
}
```

### CORS Headers

**Always set explicit CORS headers:**

```typescript
import { withCORS } from '@/lib/middleware/cors';

export async function POST(request: NextRequest) {
  // Your logic
  const response = NextResponse.json({ success: true });
  return withCORS(response, request);
}
```

### Rate Limiting

**Apply rate limiting to prevent abuse:**

```typescript
import { applyRateLimit } from '@/lib/utils/api-helpers';

export async function POST(request: NextRequest) {
  const { userId, error: authError } = await getAuthenticatedUserId(request);
  if (authError) return authError;

  // Apply rate limit (30 requests per minute)
  const { allowed, response, result } = await applyRateLimit(userId, {
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!allowed) return response;

  // Attach headers to response
  const res = NextResponse.json({ success: true });
  attachRateLimitHeaders(res, result);
  return res;
}
```

---

## Data Protection

### PII (Personally Identifiable Information)

- **Never log PII** (emails, phone numbers, etc.)
  ```typescript
  // ❌ Bad
  logger.info(`User email: ${user.email}`);
  
  // ✅ Good
  logger.info(`User authenticated: ${userId}`);
  ```

- **Use visibility controls** for sensitive fields
  ```typescript
  // In Firestore documents
  {
    email: "user@example.com",
    emailVisibility: "masked", // public | masked | request
  }
  ```

- **Mask sensitive fields** for public views
  ```typescript
  import { sanitizeResumeForPublicView } from '@/lib/utils/resumeVisibility';
  const publicResume = sanitizeResumeForPublicView(resumeData);
  ```

### Data Encryption

- API keys are **server-side only** (not `NEXT_PUBLIC_*`)
- Sensitive data in transit uses HTTPS (enforced via headers)
- Use Firebase's encryption at rest

---

## Environment Variables

### ✅ Correct Configuration

```bash
# ✅ Server-side only (secret)
FIREBASE_ADMIN_SDK_KEY=...
GEMINI_API_KEY=...
HUGGINGFACE_TOKEN=...

# ✅ Public (can expose to browser)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

### Validation

Always validate environment variables on startup:

```typescript
import { validateEnv } from '@/lib/validateEnv';

// In next.config.ts or app initialization
validateEnv(); // Throws if any required vars are missing
```

### Getting Environment Variables

```typescript
import { getEnv, getRequiredEnv } from '@/lib/validateEnv';

// With fallback
const appUrl = getEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');

// Required (throws if not set)
const projectId = getRequiredEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
```

---

## Error Handling

### Prevent Information Leakage

**Use secure error handlers** that prevent exposing internal details:

```typescript
import { handleSecureApiError, getSecureAuthErrorMessage } from '@/lib/utils/api-helpers';

try {
  // Your logic
} catch (error) {
  // Returns generic message to client
  return handleSecureApiError(error, {
    publicMessage: 'Failed to process request',
    status: 500,
    userId, // Optional, for logging
    endpoint: request.nextUrl.pathname, // Optional
  });
}
```

### Auth Errors

**Always sanitize auth errors:**

```typescript
import { getSecureAuthErrorMessage } from '@/lib/utils/api-helpers';

try {
  await signInWithEmailAndPassword(auth, email, password);
} catch (error) {
  // Returns generic message (doesn't reveal if user exists)
  const message = getSecureAuthErrorMessage(error);
  return NextResponse.json({ error: message }, { status: 401 });
}
```

### Firestore Errors

**Sanitize database errors:**

```typescript
import { getSecureFirestoreErrorMessage } from '@/lib/utils/api-helpers';

try {
  await adminDb.collection('resumes').doc(id).get();
} catch (error) {
  const message = getSecureFirestoreErrorMessage(error);
  return handleSecureApiError(error, {
    publicMessage: message,
    status: 500,
  });
}
```

---

## Input Validation

### Common Patterns

```typescript
import { validateInput, CommonSchemas } from '@/lib/middleware/validateInput';

// Email validation
const emailSchema = CommonSchemas.email;

// Pagination
const paginationSchema = z.object({
  limit: CommonSchemas.limit,
  offset: CommonSchemas.offset,
});

// Search
const searchSchema = z.object({
  query: CommonSchemas.searchQuery,
  filters: z.record(z.string()).optional(),
});

// Using in API routes
export async function POST(request: NextRequest) {
  const { data, error } = await validateInput(request, searchSchema);
  if (error) return error;
  
  // data is validated
  await search(data.query, data.filters);
}
```

### Custom Validation

```typescript
const customSchema = z.object({
  resumeId: z.string().min(1),
  visibility: z.enum(['public', 'masked', 'request', 'private']),
  expiresAt: CommonSchemas.dateString.optional(),
}).refine(
  (data) => !data.expiresAt || new Date(data.expiresAt) > new Date(),
  { message: "Expiry date must be in the future" }
);
```

---

## Common Vulnerabilities

### SQL Injection
- ✅ Firestore uses queries (not string concatenation)
- Use parameterized queries always

### Cross-Site Scripting (XSS)
- ✅ React auto-escapes content
- ✅ Avoid `dangerouslySetInnerHTML`
- Use Content Security Policy (configured in `next.config.ts`)

### Cross-Site Request Forgery (CSRF)
- ✅ Implement CSRF tokens for state-changing operations
- Same-origin policy + token validation

### Insecure Direct Object Reference (IDOR)
- ✅ Always verify ownership before allowing access
- Never trust user-supplied IDs

### Sensitive Data Exposure
- ✅ API keys are server-side only
- ✅ Use secure error messages
- ✅ Mask sensitive fields in responses

---

## Testing Security

### Unit Tests

```typescript
describe('API Security', () => {
  test('should reject unauthenticated requests', async () => {
    const request = new Request('http://localhost/api/resume/create');
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  test('should reject invalid input', async () => {
    const request = new Request('http://localhost/api/resume/create', {
      method: 'POST',
      body: JSON.stringify({ invalidField: true }),
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  test('should enforce rate limits', async () => {
    const userId = 'test-user';
    // Make multiple requests and verify 429 response
  });
});
```

### Firestore Security Tests

```typescript
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

describe('Firestore Security Rules', () => {
  test('should allow users to read their own documents', async () => {
    const db = getFirestore(); // Authenticated user
    const docRef = doc(db, 'users', userId);
    await assertSucceeds(getDoc(docRef));
  });

  test('should prevent users from reading others documents', async () => {
    const db = getFirestore(); // Different user
    const docRef = doc(db, 'users', otherUserId);
    await assertFails(getDoc(docRef));
  });
});
```

---

## Security Checklist

Before deploying to production:

- [ ] All environment variables validated
- [ ] All API routes require authentication (if needed)
- [ ] All inputs validated with zod schemas
- [ ] All errors return generic messages to clients
- [ ] Rate limiting applied to sensitive endpoints
- [ ] CORS headers explicitly set
- [ ] No API keys in `NEXT_PUBLIC_*`
- [ ] Firestore rules tested
- [ ] Security tests pass
- [ ] CSP headers enabled in production
- [ ] HSTS, X-Frame-Options headers set
- [ ] No sensitive data in logs
- [ ] No hardcoded secrets in code
- [ ] Dependencies scanned for vulnerabilities

---

## Reporting Security Issues

If you discover a security vulnerability, please email `security@switchcv.com` instead of opening a public issue.

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security](https://firebase.google.com/support/security)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Zod Validation](https://zod.dev/)
