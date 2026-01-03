# CRITICAL SECURITY FIX: Resume Session Data Leakage

**Date:** 2 January 2026  
**Severity:** CRITICAL  
**Status:** FIXED

## Issue

Users were seeing other users' resume creation chat conversations when accessing `/create-resume`. This was a serious privacy violation where:

1. User A creates a resume, conversation saved to localStorage
2. User A logs out
3. User B logs in on the same browser
4. User B clicks "Start Building" and sees User A's entire conversation history

## Root Cause

Three critical security flaws:

### 1. Global localStorage Key

```typescript
// BEFORE (VULNERABLE)
const SESSION_KEY = "resume_creation_session"; // Same for ALL users
```

The session key was global - not tied to any specific user. When different users logged in on the same browser, they all shared the same localStorage key.

### 2. No Session Ownership Validation

```typescript
// BEFORE (VULNERABLE)
const savedSession = localStorage.getItem(SESSION_KEY);
if (savedSession) {
  const parsed = JSON.parse(savedSession);
  setMessages(parsed.messages); // Loaded ANY user's data!
}
```

The code blindly loaded whatever session data existed, without checking if it belonged to the current user.

### 3. Optional Authentication in API

```typescript
// BEFORE (VULNERABLE)
let userId = "anonymous";
const { userId: authenticatedUserId } = await getAuthenticatedUserId(request);

if (authenticatedUserId) {
  userId = authenticatedUserId;
} else {
  logger.warn("⚠️ No valid token, proceeding as anonymous");
  // Continues processing!
}
```

The `/api/resume/generate` endpoint allowed anonymous requests, making it possible to bypass authentication entirely.

## Fix Implemented

### 1. User-Specific Session Keys

```typescript
// AFTER (SECURE)
interface SessionData {
  userId: string; // CRITICAL: Track owner
  messages: Message[];
  stage: "input" | "generating" | "complete";
  sessionData: any;
  progress: number;
}

const SESSION_KEY = `resume_creation_session_${user.uid}`; // Unique per user
```

### 2. Session Ownership Validation

```typescript
// AFTER (SECURE)
useEffect(() => {
  if (!user?.uid) return;

  const SESSION_KEY = `resume_creation_session_${user.uid}`;
  const savedSession = localStorage.getItem(SESSION_KEY);

  if (savedSession) {
    const parsed: SessionData = JSON.parse(savedSession);

    // CRITICAL: Verify session belongs to current user
    if (parsed.userId !== user.uid) {
      logger.warn(
        { sessionUserId: parsed.userId, currentUserId: user.uid },
        "🚨 SECURITY: Session mismatch detected, clearing old session"
      );
      localStorage.removeItem(SESSION_KEY);
      return;
    }

    // Only restore if ownership verified
    setMessages(parsed.messages);
  }
}, [user?.uid]);
```

### 3. Mandatory Authentication

```typescript
// AFTER (SECURE)
export async function POST(request: NextRequest) {
  // CRITICAL: Authentication is REQUIRED - no anonymous access
  const { userId, error } = await getAuthenticatedUserId(request);

  if (error) {
    logger.warn("🚨 SECURITY: Unauthenticated resume generation attempt");
    return error; // Return 401 Unauthorized
  }

  // userId is guaranteed to be valid here
  logger.info({ userId }, "✅ Authenticated user generating resume:");
}
```

### 4. Logout Cleanup

```typescript
// AFTER (SECURE)
const logout = async () => {
  ensureAuthAvailable();

  // Clear all user-specific localStorage data
  if (user?.uid) {
    const SESSION_KEY = `resume_creation_session_${user.uid}`;
    localStorage.removeItem(SESSION_KEY);
    logger.info({ userId: user.uid }, "Cleared resume session on logout");
  }

  await signOut(auth);
};
```

### 5. Legacy Data Cleanup

```typescript
// Clean up old non-user-specific session (one-time migration)
const OLD_SESSION_KEY = "resume_creation_session";
if (localStorage.getItem(OLD_SESSION_KEY)) {
  logger.warn("🧹 Cleaning up old non-user-specific session data");
  localStorage.removeItem(OLD_SESSION_KEY);
}
```

## Files Changed

1. `/src/app/create-resume/page.tsx`

   - Added `SessionData` interface with `userId` field
   - Made SESSION_KEY user-specific
   - Added session ownership validation on load
   - Added legacy session cleanup
   - Session saved with userId for validation

2. `/src/app/api/resume/generate/route.ts`

   - Made authentication mandatory (no anonymous access)
   - Removed fallback to "anonymous" userId
   - All requests now require valid JWT token

3. `/src/hooks/useAuth.tsx`
   - Added session cleanup on logout
   - Ensures user-specific data is cleared when signing out

## Impact

- **Before:** Any user could see any other user's resume conversations on shared browsers
- **After:** Each user's session is isolated and validated
- **Data at Risk:** Resume creation conversations (may contain PII, work history, contact info)
- **Users Affected:** Anyone who used `/create-resume` on a shared browser

## Testing Recommendations

1. **Multi-User Test:**

   ```bash
   # Test with two different accounts
   1. Login as user1@example.com
   2. Start resume creation, add messages
   3. Logout
   4. Login as user2@example.com
   5. Go to /create-resume
   6. VERIFY: No messages from user1 appear
   ```

2. **Session Isolation:**

   - Verify localStorage keys are user-specific
   - Verify old sessions are auto-cleaned on first load
   - Verify logout clears the session

3. **API Authentication:**
   ```bash
   # Should fail with 401
   curl -X POST http://localhost:3000/api/resume/generate \
     -H "Content-Type: application/json" \
     -d '{"message": "test"}'
   ```

## Recommendations

### Naming Convention Update

User mentioned: "we need to call it something different, people might think differently if we say start building"

Consider renaming the CTA button from "Start Building" to:

- "Create Your Resume"
- "Build Resume with AI"
- "Start Your Resume"
- "Create Resume"

### Future Enhancements

1. **Server-Side Session Storage**: Move session data from localStorage to server-side database with user association
2. **Session Expiry**: Add TTL to sessions to auto-expire old data
3. **Audit Logging**: Log all session loads/clears for security monitoring
4. **Rate Limiting**: Add rate limits to resume generation endpoint

## Deployment Checklist

- [x] Code changes implemented
- [x] No TypeScript errors
- [ ] Run full test suite
- [ ] Test with multiple user accounts
- [ ] Verify localStorage cleanup on production
- [ ] Monitor logs for session mismatch warnings
- [ ] Consider user notification about privacy fix

## Monitoring

After deployment, watch for these log messages:

- `🚨 SECURITY: Session mismatch detected` - Indicates cross-user session was prevented
- `🧹 Cleaning up old non-user-specific session data` - Legacy cleanup happening
- `🚨 SECURITY: Unauthenticated resume generation attempt` - Anonymous access blocked
