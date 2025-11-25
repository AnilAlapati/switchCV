# 🔗 Recruiter Workflow Integration Guide

## Quick Setup (5 minutes)

### Step 1: Set Environment Variable

```bash
# Generate a secure random key
node -e "console.log('TOKEN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Add to .env.local
TOKEN_SECRET=your_generated_key_here
```

### Step 2: Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### Step 3: Test Endpoints

```bash
# Test token generation
curl -X POST http://localhost:3000/api/recruiters/request-contact \
  -H "Content-Type: application/json" \
  -d '{
    "recruiterId": "test_recruiter",
    "recruiterName": "John Doe",
    "recruiterEmail": "john@acme.com",
    "companyName": "ACME Corp",
    "userId": "test_candidate",
    "resumeId": "test_resume",
    "requestedFields": ["email"],
    "purpose": "Interview opportunity",
    "proposedDuration": "1week"
  }'
```

---

## Integration with Existing Features

### 1. Authentication Integration

The system uses Firebase Auth which is already in place:

```typescript
// In API routes
import { getAuth } from "firebase/admin";

const userId = await getAuthenticatedUserId(request);
// or for admin check
const user = await db.collection("users").doc(userId).get();
const isAdmin = user.data().role === "admin";
```

**Status**: ✅ Ready to use, auth middleware needed

### 2. Notifications Integration

The system creates notifications but doesn't send emails yet:

```typescript
// Current: Firestore collections created
-recruiterNotifications / { id } - adminNotifications / { id };

// TODO: Add email notifications via Cloud Functions
async function sendApprovalEmail(recruiter, candidate, duration) {
  // Send email to recruiter with approval details
}

async function sendDenialEmail(recruiter, denialReason) {
  // Send email with denial reason
}

async function sendAccessGrantedEmail(candidate, recruiter) {
  // Notify candidate about access grant
}
```

**Status**: 🟡 Partially complete (DB ready, email pending)

### 3. Profile Search Integration

The search API already exists, recruiter portal uses it:

```typescript
// Uses existing: /api/profiles/search
// Returns candidates with public info
// SearchInterface component wraps the API calls

// To customize search results
// Edit src/app/api/profiles/search/route.ts
```

**Status**: ✅ Integrated and working

### 4. User Role Management

Admin features need role checks. Add to user documents:

```typescript
// In Firestore users/{uid}
{
  uid: "user123",
  email: "admin@example.com",
  displayName: "Admin Name",
  role: "admin",  // ← Add this
  createdAt: timestamp
}
```

**Status**: 🟡 Needed for full admin access

### 5. Notification Center

Candidates will see requests here (in future):

```typescript
// Path: /app/dashboard/notifications or similar
// TODO: Create component that shows:
// - Someone requested access to your info
// - Shows who, when, what fields
// - Shows status (approved, denied, expired)

// Use RecruiterContactRequest data from Firestore
```

**Status**: ⏳ TODO (design ready, UI pending)

---

## File Dependencies

### Core Files (Already Complete)

```
✅ src/lib/tokenGenerator.ts
   └─ No dependencies, self-contained

✅ src/types/profileSearch.ts
   └─ Only imports Firebase types

✅ src/app/api/recruiters/* (all routes)
   └─ Depend on: Firebase, tokenGenerator, types

✅ src/components/recruiter/*
   └─ Depend on: React, types, Auth hook

✅ src/app/recruiter/portal/page.tsx
   └─ Depend on: Components, Auth hook, API routes

✅ src/app/dashboard/recruiter-requests/page.tsx
   └─ Depend on: Firebase, Auth hook, API routes
```

### Integration Points

```
→ Existing useAuth() hook
  Used in: Portal page, Admin dashboard

→ Existing /api/profiles/search
  Used in: SearchInterface component

→ Firebase (firestore, auth)
  Used in: All API routes, components

→ Existing UI components (Button, Input, etc.)
  Used in: All new components
```

---

## Deployment Checklist

### Before Production

- [ ] Set TOKEN_SECRET in .env.local
- [ ] Generate secure random TOKEN_SECRET (32+ chars)
- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Set up admin user roles in Firestore
- [ ] Configure email service (SendGrid, Gmail, etc.)
- [ ] Test all API endpoints
- [ ] Test approval flow end-to-end
- [ ] Test token verification
- [ ] Enable audit logging
- [ ] Set up monitoring/alerts

### During Launch

- [ ] Make admin portal available to team
- [ ] Notify admins how to approve requests
- [ ] Start with internal recruiters only
- [ ] Monitor Firestore usage
- [ ] Watch for errors in logs
- [ ] Gather feedback

### Post-Launch

- [ ] Monitor approval response times
- [ ] Track false positive denials
- [ ] Gather recruiter feedback
- [ ] Set up analytics dashboard
- [ ] Plan email notification feature
- [ ] Plan recruiter verification flow

---

## Testing Guide

### Unit Tests

```typescript
// Test token generation
describe("TokenGenerator", () => {
  it("generates valid token", () => {
    const { token, tokenHash } = tokenGenerator.generateToken({
      tokenId: "123",
      recruiterId: "r1",
      userId: "u1",
      resumeId: "res1",
      accessFields: ["email"],
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    });

    const result = tokenGenerator.verifyToken(token);
    expect(result.valid).toBe(true);
  });

  it("rejects expired token", () => {
    const { token } = tokenGenerator.generateToken({
      tokenId: "123",
      recruiterId: "r1",
      userId: "u1",
      resumeId: "res1",
      accessFields: ["email"],
      expiresAt: Math.floor(Date.now() / 1000) - 3600, // 1h ago
    });

    const result = tokenGenerator.verifyToken(token);
    expect(result.valid).toBe(false);
  });
});
```

### Integration Tests

```typescript
// Test full flow
describe("Recruiter Workflow", () => {
  it("complete request → approval → access flow", async () => {
    // 1. Recruiter creates request
    const requestRes = await fetch("/api/recruiters/request-contact", {
      method: "POST",
      body: JSON.stringify({ ...payload }),
    });
    const { requestId } = await requestRes.json();

    // 2. Admin approves
    const approveRes = await fetch("/api/recruiters/approve-contact", {
      method: "POST",
      body: JSON.stringify({
        requestId,
        duration: "1week",
        adminUserId: "admin1",
      }),
    });
    const { tokenId } = await approveRes.json();

    // 3. Recruiter verifies token
    const verifyRes = await fetch(
      `/api/recruiters/verify-token?tokenId=${tokenId}`
    );
    const { valid, accessFields } = await verifyRes.json();

    expect(valid).toBe(true);
    expect(accessFields).toContain("email");
  });
});
```

### Manual Testing Scenarios

#### Scenario 1: Happy Path

```
1. Login as recruiter
2. Go to /recruiter/portal
3. Search for "test" (should find public profiles)
4. Click "Request Contact Information"
5. Select fields (email, phone)
6. Write purpose: "Interview opportunity"
7. Select duration: "1 week"
8. Submit
   ✅ Should show "Request submitted for review"
9. Go to "My Requests" tab
   ✅ Should show pending request
10. Login as admin
11. Go to /dashboard/recruiter-requests
    ✅ Should see the pending request
12. Click to view details
    ✅ Should show recruiter info, candidate, purpose
13. Select duration "1 week"
14. Click "Approve Request"
    ✅ Should show success
15. Switch back to recruiter account
16. Refresh "My Requests"
    ✅ Request should now show "Approved"
    ✅ Should show expiration date
```

#### Scenario 2: Denial

```
Same as above, but at step 14:
14. Write reason: "Company not verified"
15. Click "Deny Request"
    ✅ Should show success
16. Switch to recruiter
17. Refresh
    ✅ Request should show "Denied"
    ✅ Should show reason
```

#### Scenario 3: Token Expiration

```
1. Approve a request with "1 hour" duration
2. Get the token ID
3. Call /api/recruiters/verify-token
   ✅ Returns { valid: true }
4. Wait (or fast-forward time in tests)
5. Call again after 1 hour
   ✅ Returns { valid: false, expired: true }
```

---

## Monitoring & Observability

### Key Metrics to Track

```typescript
// Firebase console → Analytics
// OR set up custom metrics:

const metrics = {
  // Requests
  total_requests: 0,
  pending_requests: 0,
  approved_this_month: 0,
  denied_this_month: 0,

  // Approvals
  avg_approval_time_hours: 0,
  approval_rate_percent: 0,

  // Tokens
  active_tokens: 0,
  expired_tokens: 0,
  revoked_tokens: 0,

  // Performance
  request_creation_time_ms: 0,
  token_verification_time_ms: 0,
  approval_processing_time_ms: 0,

  // Errors
  failed_requests: 0,
  failed_approvals: 0,
  token_verification_failures: 0,
};
```

### Error Monitoring

```typescript
// Set up error logging
// In each API route:

try {
  // ... operation
} catch (error) {
  console.error("❌ [Operation] Error:", error);

  // Log to external service (Sentry, LogRocket, etc.)
  Sentry.captureException(error, {
    tags: {
      operation: "request_creation",
      recruiterId: payload.recruiterId,
      timestamp: new Date().toISOString()
    }
  });

  return NextResponse.json({ error: ... }, { status: 500 });
}
```

### Firestore Usage

Monitor in Firebase Console:

- Read operations (daily)
- Write operations (daily)
- Network bandwidth
- Stored data size

---

## Troubleshooting

### Issue: "Token verification fails"

**Cause**: TOKEN_SECRET mismatch

```bash
# Check
echo $TOKEN_SECRET  # Should print the key

# Fix: Regenerate and update
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Update .env.local
# Existing tokens will be invalid (expected)
```

### Issue: "Admin can't see requests"

**Cause**: Role not set or Firestore rules issue

```bash
# Check Firestore rules
firebase deploy --only firestore:rules --dry-run

# Check user role in Firestore
# users/{adminUid}
#   role: "admin"  ← Make sure this exists
```

### Issue: "Request goes to wrong database"

**Cause**: Wrong Firestore instance

```typescript
// Check in src/lib/firebase.ts
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // Should be your project
```

### Issue: "CORS error when testing with curl"

**Note**: CORS is for browsers, not curl. Use proper client libraries.

---

## Performance Optimization

### Current State

- ✅ Queries are indexed
- ✅ No N+1 queries
- ✅ Token verification is O(1)
- ✅ No unnecessary data fetches

### Future Optimizations

- [ ] Add caching for token verification
- [ ] Batch token generation for bulk requests
- [ ] Add pagination to request lists
- [ ] Consider read replicas for high-traffic queries
- [ ] Add CDN for static resources

### Database Indexes

Already handled by Firestore:

```
recruiterRequests:
- recruiterId (for list queries)
- status (for filtering)
- createdAt (for sorting)

accessTokens:
- tokenId (primary key)
- expiresAt (for cleanup jobs)
- isRevoked (for validation)
```

---

## Rollback Plan

If you need to disable this feature:

```bash
# 1. Disable recruiter routes (temporarily)
# Move src/app/api/recruiters to backup
# Move src/app/recruiter to backup

# 2. Disable admin routes
# Move src/app/dashboard/recruiter-requests to backup

# 3. Revert Firestore rules
firebase deploy --only firestore:rules
# (to previous version)

# 4. Notify users
# Send message to admins and recruiters
```

---

## Migration Guide

If upgrading from a previous version:

### From Manual Approval to Token-Based

```
Old: Simple yes/no approval
New: Automatic token generation with expiration

Migration:
1. Existing approvals don't have tokens
2. They still have access (no auto-expiry)
3. Admin can revoke manually (future feature)
4. All new approvals use token system
```

### From Firestore Rules v1 to v2

```bash
# Review old rules
git show HEAD~1:firestore.rules

# Compare with new rules
cat firestore.rules

# Deploy new rules
firebase deploy --only firestore:rules

# Monitor for permission errors in logs
```

---

## Support Resources

### Documentation Files

- `RECRUITER_WORKFLOW.md` - Complete guide
- `RECRUITER_WORKFLOW_SUMMARY.md` - Quick reference
- `RECRUITER_WORKFLOW_ARCHITECTURE.md` - Technical deep dive
- `RECRUITER_WORKFLOW_INTEGRATION.md` - This file

### Code Files

- `src/lib/tokenGenerator.ts` - Token system
- `src/app/api/recruiters/*` - API endpoints
- `src/components/recruiter/*` - UI components
- `src/app/recruiter/portal/page.tsx` - Recruiter portal
- `src/app/dashboard/recruiter-requests/page.tsx` - Admin dashboard

### Firebase Resources

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/start)

---

## Next Steps

### Phase 1 (This Week)

- [ ] Set TOKEN_SECRET
- [ ] Deploy Firestore rules
- [ ] Test with internal team

### Phase 2 (Next Week)

- [ ] Set up admin roles
- [ ] Configure email notifications
- [ ] Launch with select recruiters

### Phase 3 (After Launch)

- [ ] Gather feedback
- [ ] Monitor metrics
- [ ] Plan improvements

### Future Phases

- [ ] Recruiter verification flow
- [ ] Token revocation UI
- [ ] Analytics dashboard
- [ ] Email templates
- [ ] ATS integration

---

**Last Updated**: November 2025  
**Status**: 🟢 Ready for Integration
