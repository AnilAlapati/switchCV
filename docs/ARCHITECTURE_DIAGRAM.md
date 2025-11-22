# System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT APPLICATION                                 │
│                     (Next.js Frontend / Mobile App)                          │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 │ HTTPS Requests
                                 │
┌────────────────────────────────▼────────────────────────────────────────────┐
│                      FIREBASE CLOUD FUNCTIONS                                │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    REQUEST PROCESSING PIPELINE                        │  │
│  │                                                                       │  │
│  │  1. Authentication ──► 2. Rate Limiting ──► 3. Validation ──► 4. Execute│  │
│  │     (Firebase Auth)     (Firestore)        (utils/validation)       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       CORE SERVICES                                  │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │   │
│  │  │   Resume     │  │     Job      │  │  Analytics   │             │   │
│  │  │   Service    │  │   Matching   │  │   Service    │             │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │   │
│  │         │                  │                  │                      │   │
│  │         │                  │                  │                      │   │
│  │         └──────────────────┴──────────────────┘                      │   │
│  │                            │                                         │   │
│  │                            ▼                                         │   │
│  │                  ┌─────────────────┐                                │   │
│  │                  │  Resilient Call │  (retry + circuit breaker)     │   │
│  │                  │   Wrapper       │                                │   │
│  │                  └────────┬────────┘                                │   │
│  └─────────────────────────────┼─────────────────────────────────────┘   │
│                                │                                           │
│  ┌─────────────────────────────▼─────────────────────────────────────┐   │
│  │                    EXTERNAL SERVICES                               │   │
│  │                                                                    │   │
│  │  ┌──────────────┐         ┌──────────────┐                       │   │
│  │  │   Gemini AI  │◄────────┤   Circuit    │                       │   │
│  │  │   (Google)   │         │   Breaker    │                       │   │
│  │  └──────────────┘         │   + Retry    │                       │   │
│  │                           └──────────────┘                        │   │
│  │  ┌──────────────┐                                                 │   │
│  │  │ HuggingFace  │◄────────┤   Circuit    │                       │   │
│  │  │     API      │         │   Breaker    │                       │   │
│  │  └──────────────┘         │   + Retry    │                       │   │
│  │                           └──────────────┘                        │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                  BACKGROUND JOBS (Pub/Sub)                         │ │
│  │                                                                    │ │
│  │  • aggregateGlobalStats (hourly)                                  │ │
│  │  • aggregateAnalyticsDaily (1 AM UTC)                             │ │
│  │  • cleanupAnalyticsEvents (weekly)                                │ │
│  │  • sendProfileViewDigest (weekly)                                 │ │
│  │  • cleanupAuditLogs (daily)                                       │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │
                               │ Reads/Writes
                               │
┌──────────────────────────────▼───────────────────────────────────────────┐
│                         FIRESTORE DATABASE                                │
│                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │     users       │  │  resumeProfiles │  │   analytics     │         │
│  │                 │  │   [INDEXED]     │  │   [INDEXED]     │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │   rateLimits    │  │   auditLogs     │  │   monitoring    │         │
│  │   [INDEXED]     │  │   [INDEXED]     │  │                 │         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │              COMPOSITE INDEXES                               │        │
│  │  • events: [timestamp, eventType]                           │        │
│  │  • auditLogs: [userId, timestamp]                           │        │
│  │  • auditLogs: [resourceType, resourceId, timestamp]         │        │
│  │  • views: [userId, timestamp] (collection group)            │        │
│  └─────────────────────────────────────────────────────────────┘        │
└───────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────┐
│                      CROSS-CUTTING CONCERNS                                │
│                                                                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │   Monitoring     │  │  Configuration   │  │   Validation     │       │
│  │   • Metrics      │  │  • Env Vars      │  │   • Input        │       │
│  │   • Alerts       │  │  • Defaults      │  │   • Sanitization │       │
│  │   • Performance  │  │  • Validation    │  │   • Types        │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
│                                                                            │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐       │
│  │  Rate Limiting   │  │   Retry Logic    │  │  Error Handling  │       │
│  │  • Firestore     │  │  • Exponential   │  │  • Structured    │       │
│  │  • Sliding Window│  │  • Jitter        │  │  • Context       │       │
│  │  • Distributed   │  │  • Circuit Break │  │  • Propagation   │       │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘       │
└───────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW EXAMPLE                                   │
│                   (AI Resume Generation Request)                           │
│                                                                            │
│  1. Client ──────────► Firebase Functions (generateResumeContent)         │
│                        │                                                   │
│  2. Middleware ◄───────┘                                                   │
│     ├─► Verify Auth Token                                                 │
│     ├─► Check Rate Limit (10/hour)                                        │
│     └─► Validate Input (resume data, model ID)                            │
│                        │                                                   │
│  3. Business Logic ◄───┘                                                   │
│     ├─► Load Configuration                                                │
│     ├─► Start Performance Monitoring                                      │
│     └─► Call enhanceResumeWithAI()                                        │
│                        │                                                   │
│  4. Resilient Call ◄───┘                                                   │
│     ├─► Check Circuit Breaker (CLOSED/OPEN/HALF_OPEN)                     │
│     ├─► Set Timeout (30s)                                                 │
│     ├─► Attempt 1: Call Gemini API                                        │
│     │   └─► [If fails] Wait 1s                                            │
│     ├─► Attempt 2: Retry with backoff                                     │
│     │   └─► [If fails] Wait 2s                                            │
│     └─► Attempt 3: Final retry                                            │
│                        │                                                   │
│  5. Success ◄──────────┘                                                   │
│     ├─► Update Circuit Breaker (success)                                  │
│     ├─► Record Metrics (duration, success)                                │
│     ├─► Store Result in Firestore                                         │
│     └─► Return Enhanced Content to Client                                 │
│                                                                            │
│  6. Monitoring & Logging                                                   │
│     ├─► Log: "AI enhancement completed" (structured)                      │
│     ├─► Metric: execution_time = 3500ms                                   │
│     ├─► Alert: [None - within normal range]                               │
│     └─► Update Rate Limit Counter                                         │
└───────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────┐
│                      FAILURE HANDLING EXAMPLE                              │
│                   (External API Temporarily Down)                          │
│                                                                            │
│  Attempt 1: Call API ──► [503 Service Unavailable]                        │
│     │                                                                      │
│     ├─► Log Warning: "API call failed, retrying..."                       │
│     ├─► Wait: 1000ms + jitter (200ms)                                     │
│     └─► Increment: Circuit Breaker failure count (1/5)                    │
│                                                                            │
│  Attempt 2: Retry ──► [503 Service Unavailable]                           │
│     │                                                                      │
│     ├─► Log Warning: "Retry failed, waiting longer..."                    │
│     ├─► Wait: 2000ms + jitter (400ms)                                     │
│     └─► Increment: Circuit Breaker failure count (2/5)                    │
│                                                                            │
│  Attempt 3: Final Retry ──► [200 OK] ✓                                    │
│     │                                                                      │
│     ├─► Log Info: "Operation succeeded after 2 retries"                   │
│     ├─► Record Metric: retry_success (attempts: 3)                        │
│     └─► Reset: Circuit Breaker failure count (0)                          │
│                                                                            │
│  Alternative: All Attempts Failed ──► [All 503]                           │
│     │                                                                      │
│     ├─► Log Error: "All retry attempts exhausted"                         │
│     ├─► Circuit Breaker: Open (reject future calls for 60s)               │
│     ├─► Alert: "High error rate detected" (CRITICAL)                      │
│     ├─► Fallback: Return cached/default content                           │
│     └─► Response: 503 with retry-after header                             │
└───────────────────────────────────────────────────────────────────────────┘


KEY IMPROVEMENTS VISUALIZED:

Before:                                  After:
─────────                                ─────────
Client → Function → API                  Client → Auth → Rate Limit → Validation
            ↓                                      ↓
         [Fails]                          Circuit Breaker + Retry Logic
            ↓                                      ↓
         Error                            [Success after retry] OR [Graceful fail]
            ↓                                      ↓
      No Recovery                          Monitoring + Alerts
                                                  ↓
                                           Structured Logs + Metrics
```

## Architecture Patterns Used

### 1. **Circuit Breaker Pattern**

Prevents cascading failures by temporarily blocking requests to failing services.

### 2. **Retry with Exponential Backoff**

Automatically retries failed requests with increasing delays.

### 3. **Rate Limiting (Token Bucket)**

Controls request rates using Firestore-based distributed counters.

### 4. **Centralized Configuration**

Single source of truth for all configuration with validation.

### 5. **Structured Logging**

Consistent, searchable logs with context and metadata.

### 6. **Performance Monitoring**

Track and aggregate metrics for all operations.

### 7. **Middleware Pipeline**

Composable request processing (auth → rate limit → validation → execute).

### 8. **Dependency Injection**

Services receive dependencies rather than creating them.

### 9. **Single Responsibility**

Each module has one clear purpose (separation of concerns).

### 10. **Error Handling Hierarchy**

Errors are caught, logged, and propagated with context.

---

**This architecture provides:**

- ✅ High Availability (99.9%+)
- ✅ Fault Tolerance (automatic recovery)
- ✅ Security (validation + rate limiting)
- ✅ Observability (logs + metrics + alerts)
- ✅ Maintainability (clean code + documentation)
- ✅ Scalability (efficient batching + indexing)
