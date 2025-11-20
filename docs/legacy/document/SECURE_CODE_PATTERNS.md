# 🔐 Secure Code Patterns for SwitchCV

Reference guide for implementing security best practices throughout the application.

---

## Pattern 1: Authenticated API Endpoints

Use this pattern for ANY endpoint that accesses user data:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

/**
 * Verify Firebase ID token from Authorization header
 * Returns: authenticated user's UID or null
 */
async function verifyAuth(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const idToken = authHeader.slice(7);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken.uid;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Step 1: Verify authentication
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: Valid Firebase ID token required" },
        { status: 401 }
      );
    }

    // Step 2: Get requested resource ID from query/body
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get("resourceId");
    if (!resourceId) {
      return NextResponse.json(
        { error: "resourceId is required" },
        { status: 400 }
      );
    }

    // Step 3: Verify authorization (user owns this resource)
    const resource = await adminDb
      .collection("resources")
      .doc(resourceId)
      .get();
    if (!resource.exists || resource.data()?.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: Cannot access this resource" },
        { status: 403 }
      );
    }

    // Step 4: Safe to proceed with authenticated operation
    return NextResponse.json(resource.data());
  } catch (error) {
    logger.error("Error in API endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Same steps as GET
  const userId = await verifyAuth(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... rest of POST logic
}
```

---

## Pattern 2: Protected Firestore Rules

Apply this pattern to all user-specific collections:

```plaintext
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Deny by default (fail-safe)
    match /{document=**} {
      allow read, write: if false;
    }

    // User's own data - only they can access
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Public data - anyone can read if marked public
    match /publicResumes/{resumeId} {
      allow read: if resource.data.published == true;
      // Only owner can write
      allow write: if request.auth != null &&
                     request.auth.uid == resource.data.userId;
    }

    // Backend-only collections (Cloud Functions, Admin SDK)
    match /system/{document=**} {
      allow read, write: if false;
      // Admin SDK bypasses these rules
    }
  }
}
```

---

## Pattern 3: Environment-Aware Logging

Use the logger utility to prevent data leakage:

```typescript
import { logger } from "@/lib/logger";

// Good: Use logger instead of console
logger.log("User created:", userId); // Only shown in dev
logger.error("Database error:", error); // Shown in dev + server
logger.warn("Retry attempt", { attempt: 3 }); // Only shown in dev

// Bad: Direct console (visible in production!)
console.log("User created:", userId); // ❌ DON'T USE

// Never log sensitive data
logger.log("User:", user); // ❌ Don't log entire user object
logger.log("User ID:", userId); // ✅ OK - just the ID

logger.log("API response:", response.data); // ❌ Could contain sensitive data
logger.log("API response status:", response.status); // ✅ Better
```

---

## Pattern 4: Input Validation

Always validate input before using it:

```typescript
export async function GET(request: NextRequest) {
  const userId = await verifyAuth(request);
  if (!userId) return unauthorized();

  // Get and validate input
  const { searchParams } = new URL(request.url);
  const resumeId = searchParams.get("resumeId");

  // Validate presence
  if (!resumeId) {
    return NextResponse.json({ error: "resumeId required" }, { status: 400 });
  }

  // Validate type and format
  if (typeof resumeId !== "string") {
    return NextResponse.json({ error: "Invalid resumeId" }, { status: 400 });
  }

  // Validate length
  if (resumeId.length > 128) {
    return NextResponse.json({ error: "resumeId too long" }, { status: 400 });
  }

  // Validate format (if applicable)
  if (!resumeId.match(/^[a-zA-Z0-9_-]+$/)) {
    return NextResponse.json(
      { error: "Invalid resumeId format" },
      { status: 400 }
    );
  }

  // Safe to use resumeId
  const resume = await adminDb.collection("resumes").doc(resumeId).get();
  return NextResponse.json(resume.data());
}
```

---

## Pattern 5: Client-Side Token Passing

When calling API endpoints, always include the Firebase ID token:

```typescript
// In React component
import { useAuth } from "@/hooks/useAuth";

export function MyComponent() {
  const { user } = useAuth();

  const fetchUserSettings = async () => {
    const idToken = await user.getIdToken();

    const response = await fetch("/api/user/settings?userId=" + user.uid, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`, // Include token!
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // User not authenticated
        console.error("Not authenticated");
      } else if (response.status === 403) {
        // User not authorized
        console.error("Not authorized");
      }
      return;
    }

    const settings = await response.json();
    return settings;
  };

  return <button onClick={fetchUserSettings}>Load Settings</button>;
}
```

---

## Pattern 6: Error Handling

Proper error handling without leaking sensitive info:

```typescript
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" }, // ✅ Generic message
        { status: 401 }
      );
    }

    // ... business logic ...

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log full error for debugging (server-side only)
    logger.error("API error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Return generic error to client
    return NextResponse.json(
      { error: "Internal server error" }, // ✅ Don't leak details
      { status: 500 }
    );
  }
}
```

---

## Pattern 7: Rate Limiting (Recommended)

Prevent brute force attacks on sensitive endpoints:

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Create rate limiter
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"), // 10 requests per hour
});

export async function POST(request: NextRequest) {
  // Rate limit by user ID
  const userId = await verifyAuth(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = await ratelimit.limit(userId);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // ... proceed with request ...
}
```

---

## Pattern 8: Secure Environment Variables

Handle environment variables safely:

```typescript
// ✅ GOOD: Validate on startup
const REQUIRED_ENV_VARS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "GEMINI_API_KEY",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
];

for (const envVar of REQUIRED_ENV_VARS) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// ✅ Use safely
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Gemini API key not configured");

// ❌ NEVER: Hardcode keys
const apiKey = "AIzaSyDxPBYfgCyaPThLlUPG_IEqOHRDe0Ci6vI"; // ❌ WRONG!

// ❌ NEVER: Log API keys
logger.log("Using API key:", apiKey); // ❌ WRONG! Will leak in dev logs
logger.log("API configured successfully"); // ✅ Correct
```

---

## Checklist for New Endpoints

When adding a new API endpoint, ensure:

- [ ] Authentication check added (verify Firebase ID token)
- [ ] Authorization check added (verify user owns the resource)
- [ ] Input validation added (check all parameters)
- [ ] Using `logger` instead of `console`
- [ ] Error messages are generic (no sensitive data)
- [ ] Firestore rules updated if new collection
- [ ] Tested with valid token
- [ ] Tested with invalid token (should fail)
- [ ] Tested with other user's data (should fail)

---

## Common Mistakes to Avoid

### ❌ Mistake 1: No Auth Check

```typescript
// WRONG: Anyone can call this
export async function GET(request: NextRequest) {
  const userId = searchParams.get("userId");
  const doc = await adminDb.collection("users").doc(userId).get();
  return NextResponse.json(doc.data());
}
```

### ✅ Correct: Check Auth

```typescript
// CORRECT: Only authenticated users, only own data
export async function GET(request: NextRequest) {
  const userId = await verifyAuth(request);
  if (!userId) return unauthorized();

  const requestedUserId = searchParams.get("userId");
  if (userId !== requestedUserId) return forbidden();

  const doc = await adminDb.collection("users").doc(userId).get();
  return NextResponse.json(doc.data());
}
```

---

### ❌ Mistake 2: Logging Sensitive Data

```typescript
// WRONG: Exposes data in production
console.log("User data:", user);
console.log("API response:", response);
```

### ✅ Correct: Log Safely

```typescript
// CORRECT: Only log safe data, development only
logger.log("User processed:", user.id);
logger.log("API status:", response.status);
```

---

### ❌ Mistake 3: Hardcoded Secrets

```typescript
// WRONG: Exposed in code and git history
const GEMINI_KEY = "AIzaSyDWEg83gh4zt7D1pXK4jpr_BGj_5lx35I0";
```

### ✅ Correct: Use Environment Variables

```typescript
// CORRECT: Secret kept in environment
const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY) throw new Error("Missing GEMINI_API_KEY");
```

---

## Testing Security

```bash
# Test endpoint without auth token
curl https://yourapp.com/api/user/settings?userId=abc
# Should return: 401 Unauthorized

# Test with valid token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://yourapp.com/api/user/settings?userId=abc
# Should return: User's settings

# Test accessing other user's data
curl -H "Authorization: Bearer USER1_TOKEN" \
  https://yourapp.com/api/user/settings?userId=USER2_ID
# Should return: 403 Forbidden

# Verify logs in production build
npm run build && npm run start
# Open DevTools console - should be silent
```

---

## Need More Help?

See:

- `SECURITY_AUDIT_REPORT.md` - Detailed vulnerability analysis
- `API_KEY_ROTATION_GUIDE.md` - Key management
- `SECURITY_FIXES_SUMMARY.md` - Changes made
