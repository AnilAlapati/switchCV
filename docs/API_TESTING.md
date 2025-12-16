# API Testing Guide

This guide explains how to test API routes in SwitchCV to ensure reliability, security, and correctness.

## Table of Contents

1. [Setup](#setup)
2. [Unit Testing](#unit-testing)
3. [Integration Testing](#integration-testing)
4. [Security Testing](#security-testing)
5. [E2E Testing](#e2e-testing)
6. [Best Practices](#best-practices)

---

## Setup

### Test Utilities

Create test utilities in `src/__tests__/support/api-test-helpers.ts`:

```typescript
import { NextRequest } from "next/server";

/**
 * Create a mock NextRequest for testing
 */
export function createMockRequest(
  url: string = "http://localhost:3000/api/test",
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    token?: string;
  } = {}
): NextRequest {
  const headers = new Headers(options.headers || {});

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  return new NextRequest(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * Get response body as JSON
 */
export async function getResponseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  return JSON.parse(text);
}

/**
 * Create an authenticated mock request
 */
export function createAuthenticatedRequest(
  url: string,
  token: string,
  method: string = "GET",
  body?: unknown
): NextRequest {
  return createMockRequest(url, { method, body, token });
}

/**
 * Mock Firebase Admin Auth
 */
export function mockFirebaseAdminAuth() {
  return {
    verifyIdToken: jest.fn(async (token: string) => {
      if (token === "valid-token") {
        return { uid: "test-user-id" };
      }
      throw new Error("Invalid token");
    }),
  };
}

/**
 * Mock Firebase Admin Firestore
 */
export function mockFirebaseAdminFirestore() {
  return {
    collection: jest.fn((name: string) => ({
      doc: jest.fn((id: string) => ({
        get: jest.fn(async () => ({
          exists: true,
          data: () => ({ id, userId: "test-user-id" }),
        })),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      add: jest.fn(),
      where: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  };
}
```

---

## Unit Testing

### Basic API Route Test

```typescript
// src/app/api/resume/create/route.test.ts
import { POST } from "./route";
import {
  createAuthenticatedRequest,
  getResponseJson,
} from "@/__tests__/support/api-test-helpers";

jest.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    verifyIdToken: jest.fn(async () => ({ uid: "test-user" })),
  },
  adminDb: {
    collection: jest.fn(() => ({
      add: jest.fn(async () => ({ id: "resume-123" })),
    })),
  },
}));

describe("POST /api/resume/create", () => {
  test("should require authentication", async () => {
    const request = new Request("http://localhost/api/resume/create", {
      method: "POST",
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await getResponseJson(response);
    expect(data.error).toBeDefined();
  });

  test("should validate input", async () => {
    const request = createAuthenticatedRequest(
      "http://localhost/api/resume/create",
      "valid-token",
      "POST",
      {
        /* invalid data */
      }
    );
    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  test("should create resume with valid input", async () => {
    const request = createAuthenticatedRequest(
      "http://localhost/api/resume/create",
      "valid-token",
      "POST",
      { title: "My Resume", content: "Content here" }
    );
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await getResponseJson(response);
    expect(data.id).toBeDefined();
  });
});
```

### Testing Input Validation

```typescript
// src/lib/middleware/validateInput.test.ts
import { validateInput } from "./validateInput";
import { z } from "zod";

describe("Input Validation", () => {
  test("should accept valid input", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ name: "John", age: 30 }),
    });

    const result = await validateInput(request, schema);
    expect(result.valid).toBe(true);
    expect(result.data).toEqual({ name: "John", age: 30 });
  });

  test("should reject invalid input", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: JSON.stringify({ name: "John", age: "thirty" }),
    });

    const result = await validateInput(request, schema);
    expect(result.valid).toBe(false);
    expect(result.error?.status).toBe(400);
  });

  test("should handle invalid JSON", async () => {
    const schema = z.object({});
    const request = new Request("http://localhost/api/test", {
      method: "POST",
      body: "invalid json",
    });

    const result = await validateInput(request, schema);
    expect(result.valid).toBe(false);
    expect(result.error?.status).toBe(400);
  });
});
```

---

## Integration Testing

### Testing with Real Firestore (Test Environment)

```typescript
// src/app/api/resume/create/route.integration.test.ts
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let testEnv: any;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "test-project",
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("Resume CRUD - Integration", () => {
  test("should create resume for authenticated user", async () => {
    const uid = "test-user-id";
    const db = testEnv.authenticatedContext(uid).firestore();

    const resumeRef = doc(db, "resumes", "resume-123");

    await assertSucceeds(
      setDoc(resumeRef, {
        userId: uid,
        title: "My Resume",
        createdAt: new Date(),
      })
    );
  });

  test("should prevent unauthenticated writes", async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const resumeRef = doc(db, "resumes", "resume-456");

    await assertFails(
      setDoc(resumeRef, {
        userId: "other-user",
        title: "Hacked Resume",
      })
    );
  });

  test("should prevent users from modifying others resumes", async () => {
    const uid = "test-user-id";
    const db = testEnv.authenticatedContext(uid).firestore();

    // Try to update another user's resume
    const resumeRef = doc(db, "resumes", "other-user-resume");

    await assertFails(
      setDoc(resumeRef, {
        userId: "other-user",
        title: "Modified",
      })
    );
  });
});
```

---

## Security Testing

### Authentication Tests

```typescript
// src/app/api/resume/[id]/route.test.ts
describe("API Security - Authentication", () => {
  test("should reject request without auth header", async () => {
    const request = new Request("http://localhost/api/resume/123", {
      method: "GET",
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  test("should reject request with invalid token", async () => {
    const request = new Request("http://localhost/api/resume/123", {
      method: "GET",
      headers: { Authorization: "Bearer invalid-token" },
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  test("should accept valid token", async () => {
    const request = createAuthenticatedRequest(
      "http://localhost/api/resume/123",
      "valid-token",
      "GET"
    );
    const response = await GET(request);
    expect(response.status).not.toBe(401);
  });
});
```

### Authorization Tests

```typescript
describe("API Security - Authorization", () => {
  test("should prevent users from accessing others resumes", async () => {
    const request = createAuthenticatedRequest(
      "http://localhost/api/resume/other-user-resume",
      "valid-token", // Different user
      "GET"
    );
    const response = await GET(request);
    expect(response.status).toBe(403);
  });

  test("should allow users to access their own resume", async () => {
    const request = createAuthenticatedRequest(
      "http://localhost/api/resume/user-own-resume",
      "valid-token",
      "GET"
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
```

### Rate Limiting Tests

```typescript
describe("API Security - Rate Limiting", () => {
  test("should enforce rate limits", async () => {
    const userId = "test-user";

    // Make 31 requests (limit is 30 per minute)
    for (let i = 0; i < 31; i++) {
      const request = createAuthenticatedRequest(
        "http://localhost/api/profiles/search",
        "valid-token",
        "POST",
        { query: "test" }
      );
      const response = await POST(request);

      if (i < 30) {
        expect(response.status).toBe(200);
      } else {
        expect(response.status).toBe(429); // Too Many Requests
      }
    }
  });

  test("should include rate limit headers", async () => {
    const request = createAuthenticatedRequest(
      "http://localhost/api/profiles/search",
      "valid-token",
      "POST",
      { query: "test" }
    );
    const response = await POST(request);

    expect(response.headers.get("X-RateLimit-Limit")).toBeDefined();
    expect(response.headers.get("X-RateLimit-Remaining")).toBeDefined();
    expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
  });
});
```

---

## E2E Testing

### Full User Flow

```typescript
// e2e/api-flow.spec.ts
import { test, expect } from "@playwright/test";

test("Resume creation and search flow", async ({ request, baseURL }) => {
  // 1. Authenticate
  const authResponse = await request.post(`${baseURL}/api/auth/login`, {
    data: { email: "test@example.com", password: "password123" },
  });
  const { token } = await authResponse.json();

  // 2. Create resume
  const createResponse = await request.post(`${baseURL}/api/resume/create`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { title: "My Resume", content: "Content" },
  });
  const { id } = await createResponse.json();
  expect(createResponse.ok()).toBeTruthy();

  // 3. Fetch resume
  const getResponse = await request.get(`${baseURL}/api/resume/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(getResponse.ok()).toBeTruthy();

  // 4. Search for resume
  const searchResponse = await request.post(`${baseURL}/api/profiles/search`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { query: "My Resume" },
  });
  expect(searchResponse.ok()).toBeTruthy();
});
```

---

## Best Practices

### 1. Test Authentication First

Always test that endpoints require authentication before testing functionality.

### 2. Test Input Validation

Validate that API routes reject invalid input with 400 status codes.

### 3. Test Authorization

Verify that users can only access their own resources.

### 4. Test Error Handling

Ensure errors return generic messages without leaking internal details.

### 5. Test Edge Cases

```typescript
describe("Edge Cases", () => {
  test("should handle empty query string", async () => {
    const request = createAuthenticatedRequest(
      "http://localhost/api/profiles/search",
      "valid-token",
      "POST",
      { query: "" }
    );
    const response = await POST(request);
    // Should return 400 (invalid query)
    expect(response.status).toBe(400);
  });

  test("should handle very large payloads", async () => {
    const largeData = { content: "x".repeat(10 * 1024 * 1024) }; // 10MB
    const request = createAuthenticatedRequest(
      "http://localhost/api/resume/create",
      "valid-token",
      "POST",
      largeData
    );
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  test("should handle malformed JSON", async () => {
    const request = new Request("http://localhost/api/resume/create", {
      method: "POST",
      headers: {
        Authorization: "Bearer valid-token",
        "Content-Type": "application/json",
      },
      body: "{invalid json",
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

### 6. Test Concurrent Requests

```typescript
test("should handle concurrent requests", async () => {
  const requests = Array.from({ length: 10 }).map((_, i) =>
    createAuthenticatedRequest(
      `http://localhost/api/resume/create`,
      "valid-token",
      "POST",
      { title: `Resume ${i}` }
    )
  );

  const responses = await Promise.all(requests.map((req) => POST(req)));

  responses.forEach((res) => {
    expect(res.status).toBe(200);
  });
});
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- api/resume/create.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch

# Run integration tests
npm test -- --testMatch="**/*.integration.test.ts"
```

---

## Coverage Goals

- **Unit Tests:** 80%+ coverage of business logic
- **Integration Tests:** 70%+ coverage of API routes
- **E2E Tests:** Critical user flows
- **Security Tests:** All sensitive endpoints

Target: **70%+ overall coverage**
