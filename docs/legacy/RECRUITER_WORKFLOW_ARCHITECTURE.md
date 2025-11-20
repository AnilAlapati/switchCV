# 🏗️ Recruiter Workflow Architecture

## System Flow Diagram

```
┌─────────────────┐
│  RECRUITER      │
│  (Browser)      │
└────────┬────────┘
         │
         ├─→ GET /api/profiles/search
         │   ↓ [SearchInterface]
         │   Shows candidates (public info only)
         │
         ├─→ POST /api/recruiters/request-contact
         │   ↓ [RequestModal]
         │   Creates RecruiterContactRequest
         │   Status: pending_review
         │
         └─→ GET /api/recruiters/request-contact
             ↓ [RequestManagement]
             Shows own requests
             Tracks status updates

         ↕ Notifications (WebSocket or polling)

┌──────────────────────────────────────────────┐
│         FIREBASE FIRESTORE                   │
│                                              │
│  recruiterRequests/                          │
│  ├─ {id: status: "pending"}                 │
│  ├─ → Admin reviews                         │
│  └─ → Transitions to approved/denied        │
│                                              │
│  accessTokens/                               │
│  ├─ Generated on approval                   │
│  ├─ Signed with HMAC-SHA256                │
│  └─ Expires after duration                  │
│                                              │
│  auditLogs/                                  │
│  ├─ Created on every action                │
│  └─ Admin only access                      │
└──────────────────────────────────────────────┘
         ↑
         │
┌────────┴─────────┐
│  ADMIN PANEL     │
│  (Browser)       │
└────────┬─────────┘
         │
         ├─→ GET /dashboard/recruiter-requests
         │   ↓ [AdminDashboard]
         │   Lists all pending requests
         │   Real-time updates
         │
         ├─→ POST /api/recruiters/approve-contact
         │   ↓ Token generated
         │   ↓ Notifications sent
         │   ↓ Audit log created
         │
         └─→ POST /api/recruiters/deny-contact
             ↓ Recruiter notified
             ↓ Audit log created

┌─────────────────┐
│  CANDIDATE      │
│  (Browser)      │
└────────┬────────┘
         │
         └─→ Gets notification when approved
             ↓ Sees who has access
             ↓ Can revoke anytime (future)
```

## Token Generation & Verification Flow

```
APPROVAL REQUEST
     ↓
┌──────────────────────────────────────────┐
│ Recruiter Request (pending)              │
│ - from: recruiter info                  │
│ - to: candidate ID                      │
│ - fields: [email, phone]                │
│ - duration: 1week                       │
└──────────────────────────────────────────┘
     ↓
   ADMIN REVIEW
     ↓
   ┌─ APPROVE ─────────────────────────────┐
   │                                        │
   │ Calculate Expiration:                 │
   │ now() + duration_seconds              │
   │ = timestamp (7 days from now)         │
   │                                        │
   │ Generate Token:                       │
   │ ┌────────────────────────────────┐   │
   │ │ HEADER.PAYLOAD.SIGNATURE       │   │
   │ │                                │   │
   │ │ Header:                        │   │
   │ │ { alg: "HS256", typ: "JWT" }   │   │
   │ │                                │   │
   │ │ Payload:                       │   │
   │ │ {                              │   │
   │ │   tokenId,                     │   │
   │ │   recruiterId,                 │   │
   │ │   userId,                      │   │
   │ │   accessFields: ["email"],     │   │
   │ │   expiresAt: 1234567890,       │   │
   │ │   iat: 1234567890              │   │
   │ │ }                              │   │
   │ │                                │   │
   │ │ Signature:                     │   │
   │ │ HMAC-SHA256(                   │   │
   │ │   SECRET,                      │   │
   │ │   header.payload               │   │
   │ │ )                              │   │
   │ └────────────────────────────────┘   │
   │                                        │
   │ Hash Token:                           │
   │ hash = SHA256(token)                  │
   │                                        │
   │ Store in Firestore:                  │
   │ {                                     │
   │   token,        // encrypted          │
   │   tokenHash,    // for verification  │
   │   expiresAt,    // timestamp         │
   │   isRevoked,    // false initially   │
   │   usageCount,   // 0 initially       │
   │   lastUsedAt    // null initially    │
   │ }                                     │
   └────────────────────────────────────────┘
     ↓
   NOTIFICATIONS SENT
     ├─ Recruiter: "Request approved!"
     └─ Candidate: "Access granted"

┌──────────────────────────────────────────┐
│ RECRUITER USES TOKEN                     │
│ (Needs to access candidate PII)          │
└──────────────────────────────────────────┘
     ↓
   ┌─ VERIFY TOKEN ────────────────────────┐
   │                                        │
   │ 1. Receive token                      │
   │                                        │
   │ 2. Split into 3 parts:                │
   │    header . payload . signature       │
   │                                        │
   │ 3. Recompute signature:               │
   │    expected = HMAC-SHA256(            │
   │       SECRET,                         │
   │       header.payload                  │
   │    )                                  │
   │                                        │
   │ 4. Compare:                           │
   │    if signature !== expected:         │
   │       ❌ INVALID TOKEN (tampering!)   │
   │                                        │
   │ 5. Decode payload:                    │
   │    payload = JSON.parse(              │
   │       base64decode(payload_part)      │
   │    )                                  │
   │                                        │
   │ 6. Check expiration:                  │
   │    now = current_unix_timestamp       │
   │    if payload.expiresAt < now:        │
   │       ❌ EXPIRED                      │
   │                                        │
   │ 7. Check revocation:                  │
   │    if db.accessTokens[id].isRevoked:  │
   │       ❌ REVOKED                      │
   │                                        │
   │ 8. Calculate time remaining:          │
   │    remaining = expiresAt - now        │
   │    = 5 days 12 hours remaining        │
   │                                        │
   │ 9. Track usage:                       │
   │    db.accessTokens[id].usageCount++   │
   │    db.accessTokens[id].lastUsedAt=now │
   │                                        │
   │ ✅ VALID TOKEN                        │
   │    Return access_fields: ["email"]    │
   │                                        │
   └────────────────────────────────────────┘
     ↓
   ACCESS GRANTED
   Recruiter can now see:
   ├─ Email: candidate@example.com
   └─ Expires in: 5 days
```

## Data Model Relationships

```
RecruiterContactRequest
    │
    ├─ fromRecruiter ──→ Recruiter info
    │  ├─ recruiterId
    │  ├─ name
    │  ├─ email
    │  └─ companyName
    │
    ├─ toUserId ──→ Candidate
    │  └─ references: User
    │
    ├─ resumeId ──→ Resume
    │  └─ references: ResumeProfile
    │
    ├─ status ──→ Request state machine
    │  ├─ pending (initial)
    │  ├─ approved (after admin approval)
    │  ├─ denied (after admin denial)
    │  └─ expired (after token expires)
    │
    └─ (approved) → SecureAccessToken
       ├─ token (JWT)
       ├─ expiresAt (timestamp)
       ├─ accessFields (array)
       └─ usageCount (tracking)

SecureAccessToken
    │
    ├─ Signature verification
    │  └─ HMAC-SHA256(SECRET, header.payload)
    │
    ├─ Expiration check
    │  └─ now < expiresAt
    │
    ├─ Revocation check
    │  └─ isRevoked == false
    │
    └─ Usage tracking
       ├─ usageCount++
       └─ lastUsedAt = now

AuditLog (immutable)
    │
    ├─ action: "request_created"
    ├─ action: "request_approved"
    ├─ action: "request_denied"
    ├─ action: "token_accessed"
    ├─ action: "token_revoked"
    └─ timestamp: creation_time
```

## State Machine

```
REQUEST LIFECYCLE:
┌──────────┐
│ pending  │  Created by recruiter
└────┬─────┘
     │
     ├──ADMIN APPROVES──→ ┌──────────┐
     │                    │ approved │  Token generated
     │                    └────┬─────┘
     │                         │
     │                         ├──WAIT──→ ┌─────────┐
     │                         │          │ expired │  After duration
     │                         │          └─────────┘
     │                         │
     │                         └──ADMIN REVOKES──→ ┌────────┐
     │                                             │ revoked│
     │                                             └────────┘
     │
     └──ADMIN DENIES────→ ┌────────┐
                          │ denied │  Recruiter notified
                          └────────┘


TOKEN LIFECYCLE:
┌─────────┐
│ active  │  Just created, valid for use
└────┬────┘
     │
     ├──TIME PASSES──→ ┌─────────┐
     │                 │ expired │  No longer valid
     │                 └─────────┘
     │
     └──ADMIN REVOKES─→ ┌────────┐
                        │ revoked│  Immediately invalid
                        └────────┘
```

## API Call Sequence

### Approval Flow

```
1. Recruiter POST /api/recruiters/request-contact
   {recruiterId, userId, resumeId, fields, purpose, duration}
   Response: {requestId, status: "pending_review"}

2. Admin reviews request at /dashboard/recruiter-requests
   Sees: recruiter info, candidate, requested fields, purpose

3. Admin POST /api/recruiters/approve-contact
   {requestId, duration: "1week", adminUserId}

4. Server:
   ├─ Calculate expiresAt = now + 7 days
   ├─ Generate token with tokenGenerator.generateToken()
   ├─ Store in accessTokens collection
   ├─ Update request status to "approved"
   ├─ Create notification for recruiter
   ├─ Create notification for candidate
   └─ Create audit log entry

5. Response: {tokenId, expiresAt}

6. Recruiter gets notification
   Can now use token to access PII
```

### Verification Flow

```
1. Recruiter POST /api/recruiters/verify-token
   {token, tokenId, recruiterId}

2. Server:
   ├─ Parse token into 3 parts
   ├─ Verify signature (HMAC)
   ├─ Decode payload
   ├─ Check expiration
   ├─ Check revocation status
   ├─ Increment usageCount
   └─ Update lastUsedAt

3. Response:
   {
     valid: true,
     accessFields: ["email", "phone"],
     expiresAt: "2025-11-21T...",
     remainingSeconds: 432000,  // 5 days
     usageCount: 5
   }
```

## Firestore Collection Structure

```
recruiterRequests/ ─────────────────────────────────────────
│
├── request_id_1/
│   ├── fromRecruiter: {recruiterId, name, email, companyName}
│   ├── toUserId: "candidate123"
│   ├── resumeId: "resume456"
│   ├── requestedFields: ["email", "phone"]
│   ├── purpose: "Potential opportunity..."
│   ├── proposedDuration: "1week"
│   ├── status: "pending"
│   ├── createdAt: Timestamp(Nov 14, 2025)
│   ├── updatedAt: Timestamp(Nov 14, 2025)
│   │
│   └── [When approved by admin:]
│       ├── status: "approved"
│       ├── reviewedBy: "admin_user_id"
│       ├── reviewedAt: Timestamp(Nov 14, 2025)
│       └── tokenId: "token_id_789"
│
└── request_id_2/
    ├── status: "denied"
    ├── denialReason: "Unverified company"
    └── ...

accessTokens/ ─────────────────────────────────────────────
│
├── token_id_789/
│   ├── tokenId: "token_id_789"
│   ├── recruiterId: "recruiter123"
│   ├── userId: "candidate456"
│   ├── resumeId: "resume789"
│   ├── token: "eyJhbGc..." (JWT)
│   ├── tokenHash: "a7b3c5d9..." (SHA256)
│   ├── accessFields: ["email", "phone"]
│   ├── accessType: "read-only"
│   ├── issuedAt: Timestamp(Nov 14, 2025)
│   ├── expiresAt: Timestamp(Nov 21, 2025)
│   ├── duration: "1week"
│   ├── isRevoked: false
│   ├── usageCount: 3
│   └── lastUsedAt: Timestamp(Nov 14 15:30)
│
└── token_id_790/
    ├── isRevoked: true
    ├── revokedAt: Timestamp(Nov 15, 2025)
    ├── revokeReason: "Suspicious activity"
    └── ...

auditLogs/ ────────────────────────────────────────────────
│
├── audit_1/
│   ├── action: "request_created"
│   ├── requestId: "request_id_1"
│   ├── recruiterId: "recruiter123"
│   ├── recruiterEmail: "john@acme.com"
│   ├── timestamp: Timestamp(Nov 14 10:00)
│   └── details: {...}
│
├── audit_2/
│   ├── action: "request_approved"
│   ├── requestId: "request_id_1"
│   ├── tokenId: "token_id_789"
│   ├── adminUserId: "admin_user_id"
│   ├── duration: "1week"
│   ├── timestamp: Timestamp(Nov 14 10:30)
│   └── details: {...}
│
└── audit_3/
    ├── action: "token_verified"
    ├── tokenId: "token_id_789"
    ├── recruiterId: "recruiter123"
    ├── timestamp: Timestamp(Nov 14 15:30)
    └── result: "success"
```

## Security Layers

```
Layer 1: Authentication
├─ Firebase Auth required
├─ User must be logged in
└─ uid extracted from request

Layer 2: Authorization (Firestore Rules)
├─ Recruiters can create requests
├─ Only admins can approve/deny
├─ Only candidates can be recipients
└─ Prevents cross-user access

Layer 3: Token Signature
├─ HMAC-SHA256 signing
├─ Secret key required
├─ Tampering detection
└─ Prevents token forgery

Layer 4: Token Expiration
├─ Timestamp validation
├─ Auto-expiry after duration
├─ No manual extension
└─ Forces re-approval for new access

Layer 5: Revocation
├─ Admin can revoke anytime
├─ Immediate effect
├─ Usage tracking
└─ Audit log created

Layer 6: Audit Trail
├─ All actions logged
├─ Immutable logs
├─ Admin access only
└─ Compliance & forensics
```

## Performance Characteristics

```
Operation         | Time Complexity | Space | Indexed?
──────────────────┼─────────────────┼───────┼──────────
Create request    | O(1)            | 1KB   | requestId
List recruiter    | O(n)            | nKB   | recruiterId
requests          |                 |       |
──────────────────┼─────────────────┼───────┼──────────
Approve request   | O(1)            | 3KB   | requestId
(token gen)       |                 |       |
──────────────────┼─────────────────┼───────┼──────────
Verify token      | O(1)            | 0KB   | tokenId
                  | (signature OK)  |       | (hash)
──────────────────┼─────────────────┼───────┼──────────
List pending      | O(n)            | nKB   | status
requests          |                 |       |
──────────────────┼─────────────────┼───────┼──────────
Check expiration  | O(1)            | 0KB   | timestamp
                  |                 |       | comparison
```

---

This architecture is:

- ✅ Scalable (Firestore native)
- ✅ Secure (multi-layer)
- ✅ Auditable (complete logs)
- ✅ Compliant (privacy controls)
- ✅ Fast (optimized queries)
