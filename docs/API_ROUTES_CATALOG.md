# SwitchCV API Routes Catalog

> **Generated:** 2026-02-13  
> **Total Routes:** 78  
> **Purpose:** Complete API route catalog for OpenAPI spec generation

---

## Table of Contents

1. [Admin Routes](#1-admin-routes) (7 routes)
2. [AI Routes](#2-ai-routes) (5 routes)
3. [Analytics Routes](#3-analytics-routes) (2 routes)
4. [Auth Routes](#4-auth-routes) (3 routes)
5. [Contact Routes](#5-contact-routes) (1 route)
6. [CSRF Token](#6-csrf-token) (1 route)
7. [Docs](#7-docs) (1 route)
8. [Drafts](#8-drafts) (1 route)
9. [Health](#9-health) (2 routes)
10. [Interview](#10-interview) (1 route)
11. [Jobseeker Routes](#11-jobseeker-routes) (3 routes)
12. [Notifications](#12-notifications) (1 route)
13. [Profiles Routes](#13-profiles-routes) (6 routes)
14. [Recruiter Routes](#14-recruiter-routes) (12 routes)
15. [Recruiters Routes](#15-recruiters-routes) (4 routes)
16. [Resume Routes](#16-resume-routes) (7 routes)
17. [Resumes Routes](#17-resumes-routes) (3 routes)
18. [Search Routes](#18-search-routes) (2 routes)
19. [Seed Routes](#19-seed-routes) (1 route)
20. [Skills](#20-skills) (1 route)
21. [System Config](#21-system-config) (1 route)
22. [Templates](#22-templates) (1 route)
23. [User Approval Routes](#23-user-approval-routes) (2 routes)
24. [User Routes](#24-user-routes) (5 routes)

---

## 1. Admin Routes

### `GET /api/admin/costs`
- **AUTH:** Yes (`getAuthenticatedUserId` + admin role check via Firebase Auth custom claims)
- **INPUT:** None
- **RESPONSE:** `{ costs: Array<{ month: string, lastAggregated: string | null, ...billingData }> }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Fetches last 12 months of aggregated billing/cost data from `system/billing/dashboard` collection. Admin only.

---

### `POST /api/admin/init-system`
- **AUTH:** Yes (`getAuthenticatedUserId` + admin role check)
- **INPUT:** None (empty body)
- **RESPONSE:** `{ success: boolean, message: string, status: string, counter: { currentId: number, message: string }, nextResumeId: number, firebaseLocation: string }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Initializes the system collection and numeric ID counter. One-time setup endpoint.

### `GET /api/admin/init-system`
- **AUTH:** Yes (`getAuthenticatedUserId` + admin role check)
- **INPUT:** None
- **RESPONSE:** `{ success: boolean, message: string, status: string, counter: { currentId: number, message: string }, nextResumeId: number, firebaseLocation: string }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Checks current system status and ID counter value.

---

### `POST /api/admin/migrate-numeric-ids`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `MigrateNumericIdsSchema`):**
  ```
  { userId?: string, migrateAll?: boolean }
  ```
- **RESPONSE:** `{ success: boolean, message: string, migratedCount: number, userId?: string }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Migrates resumes to use numeric IDs. Can migrate all or a specific user's resumes.

---

### `POST /api/admin/migrate-resume-ids`
- **AUTH:** Yes (`getAuthenticatedUserId` + admin role check)
- **INPUT:** None (empty body)
- **RESPONSE:** `{ message: string, totalResumes: number, migrated: number, mappings: Array<{ resumeId: number, documentId: string, userId: string, title: string }>, nextId: number }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Migrates existing published resumes to the new ID mapping system. One-time migration.

---

### `GET /api/admin/stats`
- **AUTH:** Yes (`getAuthenticatedUserId` + admin role check via `verifyAdminAccess`)
- **INPUT:** None
- **RESPONSE:** System stats object (shape defined by `getSystemStats()` service)
- **QUERY PARAMS:** None
- **DESCRIPTION:** Returns system-wide statistics for admin dashboard.

---

### `GET /api/admin/test-secrets`
- **AUTH:** Yes (`getAuthenticatedUserId` + admin role check)
- **INPUT:** None
- **RESPONSE:** `{ success: boolean, message: string, timestamp: string, results: { rotationStatus: TestResult, needingRotation: TestResult, secretAccess: TestResult, cacheTest: TestResult } }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Tests secret access and rotation status. Deployment verification endpoint.

---

### `GET /api/admin/user-approval`
- **AUTH:** Yes (`getAuthenticatedUserId` + admin role check via `isAdmin`)
- **INPUT:** None
- **RESPONSE:** `{ approvals: Array, totalPending: number }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Retrieves pending user approvals for admin review.

### `POST /api/admin/user-approval`
- **AUTH:** Yes (`getAuthenticatedUserId` + admin role check via `isAdmin`)
- **INPUT (Zod: `UserApprovalActionSchema`):**
  ```
  { approvalId: string, action: "approve" | "reject", reason?: string }
  ```
- **RESPONSE:** `{ success: boolean, action: string }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Approve or reject a user approval request.

---

## 2. AI Routes

### `POST /api/ai/generate`
- **AUTH:** Yes (`getAuthenticatedUserId` + App Check)
- **INPUT (Zod: `GenerateRequestSchema` — inline):**
  ```
  {
    prompt: string (1-2000 chars),
    maxTokens?: number (1-4000, default: 150),
    temperature?: number (0-2),
    task?: "creative" | "balanced" | "structured" | "precise" (default: "creative"),
    role?: "jobseeker" | "recruiter" (default: "jobseeker"),
    skipCache?: boolean (default: false)
  }
  ```
- **RESPONSE:** `{ text: string, model: string, cached?: boolean, similarity?: number }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** General-purpose AI text generation with semantic caching, rate limiting, billing tracking, and idempotency support.

---

### `OPTIONS /api/ai/generate-resume`
- **AUTH:** No (CORS preflight)
- **RESPONSE:** CORS headers

### `POST /api/ai/generate-resume`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (TypeScript interface `GenerateResumeRequest`):**
  ```
  {
    targetRole: string,
    experience: string,
    skills: string[],
    existingResume?: { summary, experience[], education[] },
    tone?: "professional" | "creative" | "concise",
    mode?: "standard" | "autonomous"
  }
  ```
- **RESPONSE:** AI-generated resume data (JSON parsed from AI response)
- **QUERY PARAMS:** None
- **DESCRIPTION:** AI-powered resume generation with rate limiting and budget checks.

---

### `GET /api/ai/models`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** `{ tier: string, models: Array }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Returns available AI models based on user's subscription tier.

---

### `GET /api/ai/refresh-models`
- **AUTH:** Yes (`getAuthenticatedUserId` + admin role check)
- **INPUT:** None
- **RESPONSE:** `{ success: boolean, timestamp: string, total: number, compatible: number, models: Array<{ name: string, displayName: string, methods: string[] }>, message: string }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Admin endpoint to force-refresh AI model cache. Returns latest Gemini models.

---

### `GET /api/ai/status`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** `{ connected: boolean }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Checks AI provider availability. Returns only connection status, no model details.

---

## 3. Analytics Routes

### `POST /api/analytics/dashboard`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `DashboardAnalyticsRequestSchema`):**
  ```
  { resumeId: string, userId?: string }
  ```
- **RESPONSE:** `{ success: boolean, data: DashboardAnalytics, timestamp: Date }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Get full analytics dashboard data for a resume.

### `GET /api/analytics/dashboard`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `DashboardAnalyticsQuerySchema` — from query params):**
- **RESPONSE:** `{ success: boolean, data: { resumeId, userId, viewCount, uniqueViewCount, downloadCount, shareCount, attractivenessScore, lastViewedAt, createdAt, updatedAt }, timestamp: Date }`
- **QUERY PARAMS:** `resumeId` (required), `userId` (optional)
- **DESCRIPTION:** Get analytics summary for a resume via query params.

---

### `GET /api/analytics/system`
- **AUTH:** Yes (`getAuthenticatedUserId` — admin/recruiter role enforced by service)
- **INPUT:** None
- **RESPONSE:** System analytics object (shape from `getSystemAnalytics()` — includes `totalUsers` and more)
- **QUERY PARAMS:** None
- **DESCRIPTION:** System-wide analytics. Restricted to admins and recruiters.

---

## 4. Auth Routes

### `POST /api/auth/request-password-reset`
- **AUTH:** No (public, rate-limited)
- **INPUT (Zod: `RequestPasswordResetSchema`):**
  ```
  { email: string (valid email, max 254 chars) }
  ```
- **RESPONSE:** `{ success: boolean, message: "If an account exists, a password reset email has been sent." }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Sends password reset email. Always returns success for security (doesn't reveal if email exists).

---

### `POST /api/auth/reset-password`
- **AUTH:** No (public, token-based, rate-limited)
- **INPUT (Zod: `ResetPasswordSchema`):**
  ```
  { token: string, newPassword: string (8+ chars, lowercase, uppercase, digit) }
  ```
- **RESPONSE:** `{ success: boolean, message: "Password has been reset successfully" }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Completes password reset using a one-time token.

---

### `GET /api/auth/verify`
- **AUTH:** No (public, token-based)
- **INPUT:** None
- **RESPONSE:** Redirects (HTML redirect to `/auth?verificationSuccess=true` or error page)
- **QUERY PARAMS:** `token` (required)
- **DESCRIPTION:** Email verification endpoint. Redirects based on verification result.

---

## 5. Contact Routes

### `POST /api/contact/feedback`
- **AUTH:** Optional (`maybeGetAuthenticatedUserId` — tries to identify user but doesn't require auth)
- **INPUT (parsed via `safeParseBody`):**
  ```
  { ...SupportFeedbackPayload, _formTime?: number }
  ```
- **RESPONSE:** `{ success: boolean, referenceId: string, message: string, simulated?: boolean }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Submit support/feedback. Rate-limited by IP. Bot protection via form fill time check.

---

## 6. CSRF Token

### `GET /api/csrf-token`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** `{ csrfToken: string }` (also sets cookie)
- **QUERY PARAMS:** None
- **DESCRIPTION:** Returns a CSRF token for authenticated users.

---

## 7. Docs

### `GET /api/docs`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** OpenAPI/Swagger spec JSON
- **QUERY PARAMS:** None
- **DESCRIPTION:** Returns the auto-generated API documentation spec.

---

## 8. Drafts

### `GET /api/drafts/[draftId]`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** Draft object (ResumeProfile shape)
- **QUERY PARAMS:** None
- **PATH PARAMS:** `draftId` (required)
- **DESCRIPTION:** Get a specific draft by ID. Owner only.

### `PATCH /api/drafts/[draftId]`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `DraftPatchRequestSchema` — dynamic via `getDraftProfileUpdateSchema()`):**
  ```
  Partial<ResumeProfile> (dynamic schema)
  ```
- **RESPONSE:** Updated draft object
- **QUERY PARAMS:** None
- **PATH PARAMS:** `draftId` (required)
- **DESCRIPTION:** Update a draft. Owner only. Rate-limited.

### `DELETE /api/drafts/[draftId]`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** `{ success: boolean }`
- **QUERY PARAMS:** None
- **PATH PARAMS:** `draftId` (required)
- **DESCRIPTION:** Delete a draft. Owner only.

---

## 9. Health

### `GET /api/health`
- **AUTH:** No (public)
- **INPUT:** None
- **RESPONSE:**
  ```
  {
    status: "ok" | "degraded",
    timestamp: string,
    services: {
      firestore: { status: "ok" | "error", latencyMs?: number },
      ai: { status: "ok" | "error", latencyMs?: number },
      email: { status: "ok" | "error", latencyMs?: number }
    }
  }
  ```
- **QUERY PARAMS:** None
- **DESCRIPTION:** Basic health check. Tests Firestore, Gemini AI, and SMTP connectivity.

---

### `GET /api/health/infra`
- **AUTH:** No (public)
- **INPUT:** None
- **RESPONSE:**
  ```
  {
    status: "healthy" | "degraded" | "unhealthy",
    timestamp: string,
    environment: string,
    checks: Array<{ name: string, status: string, message: string }>,
    durationMs: number
  }
  ```
- **QUERY PARAMS:** None
- **DESCRIPTION:** Infrastructure health check. Tests resume ID counter, system collections, billing config.

---

## 10. Interview

### `POST /api/interview/assistant`
- **AUTH:** Optional (`getAuthenticatedUserId` — catches errors, falls back to body userId)
- **INPUT (Zod: `InterviewAssistantActionSchema` — discriminated union):**
  - **start-session:**
    ```
    { action: "start-session", userId?: string, jobTitle: string, jobDescription?: string, companyName?: string, numberOfQuestions?: number (1-20) }
    ```
  - **submit-answer:**
    ```
    { action: "submit-answer", sessionId: string, questionIndex: number, answer: string, duration?: number }
    ```
  - **complete-session:**
    ```
    { action: "complete-session", sessionId: string }
    ```
- **RESPONSE:**
  - start-session: Interview session object (201)
  - submit-answer: `{ success: boolean, feedback: string, duration?: number }`
  - complete-session: `{ success: boolean, message: string }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Multi-action interview assistant. Starts sessions, submits answers, completes sessions.

### `GET /api/interview/assistant`
- **AUTH:** No (public)
- **INPUT:** None
- **RESPONSE:** Interview tips object
- **QUERY PARAMS:** `action` (must be "tips"), `jobTitle` (optional)
- **DESCRIPTION:** Get interview tips for a job title.

---

## 11. Jobseeker Routes

### `GET /api/jobseeker/access-requests`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** `{ requests: Array<{ id, resumeId, resumeTitle, timestamp, approvedAt?, expiresAt?, ...requestData }> }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Get all access requests across all of the authenticated user's resumes.

---

### `GET /api/jobseeker/metrics`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** `{ profileViews: number, contactRequests: number, downloads: number, quality: number, lastUpdated: string | null }`
- **QUERY PARAMS:** `userId` (required — must match authenticated user, BOLA protection)
- **DESCRIPTION:** Get jobseeker metrics. Users can only access their own metrics.

---

### `GET /api/jobseeker/profile`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** Profile object (Firestore document data)
- **QUERY PARAMS:** None
- **DESCRIPTION:** Fetch authenticated jobseeker's profile.

### `POST /api/jobseeker/profile`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `JobseekerProfileUpdateSchema` — `z.record(z.string(), z.unknown())`):**
  ```
  { [key: string]: unknown } (arbitrary profile fields)
  ```
- **RESPONSE:** `{ success: boolean, profile: object }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Update jobseeker profile. Merges with existing data.

---

## 12. Notifications

### `POST /api/notifications`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `notificationRequestSchema`):**
  ```
  {
    action: "send" | "mark-read" | "mark-all-read" | "delete" | "get-preferences" | "update-preference" | "get-delivery-status",
    userId: string,
    data?: { [key: string]: unknown }
  }
  ```
- **RESPONSE (varies by action):**
  - send: `{ success, notification, deliveryResults }`
  - mark-read: `{ success: boolean }`
  - mark-all-read: `{ success, markedCount }`
  - delete: `{ success: boolean }`
  - get-preferences: `{ success, preferences }`
  - update-preference: `{ success, preference }`
  - get-delivery-status: `{ success, status }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Multi-action notification management endpoint.

### `GET /api/notifications`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE (varies by action):**
  - get-notifications: `{ success, notifications, count }`
  - get-unread: `{ success, notifications, count }`
  - get-statistics: `{ success, statistics }`
  - get-delivery-status: `{ success, status }`
- **QUERY PARAMS:** `action` (required: "get-notifications" | "get-unread" | "get-statistics" | "get-delivery-status"), `userId` (optional), `notificationId` (optional)
- **DESCRIPTION:** Read-only notification queries.

---

## 13. Profiles Routes

### `GET /api/profiles/analytics`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `GetProfileAnalyticsQuerySchema` — from query params):**
- **RESPONSE:** `{ views, uniqueViewers, recentViews, accessRequests, approvalRate, popularSections, viewsByDay, viewsBySource }`
- **QUERY PARAMS:** `resumeId` (required)
- **DESCRIPTION:** Get analytics data for a profile/resume.

### `POST /api/profiles/analytics`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `TrackProfileAnalyticsSchema`):**
  ```
  {
    resumeId: string,
    userId?: string,
    eventType: "view" | "request" | "approval" | "click" | "share" | "download",
    metadata?: {
      viewedBy?: string, viewerName?: string,
      source?: "search" | "direct" | "link" | "recruiter" | "other",
      referrer?: string, sessionDuration?: number,
      downloadFormat?: "pdf" | "docx" | "json"
    }
  }
  ```
- **RESPONSE:** Analytics result object
- **QUERY PARAMS:** None
- **DESCRIPTION:** Track a profile analytics event.

---

### `POST /api/profiles/approve-access`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `ApproveProfileAccessSchema`):**
  ```
  {
    requestId: string,
    resumeId: string | number,
    duration: "1hour" | "1day" | "1week" | "forever"
  }
  ```
- **RESPONSE:** `{ success: boolean, message: string, ... }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Approve a profile access request.

---

### `GET /api/profiles/check-access`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** Access check result object
- **QUERY PARAMS:** `resumeId` (required)
- **DESCRIPTION:** Check if current user has access to a specific resume/profile.

---

### `POST /api/profiles/request-access`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `RequestProfileAccessSchema`):**
  ```
  {
    resumeId: string | number,
    message?: string (max 2000),
    duration: { preset: "1_hour" | "1_day" | "1_week" | "1_month" | "custom_days", customDays?: number (1-365) },
    timezone?: string
  }
  ```
- **RESPONSE:** `{ success: boolean, requestId: string, ... }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Request access to view a profile.

---

### `POST /api/profiles/respond-access`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `RespondProfileAccessSchema`):**
  ```
  {
    requestId: string,
    resumeId: string | number,
    action: "approve" | "deny",
    grantDuration?: { preset, customDays? },
    timezone?: string
  }
  ```
- **RESPONSE:** `{ success: boolean }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Respond to a profile access request (approve or deny).

---

### `OPTIONS /api/profiles/search`
- **AUTH:** No (CORS preflight)

### `POST /api/profiles/search`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `SearchProfilesSchema`):**
  ```
  {
    query?: string (max 500),
    filters?: {
      role?: string, location?: string,
      skills?: string[] (max 10), slug?: string
    },
    limit?: number (1-50, default: 20),
    offset?: number (min: 0, default: 0),
    cursor?: string
  }
  ```
  *Either `query` or `filters` required.*
- **RESPONSE:** `{ results: Array, total: number, query: string, hasMore: boolean, ... }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Search public profiles with text query and/or filters. Supports pagination.

---

## 14. Recruiter Routes

### `POST /api/recruiter/agent/analyze`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `AgentAnalyzeSchema`):**
  ```
  {
    candidate: { name?, title?, skills?[], bio?, experience?, education?, resumeText?, summary?, ...extra },
    job: { title: string, description?, requirements?[], location?, company?, salary?, ...extra }
  }
  ```
- **RESPONSE:** `{ analysis: object }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** AI-powered candidate-job match analysis.

---

### `POST /api/recruiter/agent/enhance-job`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `AgentEnhanceJobSchema`):**
  ```
  { job: { title: string, description?, requirements?[], location?, company?, salary?, ...extra } }
  ```
- **RESPONSE:** Enhanced job result object
- **QUERY PARAMS:** None
- **DESCRIPTION:** AI-powered job description enhancement.

---

### `POST /api/recruiter/agent/interview-prep`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `AgentInterviewPrepSchema`):**
  ```
  {
    candidate: CandidateSchema,
    job: JobSchema,
    interviewType?: "general" | "technical" | "behavioral" | "cultural" (default: "general")
  }
  ```
- **RESPONSE:** Interview prep result object
- **QUERY PARAMS:** None
- **DESCRIPTION:** AI-generated interview preparation materials.

---

### `POST /api/recruiter/agent/outreach`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `OutreachRequestSchema` — inline):**
  ```
  {
    candidate: CandidateSchema,
    job: JobSchema,
    recruiter?: { recruiterName?: string, companyName?: string }
  }
  ```
- **RESPONSE:** `{ message: string }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** AI-generated outreach message for a candidate.

---

### `POST /api/recruiter/agent/pipeline-suggest`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `AgentPipelineSuggestSchema`):**
  ```
  {
    candidate: CandidateSchema,
    currentStage: string,
    interactionHistory?: string
  }
  ```
- **RESPONSE:** Pipeline suggestion result object
- **QUERY PARAMS:** None
- **DESCRIPTION:** AI-powered pipeline stage suggestions for a candidate.

---

### `POST /api/recruiter/agent/screen`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `AgentScreenSchema`):**
  ```
  {
    candidate: CandidateSchema,
    criteria: {
      mustHave: string[] (min 1),
      niceToHave?: string[],
      dealBreakers?: string[],
      experienceYears?: number,
      location?: string,
      ...extra
    }
  }
  ```
- **RESPONSE:** Screening result object
- **QUERY PARAMS:** None
- **DESCRIPTION:** AI-powered candidate screening against criteria.

---

### `POST /api/recruiter/bulk-actions`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `RecruiterBulkActionSchema` — discriminated union):**
  - **create:**
    ```
    { action: "create", actionType: "move-stage" | "update-priority" | "send-email" | "schedule-interview" | "reject" | "add-note", candidateIds: string[] (1-200), metadata?: Record }
    ```
  - **execute:**
    ```
    { action: "execute", bulkActionId: string }
    ```
  - **cancel:**
    ```
    { action: "cancel", bulkActionId: string }
    ```
- **RESPONSE:** Bulk action result with action details
- **QUERY PARAMS:** None
- **DESCRIPTION:** Create, execute, or cancel bulk actions on candidates.

### `GET /api/recruiter/bulk-actions`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** `{ bulkActions: Array, total: number }`
- **QUERY PARAMS:** `id` (optional — get specific), `status` (optional — filter by status)
- **DESCRIPTION:** List bulk actions. Optionally filter by ID or status.

---

### `POST /api/recruiter/candidates`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `RecruiterCandidatesActionSchema` — discriminated union):**
  - **create:**
    ```
    { action: "create", name: string, email: string, position: string, phone?: string, resumeUrl?: string, source?: string }
    ```
  - **update-priority:**
    ```
    { action: "update-priority", candidateId: string, priority: "low" | "medium" | "high" | "critical" }
    ```
  - **add-note:**
    ```
    { action: "add-note", candidateId: string, userId?: string, content: string (max 5000), category?: "general" | "technical" | "cultural-fit" | "feedback" | "follow-up", isPrivate?: boolean }
    ```
- **RESPONSE:** Candidate action result
- **QUERY PARAMS:** None
- **DESCRIPTION:** Manage recruiter candidates (create, update priority, add notes).

### `GET /api/recruiter/candidates`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** `{ candidates: Array, total: number }` or single candidate
- **QUERY PARAMS:** `id` (optional — get specific candidate)
- **DESCRIPTION:** List all candidates or get a specific one.

---

### `GET /api/recruiter/debug-resumes`
- **AUTH:** Yes (`getAuthenticatedUserId` + admin role check)
- **INPUT:** None
- **RESPONSE:** `{ resumes: Array<{ resumeId, title, userId, userName, published, ... }>, total: number }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Debug endpoint listing published resumes with user info. Admin only.

---

### `POST /api/recruiter/interviews`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `RecruiterInterviewsActionSchema` — discriminated union):**
  - **schedule:**
    ```
    { action: "schedule", candidateId: string, jobId: string, type: "phone" | "video" | "in-person" | "coding" | "panel", scheduledTime: string, duration?: number (1-720, default: 60), interviewers: string[], location?: string, notes?: string }
    ```
  - **update-status:**
    ```
    { action: "update-status", interviewId: string, status: "scheduled" | "completed" | "cancelled" | "no-show" | "rescheduled" }
    ```
  - **add-feedback:**
    ```
    { action: "add-feedback", interviewId: string, feedback: Record<string, unknown> }
    ```
  - **get-upcoming:**
    ```
    { action: "get-upcoming", days?: number (1-365) }
    ```
- **RESPONSE:** Interview action result
- **QUERY PARAMS:** None
- **DESCRIPTION:** Manage recruiter interviews (schedule, update status, add feedback, get upcoming).

### `GET /api/recruiter/interviews`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** Single interview or list of interviews
- **QUERY PARAMS:** `id` (optional — get specific), `candidateId` (optional — filter by candidate)
- **DESCRIPTION:** Retrieve interviews, optionally filtered.

---

### `POST /api/recruiter/jd-search`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `JDSearchRequestSchema` — inline):**
  ```
  {
    jdText: string (50-10000 chars),
    limit?: number (1-100, default: 50),
    useAI?: boolean (default: true)
  }
  ```
- **RESPONSE:** `{ success: boolean, results: Array, parsedJD: object, generatedQuery: string, searchType: string, fromCache: boolean, searchTimeMs: number, totalScanned: number }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Search candidates by job description text. AI-intensive, rate-limited to 5/hour.

---

### `GET /api/recruiter/metrics`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** `{ totalSearches: number, totalProfileViews: number, accessRequests: { pending, approved, denied }, totalCandidatesInteracted: number, lastActivityAt: string | null, searchBreakdown: object }`
- **QUERY PARAMS:** `userId` (required — self-access or admin)
- **DESCRIPTION:** Get recruiter metrics. Requires recruiter or admin role.

---

### `POST /api/recruiter/pipeline`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `RecruiterPipelineActionSchema` — discriminated union):**
  - **initialize:**
    ```
    { action: "initialize", jobId: string, jobTitle: string, recruiterId?: string }
    ```
  - **add-candidate:**
    ```
    { action: "add-candidate", pipelineId: string, name: string, email: string, position: string, phone?: string, resumeUrl?: string }
    ```
  - **move-candidate:**
    ```
    { action: "move-candidate", pipelineId: string, candidateId: string, newStage: "lead" | "screened" | "shortlisted" | "interviewed" | "offered" | "hired" | "rejected" | "on-hold" }
    ```
  - **get-stage:**
    ```
    { action: "get-stage", pipelineId: string, stage: PipelineStageEnum }
    ```
- **RESPONSE:** Pipeline action result
- **QUERY PARAMS:** None
- **DESCRIPTION:** Manage recruiting pipelines (initialize, add/move candidates, get stage).

### `GET /api/recruiter/pipeline`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** `{ pipelines: Array, total: number }`
- **QUERY PARAMS:** `id` (optional — get specific pipeline)
- **DESCRIPTION:** List pipelines or get specific one.

---

### `POST /api/recruiter/request-access`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `RequestRecruiterAccessSchema`):**
  ```
  { resumeId: string | number, requestedFields?: string[] }
  ```
- **RESPONSE:** `{ success: boolean, requestId: string, ... }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Request access to a jobseeker's resume/profile.

---

### `GET /api/recruiter/requests`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** `{ requests: Array }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Get all recruiter's outgoing requests.

### `POST /api/recruiter/requests`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** 405 Method Not Allowed (placeholder)
- **QUERY PARAMS:** None
- **DESCRIPTION:** Placeholder for future recruiter-specific POST actions.

### `DELETE /api/recruiter/requests`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `DeleteRecruiterRequestQuerySchema` — from query params):**
- **RESPONSE:** Result object
- **QUERY PARAMS:** `requestId` (required), `resumeId` (required)
- **DESCRIPTION:** Delete a recruiter request.

---

### `POST /api/recruiter/search-resumes`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `searchResumesSchema`):**
  ```
  { recruiterId: string, userId?: string, skills?: string[], location?: string }
  ```
- **RESPONSE:** `{ results: Array, total: number, ... }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Search resumes with filters (skills, location).

---

### `GET /api/recruiter/search`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** Search result object (from `RecruiterService.searchCandidates`)
- **QUERY PARAMS:** `q` (required — search query text)
- **DESCRIPTION:** Text-based candidate search for recruiters.

---

## 15. Recruiters Routes

### `POST /api/recruiters/approve-contact`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `ApproveRecruiterContactSchema`):**
  ```
  {
    requestId: string,
    duration?: "1hour" | "1day" | "1week" | "30days",
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string
  }
  ```
- **RESPONSE:** `{ success: boolean, message: string, ... }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Approve a recruiter's contact information request.

---

### `POST /api/recruiters/deny-contact`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `DenyRecruiterContactSchema`):**
  ```
  { requestId: string, reason: string (max 5000), adminUserId: string }
  ```
- **RESPONSE:** `{ success: boolean, message: string, ... }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Deny a recruiter's contact information request.

---

### `POST /api/recruiters/request-contact`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `RequestRecruiterContactSchema`):**
  ```
  {
    recruiterId: string,
    recruiterName?: string,
    recruiterEmail?: string (email),
    companyName?: string,
    userId: string,
    resumeId: string | number,
    requestedFields: string[] (1-4 items),
    purpose?: string (max 2000),
    proposedDuration?: "1hour" | "1day" | "1week" | "30days",
    ipAddress?: string,
    userAgent?: string
  }
  ```
- **RESPONSE:** `{ success: boolean, requestId: string, ... }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Recruiter requests contact info for a jobseeker.

### `GET /api/recruiters/request-contact`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `GetRecruiterContactRequestsQuerySchema` — from query params):**
- **RESPONSE:** `{ requests: Array, total: number }`
- **QUERY PARAMS:** `recruiterId` (required)
- **DESCRIPTION:** Get recruiter's contact requests.

---

### `GET /api/recruiters/verify-token`
- **AUTH:** No (token-based)
- **INPUT (Zod: `VerifyRecruiterTokenSchema` — from query params):**
- **RESPONSE:** `{ valid: boolean, ...tokenData }`
- **QUERY PARAMS:** `token` (optional), `tokenId` (optional), `recruiterId` (optional), `ipAddress` (optional). At least `token` or `tokenId` required.
- **DESCRIPTION:** Verify a recruiter access token via query params.

### `POST /api/recruiters/verify-token`
- **AUTH:** No (token-based)
- **INPUT (Zod: `VerifyRecruiterTokenSchema`):**
  ```
  { token?: string, tokenId?: string, recruiterId?: string, ipAddress?: string }
  ```
- **RESPONSE:** Delegates to GET handler internally
- **QUERY PARAMS:** None
- **DESCRIPTION:** Verify a recruiter access token via POST body.

---

## 16. Resume Routes

### `POST /api/resume/compare`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `CompareResumesSchema`):**
  ```
  {
    resume1: { id: string, title: string, skills: string[], experience: unknown[], education: unknown[], ...extra },
    resume2: { id: string, title: string, skills: string[], experience: unknown[], education: unknown[], ...extra }
  }
  ```
- **RESPONSE:** Comparison result object
- **QUERY PARAMS:** None
- **DESCRIPTION:** Compare two resumes side by side.

---

### `POST /api/resume/create`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `createResumeSchema`):**
  ```
  {
    title?: string (max 200, default: "Untitled Resume"),
    summary?: string (max 5000),
    skills?: Array<{ name: string, level?: string, visibility?: "public" | "masked" | "request" }>,
    experience?: Array<{ company, role, startDate, endDate?, description, visibility? }>,
    education?: Array<{ institution, degree, startDate, endDate?, description?, visibility? }>,
    contact?: { email: { value, visibility }, phone?: { value, visibility } },
    personalInfo?: { name?, title?, email?, phone?, location?, linkedin?, github? },
    projects?: Array<{ name, url?, description, visibility? }>,
    templateId?: string
  }
  ```
- **RESPONSE:** Result object from resume creation
- **QUERY PARAMS:** None
- **DESCRIPTION:** Create a new resume with full content.

---

### `POST /api/resume/delete`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `DeleteResumeSchema`):**
  ```
  { resumeId: string | number }
  ```
- **RESPONSE:** `{ success: boolean, numericId: number }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Delete a resume by ID. Supports both numeric and document IDs.

---

### `POST /api/resume/enhance`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `enhanceResumeRequestSchema`):**
  ```
  {
    resume: { id, title, summary?, skills[], experience[], education[], certifications?[], languages?[], contact },
    jobDescription?: string
  }
  ```
- **RESPONSE:** Enhancement result object
- **QUERY PARAMS:** None
- **DESCRIPTION:** AI-enhanced resume improvement suggestions, optionally tailored to a job description.

---

### `POST /api/resume/generate`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `GenerateResumeRequestSchema`):**
  ```
  {
    message: string,
    conversationHistory?: Array<{ id?, content: string, isUser: boolean, timestamp? }>,
    sessionData?: Record<string, unknown>,
    modelId?: string,
    async?: boolean
  }
  ```
- **RESPONSE:** Generated resume data or async job reference
- **QUERY PARAMS:** None
- **DESCRIPTION:** Conversational AI resume generation. Supports async mode.

---

### `GET /api/resume/generate/status/[jobId]`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** `{ jobId: string, status: string, progress: number, result?: object, error?: string }`
- **PATH PARAMS:** `jobId` (required)
- **QUERY PARAMS:** None
- **DESCRIPTION:** Poll async resume generation job status.

---

### `POST /api/resume/map-id`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `MapResumeIdSchema`):**
  ```
  { resumeId: string | number, documentId: string }
  ```
- **RESPONSE:** Mapping result object
- **QUERY PARAMS:** None
- **DESCRIPTION:** Map a numeric resume ID to a Firestore document ID.

---

## 17. Resumes Routes

### `GET /api/resumes/[id]`
- **AUTH:** Optional (`maybeGetAuthenticatedUserId` — public access with rate limits for unauthenticated)
- **INPUT:** None
- **RESPONSE:** Resume object with `viewerAccess: { scope: "owner" | "admin-view" | "full" | "public_snapshot", isOwner: boolean, isMasked?: boolean }` and `isBeingEdited: boolean`
- **PATH PARAMS:** `id` (required — numeric or document ID)
- **QUERY PARAMS:** None
- **DESCRIPTION:** Get a resume by ID. Access level determined by authentication and ownership. Rate-limited, scraping-protected.

### `PATCH /api/resumes/[id]`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:**
  ```
  { isPublic: boolean }
  ```
- **RESPONSE:** `{ success: boolean, isPublic: boolean }`
- **PATH PARAMS:** `id` (required)
- **QUERY PARAMS:** None
- **DESCRIPTION:** Toggle resume visibility (public/private). Owner only.

### `PUT /api/resumes/[id]`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: inline `updateSchema`):**
  ```
  {
    resume: {
      title: string, summary?: string,
      experience?: Array<{ id?, company, role, startDate, endDate?, description, visibility? }>,
      education?: Array<{ id?, institution, degree, startDate, endDate?, description?, visibility? }>,
      skills?: Array<{ id?, name, level?, visibility? }>,
      projects?: Array<{ id?, name, url?, description, visibility? }>,
      contact?: { email: { value, visibility }, phone?: { value, visibility } },
      personalInfo?: { name?, title?, location?, linkedin?, github? }
    }
  }
  ```
- **RESPONSE:** `{ success: boolean, resume: object }`
- **PATH PARAMS:** `id` (required)
- **QUERY PARAMS:** None
- **DESCRIPTION:** Full resume update. Owner only. Requires Premium+ tier.

### `DELETE /api/resumes/[id]`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** `{ success: boolean, message: "Resume deleted successfully" }`
- **PATH PARAMS:** `id` (required)
- **QUERY PARAMS:** None
- **DESCRIPTION:** Delete a resume. Owner only.

---

### `GET /api/resumes/[id]/chat`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT:** None
- **RESPONSE:** `{ messages: Array, sessionId: string }`
- **PATH PARAMS:** `id` (required)
- **QUERY PARAMS:** None
- **DESCRIPTION:** Get chat history for a resume.

### `POST /api/resumes/[id]/chat`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `ResumeChatRequestSchema`):**
  ```
  {
    message: string,
    conversationHistory?: Array<{ id?, content: string, isUser: boolean, timestamp? }>,
    sessionData?: Record<string, unknown>
  }
  ```
- **RESPONSE:** `{ response: string, ... }`
- **PATH PARAMS:** `id` (required)
- **QUERY PARAMS:** None
- **DESCRIPTION:** Chat with AI about a specific resume. Conversational interface.

---

### `POST /api/resumes/create`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `CreateResumeSchema`):**
  ```
  { userId: string, resume: Record<string, unknown>, isPublic?: boolean }
  ```
- **RESPONSE:** `{ success: boolean, resumeId: string, numericId: number, publicUrl: string, expiresAt: string | null, deletionScheduledAt: string | null, countdownStartsAt: string | null }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Create a new resume with numeric ID generation, tier-based quotas, and expiration logic.

---

## 18. Search Routes

### `POST /api/search/ai`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `AiSearchRequestSchema`):**
  ```
  { query: string (min 10 chars), limit?: number (1-50) }
  ```
- **RESPONSE:** `{ results: Array<{ resumeId, userId, score, title, skills[], matchReason? }>, totalResults: number, quotaRemaining: number, quotaLimit: number }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** AI-powered resume search via Cloud Function. Rate-limited and quota-enforced.

---

### `POST /api/search/semantic`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `SemanticSearchSchema` — inline):**
  ```
  { query: string (3-500 chars, trimmed) }
  ```
- **RESPONSE:** `{ results: Array, count: number }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Semantic/vector search for resumes. Includes prompt injection detection and sanitization.

---

## 19. Seed Routes

### `POST /api/seed/generate`
- **AUTH:** Yes (`getAuthenticatedUserId` + App Check)
- **INPUT (Zod: `SeedGenerateRequestSchema` — inline):**
  ```
  { profession: string (1-100 chars, letters/spaces/hyphens only, prompt injection checked) }
  ```
- **RESPONSE:** AI-generated or template-based resume data (with quota headers)
- **QUERY PARAMS:** None
- **DESCRIPTION:** Generate seed resumes for testing/demo. Template-based for basic tier, AI-powered for premium+. Quota-enforced.

---

## 20. Skills

### `POST /api/skills`
- **AUTH:** Optional (`getAuthenticatedUserId` — catches errors)
- **INPUT (Zod: `SkillsActionSchema` — discriminated union):**
  - **create-inventory:**
    ```
    { action: "create-inventory", userId?: string }
    ```
  - **add-skill:**
    ```
    { action: "add-skill", inventory: unknown, name: string, category: string, proficiencyLevel: string, yearsOfExperience?: number, description?: string }
    ```
  - **analyze-gap:**
    ```
    { action: "analyze-gap", inventory: unknown, jobPosting: unknown }
    ```
  - **compare-jobs:**
    ```
    { action: "compare-jobs", inventory: unknown, jobs: unknown[] }
    ```
- **RESPONSE (varies):**
  - create-inventory: Inventory object (201)
  - add-skill: Updated inventory (200)
  - analyze-gap: Gap analysis report (200)
  - compare-jobs: Job comparisons array (200)
- **QUERY PARAMS:** None
- **DESCRIPTION:** Multi-action skills management — inventory creation, skill addition, gap analysis, job fit comparison.

---

## 21. System Config

### `GET /api/system-config`
- **AUTH:** No (public)
- **INPUT:** None
- **RESPONSE:** `{ config: SystemConfig, fetchedAt: string }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Get public system configuration. Cached (5 min). Falls back to defaults if Firestore doc missing.

---

## 22. Templates

### `GET /api/templates`
- **AUTH:** No (public, rate-limited by IP)
- **INPUT:** None
- **RESPONSE:** `{ success: boolean, templates: Array, count: number }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Get all available resume templates.

---

## 23. User Approval Routes

### `GET /api/user-approval/approve`
- **AUTH:** No (public, token-based, rate-limited)
- **INPUT:** None
- **RESPONSE:** HTML page (success or error)
- **QUERY PARAMS:** `token` (required — one-time approval token)
- **DESCRIPTION:** Public endpoint for approving user registrations via email link token. Returns HTML.

---

### `GET /api/user-approval/decline`
- **AUTH:** No (public, token-based)
- **INPUT:** None
- **RESPONSE:** HTML page (success or error)
- **QUERY PARAMS:** `token` (required — one-time decline token)
- **DESCRIPTION:** Public endpoint for declining user registrations via email link token. Returns HTML.

---

## 24. User Routes

### `GET /api/user/profile`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `UserProfileQuerySchema` — from query params):**
- **RESPONSE:** Full user profile object
- **QUERY PARAMS:** `userId` (required — must match authenticated user)
- **DESCRIPTION:** Get user profile. Self-access only.

### `POST /api/user/profile`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `CreateUserProfileSchema`):**
  ```
  { uid: string, email: string, ...extra }
  ```
- **RESPONSE:** `{ success: boolean, message: string, data: object }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Create a new user profile. Self-creation only.

### `PUT /api/user/profile`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `UpdateUserProfileSchema`):**
  ```
  { uid: string, ...extra }
  ```
- **RESPONSE:** `{ success: boolean, message: string, data: object }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Update user profile. Self-update only.

---

### `POST /api/user/role`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `UserRoleSchema`):**
  ```
  { role: "jobseeker" | "recruiter" }
  ```
- **RESPONSE:** `{ success: boolean, role: string }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Set user role. Updates via `setUserRole` service.

---

### `GET /api/user/settings`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `UserSettingsQuerySchema` — from query params):**
- **RESPONSE:** `{ isRecruiter: boolean, displayName: string, companyName: string, notifications: object, privacy: object, updatedAt: string }`
- **QUERY PARAMS:** `userId` (required — must match authenticated user)
- **DESCRIPTION:** Get user settings. Self-access only.

### `PUT /api/user/settings`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `UserSettingsUpdateSchema`):**
  ```
  {
    userId: string,
    isRecruiter?: boolean,
    companyName?: string | null,
    displayName?: string | null,
    notifications?: Record<string, unknown>,
    privacy?: Record<string, unknown>
  }
  ```
- **RESPONSE:** `{ success: boolean, message: "Settings updated successfully" }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** Update user settings. Self-update only. Also updates Firebase Auth custom claims if role changes.

---

### `POST /api/user/update-role`
- **AUTH:** Yes (`getAuthenticatedUserId`)
- **INPUT (Zod: `updateRoleSchema` — inline):**
  ```
  { uid: string, newRole: "jobseeker" | "recruiter", companyName?: string }
  ```
- **RESPONSE:** `{ success: boolean, message: string, data: { uid, role, isRecruiter, updatedAt, roleUpdatedAt } }`
- **QUERY PARAMS:** None
- **DESCRIPTION:** **Primary role change endpoint.** Updates Firestore AND Firebase Auth custom claims. Self-update only.

---

### `GET /api/user/username/check`
- **AUTH:** No (public, rate-limited by IP)
- **INPUT (Zod: `UsernameSchema` — inline string validation):**
- **RESPONSE:** `{ available: boolean, reason?: string, suggestion?: string, username?: string, retryAfter?: number }`
- **QUERY PARAMS:** `username` (required)
- **DESCRIPTION:** Check username availability. Public, rate-limited (10/min per IP). Returns suggestions for taken usernames.

---

## Summary Statistics

| Category | Routes | Auth Required | Public |
|----------|--------|---------------|--------|
| Admin | 7 (10 methods) | All | 0 |
| AI | 5 (6 methods) | All | 0 |
| Analytics | 2 (3 methods) | All | 0 |
| Auth | 3 | 0 | All 3 |
| Contact | 1 | Optional | 1 |
| CSRF | 1 | Yes | 0 |
| Docs | 1 | Yes | 0 |
| Drafts | 1 (3 methods) | All | 0 |
| Health | 2 | 0 | All 2 |
| Interview | 1 (2 methods) | Optional/No | Mixed |
| Jobseeker | 3 (4 methods) | All | 0 |
| Notifications | 1 (2 methods) | All | 0 |
| Profiles | 6 (8 methods) | All | 0 |
| Recruiter | 12 (19 methods) | All | 0 |
| Recruiters | 4 (6 methods) | Mixed | 2 |
| Resume | 7 (7 methods) | All | 0 |
| Resumes | 3 (7 methods) | Mixed | 1 (GET public) |
| Search | 2 | All | 0 |
| Seed | 1 | Yes | 0 |
| Skills | 1 | Optional | 0 |
| System Config | 1 | No | 1 |
| Templates | 1 | No | 1 |
| User Approval | 2 | No | 2 (token-based) |
| User | 5 (8 methods) | Mixed | 1 |
| **TOTAL** | **78 routes** | | |

### Public (No Auth) Endpoints:
1. `GET /api/health`
2. `GET /api/health/infra`
3. `GET /api/system-config`
4. `GET /api/templates`
5. `POST /api/auth/request-password-reset`
6. `POST /api/auth/reset-password`
7. `GET /api/auth/verify`
8. `GET /api/user-approval/approve`
9. `GET /api/user-approval/decline`
10. `GET /api/user/username/check`
11. `GET /api/recruiters/verify-token`
12. `POST /api/recruiters/verify-token`
13. `GET /api/interview/assistant` (tips only)
14. `POST /api/contact/feedback` (auth optional)
