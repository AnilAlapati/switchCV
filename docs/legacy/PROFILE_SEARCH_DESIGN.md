# 🔐 Profile Search & Access Control System Design

## Overview

A sophisticated user discovery and access control system where:

- **Public Layer**: Anyone logged in can find & view public profile summaries (name + AI-selected bio)
- **Private Layer**: Full resumes require explicit approval from the owner
- **Approval Layer**: Time-limited access grants (1hr, 1day, 1week, forever)
- **Notification Layer**: Real-time notifications for requests & approvals

---

## 1. User Journey Flows

### Flow 1: Discover & Request Access

```
User logs in
    ↓
Goes to /profiles/search
    ↓
Searches for someone (e.g., "anil" or "Software Engineer")
    ↓
Sees public summary: Name + Bio only (NO contact, NO experience details)
    ↓
Clicks "Request Full Resume"
    ↓
Optional message: "Why do you want to see this?"
    ↓
Request sent → Owner gets notification
```

### Flow 2: Owner Reviews Request

```
Owner gets notification: "John requested your full resume"
    ↓
Clicks notification → Shows requester info
    ↓
Chooses approval option:
   • "View for 1 hour"
   • "View for 1 day"
   • "View for 1 week"
   • "View forever" (permanent until revoked)
   • "Deny"
    ↓
Requester gets notification: "Approved! View until [date/time]"
```

### Flow 3: View Full Resume

```
Approved requester visits /profiles/[username]
    ↓
System checks access grant:
   • Is it still valid? (check expiry)
   • Is it approved?
    ↓
If approved → Show full resume
If denied/expired → Show "Access expired" message + option to request again
```

---

## 2. Data Models

### A. User Document (Enhanced)

**Location**: `/users/{userId}`

```typescript
{
  // Existing fields
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;

  // NEW - Public Profile Fields
  publicProfile: {
    username: string;        // URL-friendly: "anil-alapati"
    visible: boolean;        // Can others see public summary?
    aiSelectedBio: string;   // AI-curated public bio (no PII)
    role?: string;           // e.g., "Software Engineer" (optional)
    location?: string;       // City only, no full address
  };

  // NEW - Resume Summaries (for searching)
  resumeSummaries: {
    [resumeId]: {
      title: string;        // "Full Stack Developer Role"
      targetRole?: string;
      skills?: string[];    // Array of top 5-7 skills
    }
  };
}
```

### B. Resume Profile Document (Enhanced)

**Location**: `/resumeProfiles/{resumeId}`

```typescript
{
  // Existing fields
  userId: string;
  title: string;
  slug: string;
  published: boolean;

  // NEW - Access Control Fields
  accessControl: {
    allowPublicSummary: boolean;  // Can logged-in users see summary?

    accessRequests: [              // Pending requests
      {
        requestId: string;
        fromUserId: string;
        fromUserName: string;
        timestamp: Date;
        message?: string;
        status: "pending" | "approved" | "denied";
      }
    ];

    accessGrants: [                // Approved access
      {
        grantId: string;
        toUserId: string;
        grantedAt: Date;
        expiresAt: Date | null;    // null = forever
        duration: "1hour" | "1day" | "1week" | "forever";
        grantedBy: string;         // Owner's UID
      }
    ];
  };
}
```

### C. Notifications Collection

**Location**: `/notifications/{userId}/messages/{notificationId}`

```typescript
{
  id: string;
  userId: string;              // Recipient
  type: "request" | "approval" | "denial" | "expiry_warning";

  // Request notification
  fromUserId?: string;
  fromUserName?: string;
  resumeTitle?: string;
  message?: string;

  // Approval notification
  approvalDuration?: "1hour" | "1day" | "1week" | "forever";
  expiresAt?: Date;

  timestamp: Date;
  read: boolean;
  actionUrl?: string;          // Link to take action
}
```

### D. Search Index Document (Optional but Recommended)

**Location**: `/searchIndex/{resumeId}`

```typescript
{
  userId: string;
  username: string;
  displayName: string;
  email: string;              // Searchable but not shown
  bio: string;
  role?: string;
  location?: string;
  skills?: string[];
  resumeId: string;
  updatedAt: Date;

  // For full-text search (with Algolia or Firebase extensions)
  searchText: string;         // Combined field for searching
}
```

---

## 3. Firestore Security Rules

### Enhanced Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User public profiles (accessible to anyone authenticated)
    match /users/{userId} {
      // Public profile summary: visible to authenticated users
      match /publicProfile {
        allow read: if request.auth != null;
      }

      // User can read/write their own profile
      allow read, write: if request.auth.uid == userId;
    }

    // Resume profiles with access control
    match /resumeProfiles/{resumeId} {
      // Public published resumes (anyone can view)
      allow read: if resource.data.published == true;

      // Owner can always read their own
      allow read: if request.auth.uid == resource.data.userId;

      // Check if user has valid access grant
      allow read: if request.auth != null &&
                     hasValidAccessGrant(request.auth.uid, resource.data);

      // Owner can create/update/delete
      allow create: if request.auth.uid == request.resource.data.userId;
      allow update: if request.auth.uid == resource.data.userId;
      allow delete: if request.auth.uid == resource.data.userId;
    }

    // Access requests (users can create, owner can read/update)
    match /resumeProfiles/{resumeId}/accessRequests/{requestId} {
      allow read: if request.auth.uid == resource.data.fromUserId ||
                     request.auth.uid ==
                     get(/databases/$(database)/documents/resumeProfiles/$(resumeId)).data.userId;

      allow create: if request.auth.uid == request.resource.data.fromUserId;

      allow update: if request.auth.uid ==
                       get(/databases/$(database)/documents/resumeProfiles/$(resumeId)).data.userId;
    }

    // Notifications (users can read/delete their own)
    match /notifications/{userId}/{document=**} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }

    // Search index (read-only for authenticated users)
    match /searchIndex/{resumeId} {
      allow read: if request.auth != null;
      allow write: if false; // Server-side only
    }
  }
}
```

---

## 4. Frontend Components Needed

### A. `/profiles/search` - User Discovery Page

**Features**:

- Search bar (search by name, username, location, skills)
- Filter: Role, Location, Skills
- Results show: Avatar, Name, Role, Location, Bio (AI-curated)
- "Request Full Resume" button on each card
- Show approval status if already approved

### B. `/profiles/[username]` - Public Profile Page

**Shows**:

- Public summary (name, bio, role, location)
- Logout users → "Sign in to view profiles"
- Logged-in users without access → Show summary + "Request Full Resume"
- Approved users → Show full resume with expiry timer
- Owner viewing own → Show full resume + option to change access settings

### C. `/dashboard/access-requests` - Owner Approval Dashboard

**Features**:

- Tab 1: Pending Requests
  - Shows requester info
  - Shows resume requested
  - Action buttons: Approve (1hr/1day/1week/forever), Deny
- Tab 2: Active Grants
  - Shows who has access
  - Shows expiry time
  - Revoke button
- Tab 3: Denied Requests
  - Shows history of denied requests

### D. Notification Bell Component

**Real-time notifications for**:

- New access requests
- Approval/denial responses
- Access about to expire (24 hours warning)

---

## 5. API Routes Needed

### A. `POST /api/profiles/search`

```typescript
// Request
{
  query: string;           // Search term
  filters?: {
    role?: string;
    location?: string;
    skills?: string[];
  };
  limit?: number;
}

// Response
{
  results: [
    {
      userId: string;
      username: string;
      displayName: string;
      bio: string;
      role?: string;
      location?: string;
      hasApproval: boolean;
      expiresAt?: Date;
    }
  ];
}
```

### B. `POST /api/profiles/request-access`

```typescript
// Request
{
  resumeId: string;
  message?: string;     // Optional message to owner
}

// Response
{
  requestId: string;
  status: "sent";
  notification: {
    sent: true;
    toUserId: string;
  };
}
```

### C. `POST /api/profiles/approve-access`

```typescript
// Request (owner only)
{
  requestId: string;
  duration: "1hour" | "1day" | "1week" | "forever";
}

// Response
{
  grantId: string;
  expiresAt: Date | null;
  requesterNotified: boolean;
}
```

### D. `POST /api/profiles/deny-access`

```typescript
// Request
{
  requestId: string;
  reason?: string;
}
```

### E. `POST /api/profiles/revoke-access`

```typescript
// Request (owner only)
{
  grantId: string;
}
```

### F. `GET /api/profiles/check-access`

```typescript
// Query: ?resumeId=XXX&userId=YYY
// Response
{
  hasAccess: boolean;
  accessType: "owner" | "public" | "granted" | "none";
  expiresAt?: Date;
  grant?: {
    grantId: string;
    duration: string;
  };
}
```

---

## 6. AI-Powered Bio Generation

**When user creates first resume**:

```typescript
// In create-resume flow
const publicBio = await generatePublicBio({
  jobTarget: resumeData.jobTarget,
  experience: resumeData.experience,
  skills: resumeData.skills,
  // DON'T pass: email, phone, location details
});

// API call to /api/ai/generate-bio
{
  prompt: `Create a 1-2 sentence professional bio for someone with:
           - Target role: ${jobTarget}
           - Key skills: ${skills}

           Requirements:
           - No email, phone, or personal contact
           - No specific company names
           - Focus on professional identity
           - Make it catchy but professional

           Bio:`,
  maxTokens: 50,
}

// Result (e.g.):
// "Full Stack Developer passionate about scalable cloud solutions.
//  Experienced with React, Node.js, and modern cloud architectures."
```

---

## 7. Privacy & Security Considerations

### What's Public (No Auth Required)

- ✅ Published full resumes (with `published: true`)
- ✅ User's resume slug URL

### What Requires Login to See

- 📋 Other users' public summaries (name + AI bio)
- 🔍 Search index
- 📬 Notifications

### What Requires Explicit Approval

- 📄 Full resume (all sections)
- 👤 Contact information
- 💼 Detailed experience
- 📊 Salary expectations (if shown)

### What's Never Shown

- ❌ Passwords
- ❌ Login credentials
- ❌ Payment information
- ❌ Sensitive personal data

### Expiry Mechanics

```typescript
// When checking access:
if (grant.expiresAt && new Date() > grant.expiresAt) {
  // Access expired
  // Remove from accessGrants
  // Send notification: "Your access to [resume] has expired"
  return { hasAccess: false };
}
```

---

## 8. Notification Flow Example

### Timeline: User A requests, User B approves

```
T=0:00    User A clicks "Request Full Resume"
          → Creates access request in DB
          → Sends notification to User B (owner)

T=0:05    User B checks notifications
          → Sees: "User A (john@example.com) requested your resume"
          → Click to view request details

T=0:10    User B clicks "Approve for 1 week"
          → Creates access grant (expires in 7 days)
          → Notification sent to User A

T=0:15    User A gets notification
          → "Your request approved! View until Nov 21, 2025"

T=0:20    User A visits /profiles/[username]
          → Full resume loads successfully
          → Shows timer: "Access expires in 6 days 23 hours"

T=7 days  Automatic expiry
          → Access grant deleted
          → Optional notification: "Your access expired"
          → User A can request again
```

---

## 9. Implementation Phases

### Phase 1: MVP (Week 1)

- [ ] Update user data model with publicProfile
- [ ] Add access control fields to resumeProfiles
- [ ] Build search API
- [ ] Create /profiles/search page
- [ ] Implement request-access flow
- [ ] Update Firestore rules

### Phase 2: Approvals (Week 2)

- [ ] Create approval dashboard
- [ ] Implement approval/denial APIs
- [ ] Add expiry logic
- [ ] Build real-time notifications

### Phase 3: Polish (Week 3)

- [ ] AI-powered bio generation
- [ ] Advanced search filters
- [ ] Activity history
- [ ] Analytics

---

## 10. Database Usage Estimation

### Collections Created/Enhanced

1. `users` - Enhanced with publicProfile (10KB per user)
2. `resumeProfiles` - Enhanced with accessControl (5KB per resume)
3. `notifications` - New (1KB per notification)
4. `searchIndex` - New (2KB per resume)

### Read/Write Operations

**Per User Discovery Session**:

- 1 search query
- 1 profile read
- 1 request creation (optional)

**Per Approval**:

- 1 request update
- 1 grant creation
- 1 notification creation
- 2 notifications sent (to requester)

**Daily Activity** (1000 users):

- ~100 searches
- ~50 requests
- ~30 approvals
- ~200 notifications

---

## 11. Future Enhancements

- 🤖 AI-powered resume matching ("You match 85% with this job seeker")
- 💬 Built-in messaging between users
- ⭐ Rating/review system for recruiters
- 📊 Analytics: "Your resume viewed 15 times"
- 🔗 Shareable links: "/profiles/anil?share=abc123" (2-week access)
- 🏢 Company profiles (recruiters)
- 📧 Email notifications option
- 🔔 Push notifications (PWA)

---

**This design ensures privacy, control, and flexibility while enabling discovery!**
