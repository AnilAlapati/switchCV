# Code Review — February 14, 2026 (v3, Full Codebase Sweep)

## Scope
- Full backend/API-focused sweep across:
- `src/app/api/**`
- `src/lib/**` (security, data, middleware, notifications, billing)
- `functions/src/**`
- Focused on: authz/authn, cross-tenant data isolation, token security, billing/cost correctness, rate limiting, and Firestore query safety.

## Findings (Ordered by Severity)

### [P0] Admin migration endpoint allows any authenticated user to run global migration
- File:
- `src/app/api/admin/migrate-numeric-ids/route.ts:34`
- `src/app/api/admin/migrate-numeric-ids/route.ts:39`
- Evidence:
- Route verifies authentication only, then allows `migrateAllResumesToNumericIds()` without admin-role check.
- Impact:
- Any authenticated user can trigger system-wide migration operations.
- Recommended fix:
- Enforce admin authorization (`isAdmin`/custom claims) before executing migration.

### [P0] Cross-tenant IDOR in recruiter candidates API (read/update access to other recruiters' candidates)
- File:
- `src/app/api/recruiter/candidates/route.ts:152`
- `src/app/api/recruiter/candidates/route.ts:261`
- `src/app/api/recruiter/candidates/route.ts:297`
- Evidence:
- Candidate documents are created with `createdBy`, but `update-priority`, `add-note`, GET-by-id, and list-all do not filter/verify ownership.
- Impact:
- Recruiters can read and mutate candidates and notes belonging to other recruiters.
- Recommended fix:
- Enforce `candidate.createdBy === authUserId` (or tenant/org-scoped ownership) on all read/write paths.

### [P0] Cross-tenant IDOR in recruiter bulk-actions API (execute/cancel/view other recruiters’ actions)
- File:
- `src/app/api/recruiter/bulk-actions/route.ts:158`
- `src/app/api/recruiter/bulk-actions/route.ts:197`
- `src/app/api/recruiter/bulk-actions/route.ts:254`
- `src/app/api/recruiter/bulk-actions/route.ts:278`
- Evidence:
- Actions are created with `createdBy`, but execution/cancellation/read paths do not verify ownership.
- Impact:
- Recruiters can execute/cancel or inspect other recruiters’ bulk operations.
- Recommended fix:
- Require `action.createdBy === authUserId` (or admin override).

### [P0] Cross-tenant IDOR in recruiter interviews API (read/update all interviews)
- File:
- `src/app/api/recruiter/interviews/route.ts:180`
- `src/app/api/recruiter/interviews/route.ts:216`
- `src/app/api/recruiter/interviews/route.ts:306`
- `src/app/api/recruiter/interviews/route.ts:324`
- Evidence:
- Interview update/read endpoints accept arbitrary IDs and candidate IDs without ownership checks.
- Impact:
- Any recruiter can read/modify interview statuses and feedback across tenants.
- Recommended fix:
- Persist owner/tenant ID on interview records and enforce it on every query/update.

### [P0] Cross-tenant IDOR + identity spoofing in recruiter pipeline API
- Files:
- `src/app/api/recruiter/pipeline/route.ts:65`
- `src/app/api/recruiter/pipeline/route.ts:150`
- `src/lib/services/recruiter/pipeline-service.ts:67`
- Evidence:
- `initialize` accepts caller-supplied `recruiterId`; `getPipeline` and mutation paths do not enforce owner checks.
- Impact:
- Recruiters can initialize pipelines for other users and read/mutate any pipeline by ID.
- Recommended fix:
- Ignore client-supplied recruiter ID for non-admins; enforce pipeline ownership on all service methods.

### [P1] Token expiration is persisted incorrectly (overwritten to current timestamp)
- File:
- `src/app/api/recruiters/approve-contact/route.ts:166`
- `src/app/api/recruiters/approve-contact/route.ts:176`
- `src/app/api/recruiters/approve-contact/route.ts:187`
- `src/app/api/recruiters/approve-contact/route.ts:210`
- Evidence:
- Token expiry is computed (`tokenExpiry`) but stored expiration fields use `serverTimestamp()`.
- Impact:
- Expiration metadata becomes wrong, causing broken token lifecycle and incorrect notifications/audit data.
- Recommended fix:
- Persist explicit expiry timestamp from `tokenExpiry` for token/request/notification records.

### [P1] IP allowlist bypass in token verification
- File:
- `src/app/api/recruiters/verify-token/route.ts:26`
- `src/app/api/recruiters/verify-token/route.ts:92`
- `src/app/api/recruiters/verify-token/route.ts:197`
- Evidence:
- Route trusts `ipAddress` supplied by query/body for allowlist checks.
- Impact:
- Client can self-assert an allowed IP and bypass network restriction.
- Recommended fix:
- Use trusted server-derived client IP only; never accept IP from request body/query for authorization.

### [P1] Token verification expiration parsing is incompatible with Firestore Timestamp
- File:
- `src/app/api/recruiters/verify-token/route.ts:103`
- `src/app/api/recruiters/verify-token/route.ts:110`
- Evidence:
- Expiration parser handles string/Date/number only; Firestore `Timestamp` falls through and is treated as invalid.
- Impact:
- Valid tokens can be rejected (`Token expiration missing`) depending on stored type.
- Recommended fix:
- Handle `Timestamp` explicitly via `toDate()`.

### [P1] Raw recruiter access token is stored in Firestore
- File:
- `src/app/api/recruiters/approve-contact/route.ts:151`
- Evidence:
- Full bearer token is stored alongside `tokenHash`.
- Impact:
- Read exposure of `accessTokens` yields immediately usable credentials.
- Recommended fix:
- Store hash + metadata only; never persist raw token.

### [P1] Raw security tokens are logged
- Files:
- `src/app/api/user-approval/approve/route.ts:63`
- `src/app/api/user-approval/decline/route.ts:47`
- `src/lib/services/authService.ts:65`
- Evidence:
- Token values are logged on error paths.
- Impact:
- Token replay risk via log exposure.
- Recommended fix:
- Log only irreversible hashes/fingerprints.

### [P1] Recruiter request-contact endpoint does not enforce recruiter role
- File:
- `src/app/api/recruiters/request-contact/route.ts:50`
- `src/app/api/recruiters/request-contact/route.ts:82`
- Evidence:
- Endpoint enforces `authUserId === recruiterId` but never verifies user role is recruiter/admin.
- Impact:
- Non-recruiter accounts can submit recruiter contact requests.
- Recommended fix:
- Add role verification before request creation.

### [P1] Legacy recruiter request endpoint writes incompatible schema to `recruiterRequests`
- Files:
- `src/app/api/recruiter/request-access/route.ts:108`
- `functions/src/emailFunctions.ts:629`
- `functions/src/emailFunctions.ts:644`
- Evidence:
- Legacy route writes `userId`/`fromRecruiterId`; functions and newer flows expect `toUserId` and `fromRecruiter.recruiterId`.
- Impact:
- Downstream email/approval automation can fail or silently skip notifications.
- Recommended fix:
- Normalize to one schema or deprecate/remove legacy route.

### [P2] Password reset tokens are stored and queried in plaintext
- Files:
- `src/app/api/auth/request-password-reset/route.ts:65`
- `src/app/api/auth/reset-password/route.ts:69`
- Evidence:
- Raw reset token is persisted and queried directly.
- Impact:
- Data exposure leaks valid reset credentials.
- Recommended fix:
- Store only token hash and compare against hash of presented token.

### [P2] Email verification tokens are stored/queryed in plaintext
- Files:
- `functions/src/emailFunctions.ts:44`
- `src/lib/services/authService.ts:30`
- Evidence:
- Verification token is stored as raw value and looked up directly.
- Impact:
- Data exposure leaks valid verification credentials.
- Recommended fix:
- Migrate to hash-based storage + verification.

### [P2] Notifications statistics endpoint allows global stats access and unbounded scans
- Files:
- `src/app/api/notifications/route.ts:145`
- `src/app/api/notifications/route.ts:303`
- `src/lib/notifications/repositories/firestoreRepository.ts:174`
- `src/lib/notifications/repositories/firestoreRepository.ts:182`
- Evidence:
- Authenticated caller can omit `userId` and receive global stats; repository performs unbounded query.
- Impact:
- Information leakage plus high read costs/latency under load.
- Recommended fix:
- Require `userId === authUserId` for non-admins and use aggregation/limited queries.

### [P2] Notification delivery-status lookup lacks ownership checks
- Files:
- `src/app/api/notifications/route.ts:148`
- `src/app/api/notifications/route.ts:316`
- Evidence:
- `get-delivery-status` returns status by `notificationId` without verifying ownership.
- Impact:
- Notification metadata can be queried by other users if IDs are known.
- Recommended fix:
- Resolve notification and enforce `recipientId === authUserId` before returning status.

### [P2] Recruiter access-status map performs unbounded collection-group reads
- File:
- `src/app/api/recruiter/search-resumes/access-status.ts:116`
- `src/app/api/recruiter/search-resumes/access-status.ts:160`
- Evidence:
- Collection-group queries for all recruiter access docs run without limits/pagination.
- Impact:
- Search latency and Firestore reads scale poorly with recruiter history size.
- Recommended fix:
- Add pagination/time bounds or materialized status index per recruiter.

### [P2] Resume indexing debounce can suppress real content updates
- File:
- `functions/src/indexResumeService.ts:147`
- `functions/src/indexResumeService.ts:175`
- Evidence:
- Debounce check runs before content-change check; edits inside debounce window are skipped.
- Impact:
- Embeddings can become stale until a later write occurs.
- Recommended fix:
- Check content-diff first, or schedule delayed reindex rather than hard skip.

### [P2] Monthly billing rollover is race-prone around boundary writes
- File:
- `functions/src/billingService.ts:36`
- `functions/src/billingService.ts:55`
- `functions/src/billingService.ts:76`
- Evidence:
- Archive/reset/aggregate phases are not transactionally isolated across month boundary.
- Impact:
- Boundary writes may be misattributed or lost.
- Recommended fix:
- Partition shard docs by billing month or enforce transactional rollover semantics.

### [P2] Recruiter request-contact checks only legacy collection (`resumeProfiles`)
- File:
- `src/app/api/recruiters/request-contact/route.ts:113`
- Evidence:
- Route validates candidate resume only in `resumeProfiles`; canonical creation path persists to `resumes`.
- Impact:
- Valid resumes can be incorrectly rejected.
- Recommended fix:
- Query canonical `resumes` first (or use dual lookup helper consistently).

### [P3] Middleware nonce/CSP path is internally inconsistent for page rendering
- Files:
- `src/middleware.ts:229`
- `src/middleware.ts:265`
- `src/app/layout.tsx:61`
- Evidence:
- Middleware returns early for non-API routes and safe methods, while layout expects nonce header.
- Impact:
- Nonce propagation/CSP behavior is inconsistent and difficult to reason about.
- Recommended fix:
- Align matcher/flow with actual nonce usage and pass request headers via supported Next middleware pattern.

## Testing Gaps
- No coverage detected for cross-tenant authorization controls in recruiter CRUD routes (`candidates`, `bulk-actions`, `interviews`, `pipeline`).
- Token verification tests do not cover Firestore `Timestamp` expiry format.
- Admin migration tests do not enforce admin-role requirement for `/api/admin/migrate-numeric-ids`.

## Suggested Remediation Order
1. Ship hotfixes for all `P0` issues first (admin migration authz + recruiter cross-tenant IDORs).
2. Patch token security (`P1`): expiry persistence, IP trust source, raw token storage/logging.
3. Resolve `P2` scalability/correctness issues (notifications global stats, access-status query bounds, resume profile collection mismatch, billing rollover and indexing debounce).
