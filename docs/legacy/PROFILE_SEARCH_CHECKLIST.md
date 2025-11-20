# 🔨 Profile Search System - Implementation Checklist

## Quick Summary

- **What**: Logged-in users can search other users, see public summaries (name + AI bio), request full resume access
- **Approval**: Owner approves with time limit (1hr, 1day, 1week, forever)
- **Privacy**: Full resume needs approval; only name/bio visible without approval
- **Notifications**: Real-time notifications for requests & approvals

---

## Phase 1: Data Model Setup (2-3 days)

### Step 1.1: Update User Data Model

**File**: `src/types/index.ts`

Add to `User` type:

```typescript
export interface User {
  // ... existing fields
  publicProfile?: {
    username: string; // "anil-alapati"
    visible: boolean;
    aiSelectedBio: string;
    role?: string; // "Software Engineer"
    location?: string; // "San Francisco, CA"
  };
  resumeSummaries?: {
    [resumeId: string]: {
      title: string;
      targetRole?: string;
      skills?: string[];
    };
  };
}
```

### Step 1.2: Update Resume Profile Data Model

**File**: `src/types/index.ts`

Add to `ResumeProfile` type:

```typescript
export interface ResumeProfile {
  // ... existing fields
  accessControl?: {
    allowPublicSummary: boolean;
    accessRequests?: AccessRequest[];
    accessGrants?: AccessGrant[];
  };
}

export interface AccessRequest {
  requestId: string;
  fromUserId: string;
  fromUserName: string;
  timestamp: Date;
  message?: string;
  status: "pending" | "approved" | "denied";
}

export interface AccessGrant {
  grantId: string;
  toUserId: string;
  grantedAt: Date;
  expiresAt: Date | null;
  duration: "1hour" | "1day" | "1week" | "forever";
}

export interface Notification {
  id: string;
  userId: string;
  type: "request" | "approval" | "denial";
  fromUserId?: string;
  fromUserName?: string;
  resumeTitle?: string;
  message?: string;
  timestamp: Date;
  read: boolean;
  expiresAt?: Date;
}
```

### Step 1.3: Update Firestore Rules

**File**: `firestore.rules`

Already have basic rules. Add specific sub-collection rules for access control.

### Step 1.4: Set Up Search Index

Create a Cloud Function to maintain search index (or use Algolia extension):

- Triggers on resumeProfiles create/update
- Maintains `/searchIndex` collection
- Indexed on: username, displayName, skills, role, location

---

## Phase 2: Backend API Routes (3-4 days)

### Step 2.1: Search API

**File**: `src/app/api/profiles/search/route.ts`

```typescript
// POST /api/profiles/search
// Returns public profiles matching query
export async function POST(request: NextRequest) {
  try {
    const { query, filters, limit = 20 } = await request.json();
    const user = await getAuth();

    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Search in searchIndex collection
    // Return only: userId, username, name, bio, role, location
    // Include: hasApproval, expiresAt (from their accessGrants)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Step 2.2: Request Access API

**File**: `src/app/api/profiles/request-access/route.ts`

```typescript
// POST /api/profiles/request-access
// Create access request, send notification to owner
export async function POST(request: NextRequest) {
  try {
    const { resumeId, message } = await request.json();
    const currentUser = await getAuth();

    // 1. Create access request document
    // 2. Send notification to resume owner
    // 3. Check for existing request (prevent duplicates)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Step 2.3: Approve/Deny API

**File**: `src/app/api/profiles/approve-access/route.ts`

```typescript
// POST /api/profiles/approve-access
// Owner approves request with duration
export async function POST(request: NextRequest) {
  try {
    const { requestId, resumeId, duration } = await request.json();
    const currentUser = await getAuth();

    // 1. Verify user is owner of resume
    // 2. Create access grant with expiry
    // 3. Update request status to "approved"
    // 4. Send notification to requester
    // 5. Set up auto-cleanup for expired grants (Cloud Function)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Step 2.4: Deny Request API

**File**: `src/app/api/profiles/deny-access/route.ts`

```typescript
// POST /api/profiles/deny-access
export async function POST(request: NextRequest) {
  try {
    const { requestId, resumeId, reason } = await request.json();

    // 1. Update request status to "denied"
    // 2. Send notification to requester with optional reason
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Step 2.5: Check Access API

**File**: `src/app/api/profiles/check-access/route.ts`

```typescript
// GET /api/profiles/check-access?resumeId=XXX
// Used by resume page to check if user has valid access
export async function GET(request: NextRequest) {
  try {
    const resumeId = request.nextUrl.searchParams.get("resumeId");
    const currentUser = await getAuth();

    // 1. Check if owner
    // 2. Check if published
    // 3. Check access grants for valid, non-expired grant
    // 4. Return access status + expiry
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Step 2.6: Revoke Access API

**File**: `src/app/api/profiles/revoke-access/route.ts`

```typescript
// POST /api/profiles/revoke-access
// Owner revokes access grant
export async function POST(request: NextRequest) {
  try {
    const { grantId, resumeId } = await request.json();

    // 1. Delete access grant
    // 2. Send notification to revoked user
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Step 2.7: Get Notifications API

**File**: `src/app/api/notifications/list/route.ts`

```typescript
// GET /api/notifications/list
// Get user's notifications
export async function GET() {
  try {
    const currentUser = await getAuth();

    // Return: unread notifications, sorted by date desc
    // Include counts: pending requests, new approvals
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

---

## Phase 3: Frontend Components (4-5 days)

### Step 3.1: Search Page

**File**: `src/app/profiles/search/page.tsx`

Features:

- Search input with debounce
- Filter buttons (role, location, skills)
- Results grid showing public summaries
- "Request Full Resume" button per card
- Show "Approved until [date]" if already approved

### Step 3.2: Public Profile Page

**File**: `src/app/profiles/[username]/page.tsx`

Display logic:

```typescript
const currentUser = useAuth();
const profileOwner = useProfile(username);
const accessStatus = useCheckAccess(resumeId);

if (!currentUser) {
  return <LoginPrompt />;
}

if (currentUser.uid === profileOwner.uid) {
  return <FullResume /> {/* Owner sees their own */}
}

if (accessStatus.hasAccess) {
  return <FullResume expiresAt={accessStatus.expiresAt} />;
}

// Default: show public summary + request button
return <PublicSummary onRequest={() => requestAccess()} />;
```

### Step 3.3: Request Dialog

**File**: `src/components/RequestAccessDialog.tsx`

```typescript
// Modal with:
// - "Request Full Resume" button
// - Optional message textarea
// - Loading state
// - Success message: "Request sent!"
```

### Step 3.4: Approval Dashboard

**File**: `src/app/dashboard/access/page.tsx`

Three tabs:

1. **Pending Requests**

   - Requester avatar + name
   - Resume title
   - Request date
   - Approve buttons: 1hr | 1day | 1week | Forever
   - Deny button

2. **Active Grants**

   - Grantee avatar + name
   - Resume title
   - Granted date
   - Expires at (with countdown timer)
   - Revoke button

3. **Request History**
   - All past requests (approved/denied)
   - Filter by status

### Step 3.5: Notifications Component

**File**: `src/components/NotificationBell.tsx`

```typescript
// Bell icon with badge count
// Dropdown showing:
// - New requests: "User A requested your resume"
// - Approvals: "Your request for [resume] approved! Expires in 6 days"
// - Denials: "Your request declined"
// - Click to navigate to relevant dashboard
```

### Step 3.6: Public Summary Card

**File**: `src/components/ProfileSummaryCard.tsx`

Display:

```
[Avatar]
Name
Role (if available)
Location (if available)
Bio (1-2 sentences)

[Request Full Resume] button
[Approved until date] (if approved)
```

### Step 3.7: Access Approval Modal

**File**: `src/components/AccessApprovalModal.tsx`

```typescript
// Shows when owner clicks request
// Displays:
// - Requester info
// - Request message (if any)
// - Duration options
// - Approve/Deny buttons
```

---

## Phase 4: Helper Hooks (2-3 days)

### Hook 4.1: useProfileSearch

```typescript
const { results, loading, search, filter } = useProfileSearch();

// Usage:
search("anil");
filter({ role: "Engineer" });
```

### Hook 4.2: useAccessControl

```typescript
const {
  accessRequests, // pending requests
  accessGrants, // active approvals
  approve,
  deny,
  revoke,
} = useAccessControl(resumeId);
```

### Hook 4.3: useNotifications

```typescript
const {
  notifications,
  unreadCount,
  markAsRead,
  delete,
  subscribe,  // real-time
} = useNotifications();
```

### Hook 4.4: useCheckAccess

```typescript
const {
  hasAccess,
  accessType, // "owner" | "public" | "granted" | "none"
  expiresAt,
  grantDuration,
  requestAccess,
} = useCheckAccess(resumeId);
```

---

## Phase 5: Cloud Functions (3-4 days)

### Function 5.1: Auto-Expire Grants

```typescript
// Triggered daily
// Finds all access grants with expiresAt < now
// Deletes them
// Optionally sends "access expired" notification
```

### Function 5.2: Generate Search Index

```typescript
// Triggered on resumeProfiles write
// Creates/updates entry in searchIndex
// Indexes on: username, name, skills, role
```

### Function 5.3: Update Public Bio

```typescript
// Triggered on resumeProfiles create (first resume)
// Calls Gemini API
// Generates public bio from job target + skills
// Stores in user.publicProfile.aiSelectedBio
```

### Function 5.4: Cleanup Denied Requests

```typescript
// Triggered daily
// Removes old denied requests (>30 days)
```

---

## Phase 6: Testing (2-3 days)

### Test Cases

- [ ] Search finds users by name, username, skills
- [ ] Search results show correct public info only
- [ ] Request button works and sends notification
- [ ] Owner receives notification
- [ ] Owner can approve with different durations
- [ ] Requester receives approval notification
- [ ] Approved user can view full resume
- [ ] Expiry date shows correctly
- [ ] Expired access is removed
- [ ] Revoke button works
- [ ] Denied request shows to requester
- [ ] No PII in public summaries

---

## Risk Mitigation

| Risk                               | Mitigation                                  |
| ---------------------------------- | ------------------------------------------- |
| Spam requests                      | Rate limit: max 5 requests/day per user     |
| Users requesting repeatedly        | Cache that they already requested           |
| Forgetting to clean expired grants | Cloud Function runs daily                   |
| Notifications overload             | Combine similar notifications, allow muting |
| Search performance                 | Algolia extension or pagination with limit  |
| Privacy leaks in search            | Never show email/phone in search results    |

---

## Estimated Timeline

- **Phase 1** (Data Models): 2-3 days
- **Phase 2** (APIs): 3-4 days
- **Phase 3** (UI Components): 4-5 days
- **Phase 4** (Hooks): 2-3 days
- **Phase 5** (Cloud Functions): 3-4 days
- **Phase 6** (Testing): 2-3 days

**Total: 16-22 days** (aggressive: 2-3 weeks)

---

## Start With

1. ✅ Update data types
2. ✅ Create basic search API
3. ✅ Build `/profiles/search` page
4. ✅ Add "Request Access" button
5. ✅ Test full flow end-to-end
6. ✅ Then add approval UI & notifications

**Minimum Viable Product (MVP): 1 week of focused work**
