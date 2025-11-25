# 📊 Profile Search System - Visual Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SwitchCV Application                        │
└─────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   Logged-in Users   │
                    └──────────┬──────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │   Search     │   │   Profile    │   │  Dashboard   │
    │  Other Users │   │    Page      │   │  (Owner)     │
    │ /profiles/   │   │ /profiles/   │   │ /dashboard/  │
    │  search      │   │ [username]   │   │ access       │
    └──────┬───────┘   └──────┬───────┘   └──────┬───────┘
           │                  │                  │
           └──────────────────┼──────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌────────────────────────────┐         ┌────────────────────────────┐
│     Frontend Components    │         │   Backend API Routes      │
├────────────────────────────┤         ├────────────────────────────┤
│ • SearchPage              │         │ POST /api/profiles/search  │
│ • ProfileSummaryCard      │         │                            │
│ • RequestAccessDialog     │         │ POST /request-access       │
│ • ApprovalDashboard       │◄────────┤ POST /approve-access       │
│ • NotificationBell        │         │ POST /deny-access          │
│ • AccessExpiryTimer       │         │ POST /revoke-access        │
│                            │         │ GET  /check-access         │
└────────────────────────────┘         │                            │
                                       └────────────────────────────┘
        │                                          │
        │                    ┌─────────────────────┘
        │                    │
        └────────┬───────────┴─────────┬──────────┐
                 │                     │          │
                 ▼                     ▼          ▼
        ┌──────────────────┐  ┌─────────────────┐
        │   Firestore      │  │  Cloud          │
        │  Collections     │  │  Functions      │
        ├──────────────────┤  ├─────────────────┤
        │ resumeProfiles   │  │ • Auto-expire   │
        │ ├─accessRequests │  │   grants        │
        │ └─accessGrants   │  │ • Generate      │
        │                  │  │   search index  │
        │ users            │  │ • Create AI     │
        │ └─publicProfile  │  │   bio           │
        │                  │  │ • Send notifs   │
        │ notifications    │  │                 │
        │ └─messages       │  └─────────────────┘
        │                  │
        │ searchIndex      │
        └──────────────────┘
```

---

## Data Flow Diagrams

### Flow 1: Search Users

```
User clicks "Search"
    │
    ▼
Enters search query
    │
    ▼
Calls POST /api/profiles/search
    │
    ▼
API queries Firestore:
  SELECT FROM users WHERE visible=true
    │
    ▼
Returns PUBLIC summaries ONLY:
  {
    name,
    role,
    location,
    bio (AI-generated),
    skills
  }
    │
    ▼
Frontend displays results
```

### Flow 2: Request Access

```
User clicks "Request Full Resume"
    │
    ▼
Dialog: "Message?" (optional)
    │
    ▼
Calls POST /api/profiles/request-access
    │
    ├─ Create AccessRequest document
    │    └─ status: "pending"
    │
    ├─ Create Notification for owner
    │    └─ type: "request"
    │
    ▼
Return success to user
    │
    ▼
"Request sent!" message shown
    │
    ▼
Owner gets notification (real-time)
```

### Flow 3: Owner Approves

```
Owner sees notification
    │
    ▼
Clicks → Goes to Dashboard
    │
    ▼
"Pending Requests" tab
    │
    ├─ Shows requester info
    │ └─ Optional message from requester
    │
    ▼
Owner selects duration:
  [1 hour] [1 day] [1 week] [Forever]
    │
    ▼
Calls POST /api/profiles/approve-access
    │
    ├─ Update AccessRequest (status: "approved")
    │
    ├─ Create AccessGrant
    │    ├─ toUserId: requester
    │    ├─ expiresAt: [calculated based on duration]
    │    └─ duration: "1week" (or other)
    │
    ├─ Create Notification for requester
    │    ├─ type: "approval"
    │    └─ message: "Your request approved! Expires [date]"
    │
    ▼
"Approved!" message to owner
    │
    ▼
Requester gets notification (real-time)
```

### Flow 4: View Full Resume

```
Approved user visits /profiles/[username]
    │
    ▼
Component calls GET /api/profiles/check-access
    │
    ├─ Check: Is current user the owner?
    │    └─ YES → Show full resume
    │
    ├─ Check: Has valid AccessGrant?
    │    ├─ YES & not expired → Show full resume + expiry timer
    │    └─ EXPIRED → Show "Access expired" + request button
    │
    └─ NO valid grant → Show public summary + request button
        │
        ▼
    Display based on access level:

    OWNER VIEW:
    ┌──────────────────────────┐
    │  FULL RESUME             │
    │  All sections visible    │
    │  Edit/Share options      │
    └──────────────────────────┘

    APPROVED VIEW:
    ┌──────────────────────────┐
    │  FULL RESUME             │
    │  All sections visible    │
    │  ⏰ Expires in 6 days    │
    │  [View my approvals]     │
    └──────────────────────────┘

    PUBLIC SUMMARY VIEW:
    ┌──────────────────────────┐
    │  PUBLIC SUMMARY          │
    │  Name                    │
    │  Role                    │
    │  Location                │
    │  AI-generated Bio        │
    │  Skills (top 5)          │
    │  [Request Full Resume]   │
    └──────────────────────────┘
```

### Flow 5: Expiry & Revocation

```
Time-based Expiry:
┌────────────────────────────────────────┐
│ AccessGrant created with expiresAt     │
│ Approval granted: Nov 14, 2025 10:00AM │
│ Duration: 1 week                       │
│ Expires: Nov 21, 2025 10:00AM          │
└────────────────────────────────────────┘
         │
         │ (waiting...)
         │
         ▼
┌────────────────────────────────────────┐
│ Nov 21, 2025 10:00:01 AM              │
│ Cloud Function runs                    │
│ Finds all expired grants               │
│ Deletes them                           │
│ Sends notification: "Access expired"   │
└────────────────────────────────────────┘
         │
         ▼
    User tries to view
         │
         ▼
    GET /api/profiles/check-access
         │
         ▼
    No valid grant found
         │
         ▼
    Show: "Access expired, request again"


Manual Revocation:
┌────────────────────────────────────────┐
│ Owner in Dashboard                     │
│ Active Grants tab                      │
│ [Revoke] button                        │
└────────────────────────────────────────┘
         │
         ▼
    POST /api/profiles/revoke-access
         │
         ├─ Delete AccessGrant
         │
         ├─ Send Notification
         │    └─ "Your access was revoked"
         │
         ▼
    User can't view anymore
         │
         ▼
    Can request again
```

---

## Database Schema Visualization

```
┌─ Collection: users
│  └─ Document: {userId}
│     ├─ uid: string
│     ├─ email: string
│     ├─ displayName: string
│     ├─ publicProfile: {
│     │  ├─ username: string
│     │  ├─ visible: boolean
│     │  ├─ aiSelectedBio: string
│     │  ├─ role?: string
│     │  ├─ location?: string
│     │  └─ skills?: array
│     │}
│     └─ resumeSummaries: {
│        └─ {resumeId}: {
│           ├─ title: string
│           ├─ targetRole?: string
│           └─ skills?: array
│        }
│     }
│
├─ Collection: resumeProfiles
│  └─ Document: {resumeId}
│     ├─ userId: string
│     ├─ title: string
│     ├─ slug: string
│     ├─ published: boolean
│     ├─ accessControl: {
│     │  ├─ allowPublicSummary: boolean
│     │  ├─ accessRequests: []     ← Moved to sub-collection
│     │  └─ accessGrants: []       ← Moved to sub-collection
│     │}
│     │
│     ├─ Sub-collection: accessRequests
│     │  └─ Document: {requestId}
│     │     ├─ fromUserId: string
│     │     ├─ fromUserName: string
│     │     ├─ timestamp: Date
│     │     ├─ message?: string
│     │     └─ status: "pending" | "approved" | "denied"
│     │
│     └─ Sub-collection: accessGrants
│        └─ Document: {grantId}
│           ├─ toUserId: string
│           ├─ grantedAt: Date
│           ├─ expiresAt: Date | null
│           └─ duration: "1hour" | "1day" | "1week" | "forever"
│
├─ Collection: notifications
│  └─ Document: {userId}
│     └─ Sub-collection: messages
│        └─ Document: {notificationId}
│           ├─ type: "request" | "approval" | "denial" | "revoked"
│           ├─ fromUserId?: string
│           ├─ fromUserName?: string
│           ├─ resumeTitle?: string
│           ├─ message?: string
│           ├─ timestamp: Date
│           ├─ read: boolean
│           └─ actionUrl?: string
│
└─ Collection: searchIndex (optional)
   └─ Document: {resumeId}
      ├─ userId: string
      ├─ username: string
      ├─ displayName: string
      ├─ bio: string
      ├─ role?: string
      ├─ location?: string
      ├─ skills?: array
      ├─ resumeId: string
      └─ updatedAt: Date
```

---

## State Management Diagram

```
┌─────────────────────────────────────────────────────┐
│         Component: ProfileSearchPage                 │
├─────────────────────────────────────────────────────┤
│ State:                                              │
│  • searchQuery: string                              │
│  • filters: SearchFilters                           │
│  • results: ProfileSearchResult[]                   │
│  • loading: boolean                                 │
│  • selectedProfile: ProfileSearchResult | null      │
│  • requestDialog: {open: boolean, profileId: str}  │
└────────────────────────┬────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    ┌─────────┐   ┌──────────────┐   ┌──────────────┐
    │ Search  │   │ Result Cards │   │ Request      │
    │ Input   │   │              │   │ Dialog       │
    │ & Filter│   │ • Show name  │   │              │
    └────┬────┘   │ • Show bio   │   │ • Message    │
         │        │ • Show role  │   │ • Send btn   │
         │        └──────┬───────┘   └──────┬───────┘
         │               │                  │
         └───────────────┼──────────────────┘
                         │
                    API Call
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
    POST /search                 POST /request-access
        │                                 │
        └─────────────────┬───────────────┘
                          │
                    Firebase/Firestore
```

---

## Notification Flow

```
REQUEST PHASE:
┌────────────────────┐
│ Requester          │
│ Clicks "Request"   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐     ┌─────────────────────┐
│ Notification sent  │────▶│ Owner's notifications│
│ to owner           │     │ collection          │
└────────────────────┘     └──────────┬──────────┘
                                      │
                            ┌─────────▼─────────┐
                            │ Real-time update  │
                            │ (if UI listening) │
                            └───────────────────┘


APPROVAL PHASE:
┌────────────────────┐
│ Owner              │
│ Clicks "Approve"   │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐     ┌──────────────────────┐
│ Notification sent  │────▶│ Requester's notifs   │
│ to requester       │     │ collection           │
└────────────────────┘     └──────────┬───────────┘
                                      │
                            ┌─────────▼──────────┐
                            │ Real-time update   │
                            │ (if UI listening)  │
                            └────────────────────┘


EXPIRY PHASE:
┌──────────────────────┐
│ Cloud Function       │
│ (daily 3:00 AM UTC) │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│ Find expired grants  │────▶│ Delete AccessGrant   │
└──────────┬───────────┘     └──────────────────────┘
           │
           ▼
┌──────────────────────┐     ┌──────────────────────┐
│ Send notification    │────▶│ User's notifications │
│ "Access expired"     │     │ collection           │
└──────────────────────┘     └──────────┬───────────┘
                                        │
                              ┌─────────▼──────────┐
                              │ Real-time update   │
                              └────────────────────┘
```

---

## Security & Privacy Matrix

```
┌─────────────────────┬──────────┬─────────────┬──────────────┐
│ Data                │ Public?  │ Logged In?  │ Approved?    │
├─────────────────────┼──────────┼─────────────┼──────────────┤
│ Name                │    ✅    │     ✅      │     ✅       │
│ Role/Title          │    ✅    │     ✅      │     ✅       │
│ Location (city)     │    ✅    │     ✅      │     ✅       │
│ AI Bio              │    ✅    │     ✅      │     ✅       │
│ Skills (top 5)      │    ✅    │     ✅      │     ✅       │
│ Avatar              │    ✅    │     ✅      │     ✅       │
├─────────────────────┼──────────┼─────────────┼──────────────┤
│ Email               │    ❌    │     ❌      │     ✅       │
│ Phone               │    ❌    │     ❌      │     ✅       │
│ Full Address        │    ❌    │     ❌      │     ✅       │
│ Experience details  │    ❌    │     ❌      │     ✅       │
│ Education details   │    ❌    │     ❌      │     ✅       │
│ Skills (all)        │    ❌    │     ❌      │     ✅       │
│ Full Resume         │    ❌    │     ❌      │     ✅       │
├─────────────────────┼──────────┼─────────────┼──────────────┤
│ Request history     │    ❌    │    Owner    │   Own only   │
│ Access grants       │    ❌    │    Both     │   Valid only │
│ Notifications       │    ❌    │  Own only   │   Own only   │
└─────────────────────┴──────────┴─────────────┴──────────────┘
```

---

**This architecture ensures:**
✅ Privacy through granular access control
✅ Scalability with Firestore sub-collections
✅ Real-time updates via Firestore listeners
✅ Clear separation of concerns
✅ Easy to extend and modify
