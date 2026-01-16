# SwitchCV Coding Standards & Quality Gates

> **Last Updated:** January 2026  
> **Enforced By:** Pre-commit hooks + CI/CD  
> **Bypasses:** NONE for production code

---

## 🚨 CRITICAL: These Rules Are Non-Negotiable

After fixing 104+ issues, these standards are **automatically enforced**. Your commit will be rejected if you violate them.

---

## 1. TypeScript Standards (AUTO-ENFORCED)

### 1.1 Type Safety - NO `any` in Production

```typescript
// ❌ BLOCKED - Will fail pre-commit
const data: any = fetchData();

// ✅ CORRECT
interface UserData {
  id: string;
  name: string;
}
const data: UserData = fetchData();
```

### 1.2 Explicit Return Types on Exported Functions

```typescript
// ❌ BLOCKED
export async function getUser(id: string) { ... }

// ✅ CORRECT
export async function getUser(id: string): Promise<User | null> { ... }
```

### 1.3 No Implicit Type Coercion

```typescript
// ❌ BLOCKED
if (response) { ... }

// ✅ CORRECT
if (response !== null && response !== undefined) { ... }
```

---

## 2. API Route Standards (AUTO-ENFORCED)

### 2.1 Authentication Pattern

Every non-public API route MUST use this pattern:

```typescript
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error; // Returns 401

  try {
    // ... your logic
  } catch (err) {
    return handleApiError(err, "Operation failed");
  }
}
```

### 2.2 Status Codes

| Code | Use Case                                    |
| ---- | ------------------------------------------- |
| 200  | Success                                     |
| 400  | Validation errors (Zod failures)            |
| 401  | Unauthorized (no/invalid token)             |
| 403  | Forbidden (authenticated but no permission) |
| 404  | Resource not found                          |
| 500  | Server errors                               |

### 2.3 Error Response Format

```typescript
// ❌ WRONG
return NextResponse.json({ message: "Error" }, { status: 500 });

// ✅ CORRECT
return handleApiError(error, "Human readable message", 500, request);
```

---

## 3. Logging Standards (AUTO-ENFORCED)

### 3.1 Use Pino Logger (NOT console)

```typescript
// ❌ BLOCKED in API routes
console.log("User logged in:", userId);

// ✅ CORRECT
import { logger } from "@/lib/logger";
logger.info({ userId }, "User logged in");
```

### 3.2 Pino Log Format

```typescript
// ❌ WRONG - message first
logger.info("Action completed", { userId, action });

// ✅ CORRECT - context first
logger.info({ userId, action }, "Action completed");
```

### 3.3 Error Logging

```typescript
// ❌ WRONG
logger.error("Failed", error);

// ✅ CORRECT
logger.error({ err: error, context: "contextInfo" }, "Human readable message");
```

---

## 4. Firestore Patterns (MANUAL REVIEW)

### 4.1 Always Check Both Collections for Resumes

```typescript
// ❌ WRONG - misses legacy data
const doc = await adminDb.collection("resumes").doc(id).get();

// ✅ CORRECT - use helper
import { fetchResumeDocument } from "@/lib/utils/api-helpers";
const { data, docRef, docSnap } = await fetchResumeDocument(id);
```

### 4.2 Always Use Limits

```typescript
// ❌ WRONG - unbounded query = expensive
const all = await collection("resumes").get();

// ✅ CORRECT
const limited = await collection("resumes").limit(50).get();
```

### 4.3 Admin Role Verification

```typescript
// ❌ WRONG - role doesn't come from getAuthenticatedUserId
const { role } = await getAuthenticatedUserId(request);

// ✅ CORRECT
const { userId, error } = await getAuthenticatedUserId(request);
if (error) return error;

const isAdmin = await verifyAdminRole(userId!);
if (!isAdmin)
  return handleApiError(null, "Admin access required", 403, request);
```

---

## 5. Import Standards (AUTO-ENFORCED)

### 5.1 Use Path Aliases

```typescript
// ❌ WRONG
import { logger } from "../../../lib/logger";

// ✅ CORRECT
import { logger } from "@/lib/logger";
```

### 5.2 Relative Import Paths

```typescript
// In src/lib/services/extractors/ContactExtractor.ts:

// ❌ WRONG
import { X } from "../../conversationManager";

// ✅ CORRECT (one level up from extractors/ to services/)
import { X } from "../conversationManager";
```

---

## 6. Component Standards

### 6.1 Client Components

```typescript
// ❌ WRONG - will break SSR
export default function MyComponent() {
  const [state] = useState(); // useState in server component
}

// ✅ CORRECT
("use client");
export default function MyComponent() {
  const [state] = useState();
}
```

### 6.2 Server/Client Boundary

```typescript
// ❌ NEVER import firebase-admin in client components
import { adminDb } from "@/lib/firebase-admin"; // Server only!

// ✅ CORRECT for client
import { db } from "@/lib/firebase"; // Client SDK
```

---

## 7. Test Standards

### 7.1 Mock Return Types Must Match

```typescript
// ❌ WRONG - null not allowed by type
mockGetAuthenticatedUserId.mockResolvedValue({ userId, error: null });

// ✅ CORRECT
mockGetAuthenticatedUserId.mockResolvedValue({ userId, error: undefined });
```

### 7.2 Use data-testid for Selection

```tsx
// Component
<button data-testid="submit-resume">Save</button>;

// Test
await screen.getByTestId("submit-resume").click();
```

---

## 8. Environment Variables

### 8.1 Client-Safe Variables

```typescript
// ❌ NEVER expose server secrets to client
NEXT_PUBLIC_API_KEY = secret123; // WRONG!

// ✅ Server-only secrets have no prefix
GEMINI_API_KEY = secret123; // Correct - server only
```

### 8.2 Dev Mode Guards

```typescript
// ❌ BLOCKED in production
if (process.env.NODE_ENV === "development") {
  // Skip auth...  // This check prevents prod bypass
}
```

---

## 9. Security Patterns

### 9.1 No Hardcoded Secrets (AUTO-SCANNED)

```typescript
// ❌ BLOCKED by quality check
const API_KEY = "sk-1234567890abcdef";

// ✅ CORRECT
const API_KEY = process.env.GEMINI_API_KEY;
```

### 9.2 Input Validation Required

```typescript
// ❌ WRONG - trusting user input
const { resumeId } = await request.json();
await db.doc(resumeId).get();

// ✅ CORRECT
const { resumeId } = ResumeIdSchema.parse(await request.json());
```

---

## 10. Quality Commands

```bash
# Full quality check (before PR)
npm run quality

# Quick check (before commit) - runs automatically
npm run quality:quick

# Auto-fix what's fixable
npm run quality:fix

# Install pre-commit hooks
npm run setup:hooks
```

---

## Enforcement Summary

| Check              | Enforcement     | Bypass Allowed |
| ------------------ | --------------- | -------------- |
| TypeScript errors  | Pre-commit hook | ❌ NO          |
| ESLint errors      | Pre-commit hook | ❌ NO          |
| Hardcoded secrets  | Quality check   | ❌ NO          |
| console.log in API | Quality check   | ⚠️ Warning     |
| Test failures      | CI/CD           | ❌ NO in PR    |
| Build failure      | CI/CD           | ❌ NO          |

---

## When In Doubt

1. Run `npm run quality` before committing
2. Check existing patterns in similar files
3. Use the helper functions from `@/lib/utils/api-helpers`
4. Ask for code review if uncertain

---

_These standards exist because we fixed 104+ issues. Don't create 104 more._
