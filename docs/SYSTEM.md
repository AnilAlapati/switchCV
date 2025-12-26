# System Architecture & Technical Design

This document provides a comprehensive overview of the SwitchCV architecture, database schema, and core design decisions.

## 1. High-Level Architecture

```mermaid
graph TD
    Client[Client Application<br/>Next.js / Mobile] -->|HTTPS| LB[Load Balancer / CDN]
    LB --> Functions[Firebase Cloud Functions<br/>Serverless Compute]

    subgraph "Application Layer"
        Functions --> Auth[Auth Middleware]
        Auth --> RateLimit[Rate Limiter]
        RateLimit --> Router[Service Router]

        Router --> ResumeSvc[Resume Service]
        Router --> JobMatchSvc[Job Matching Service]
        Router --> RecruiterSvc[Recruiter Service]
        Router --> InterviewSvc[Interview Assistant]
        Router --> AnalyticsSvc[Analytics Service]
    end

    subgraph "AI Orchestration Layer"
        ResumeSvc & InterviewSvc --> AI_Gateway[AI Provider Gateway]
        AI_Gateway -->|Tier Check| TierLogic{User Tier?}

        TierLogic -->|Basic| Groq[Groq / Llama 3]
        TierLogic -->|Standard| Gemini[Gemini Flash / GPT-4o-mini]
        TierLogic -->|Premium| SOTA[GPT-4o / Claude 3.5]

        Groq -.->|Fallback| Gemini
        Gemini -.->|Fallback| SOTA
    end

    subgraph "Data Persistence Layer"
        ResumeSvc --> Firestore[(Firestore NoSQL)]
        JobMatchSvc --> VectorDB[(Vector Store)]
        RecruiterSvc --> Firestore
        AnalyticsSvc --> Firestore
    end
```

## 2. Document-Oriented Schema (Firestore)

### `users`
Stores user profile information and settings.
- `subscriptionTier`: "basic" | "premium" | "enterprise"
- `isRecruiter`: Role flag for access control.

### `resumes`
- `resumeId` (number): Numeric ID.
- `embedding` (array<number>): Vector embedding for AI semantic search.
- `profile`: Full resume content.

### `recruiterRequests`
Tracks contact requests from recruiters to candidates.
- `status`: "pending" | "approved" | "denied"

## 3. Design Decisions & Trade-offs

### Next.js 14 (Frontend)
- **SSR/RSC**: Chosen for SEO and performance (faster mobile loads).
- **Vercel**: Edge caching and seamless deployment.

### Firebase Cloud Functions (Backend)
- **Scale-to-Zero**: Cost optimization for variable traffic.
- **Maintenance-Free**: No infra management needed.

### AI Orchestration (Tiered Gateway)
- **Circuit Breaker**: Prevents system hangs on provider failure.
- **Strategy Pattern**: Easy model swapping (OpenAI vs Gemini vs Groq).

## 4. Operational Controls
Flags are managed in the `config/system` Firestore document, allowing instant toggles for:
- **Maintenance Mode**: Banner and blocking controls.
- **Auth**: Disabling registration/login during incidents.
- **Rate Limits**: Dynamic adjustment of AI and API thresholds.
