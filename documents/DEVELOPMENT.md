# SwitchCV — Implementation Plan, Technical Designs, HLD & LLD

Purpose: This document lays out a pragmatic implementation plan for SwitchCV (MVP → v1), high‑level architecture (HLD), low‑level design (LLD) for core components, data model, API surface, infra, security/PII flow, testing, monitoring, and a milestone roadmap.

## 1. Executive summary

SwitchCV is a privacy-first living resume platform where users create a structured, AI‑polished resume stored as a public/private URL (slug). Key differentiators for the MVP:

Living resume (structured, versioned)

Shareable unique URL (switchcv.com/slug)

Per-field PII masking and recruiter request/approval flow

LLM-powered guided Q&A + AI polish (cheap open model for MVP)

MVP goal: validate user demand and recruiter interest with a minimal, deployable product in ~4–6 weeks.

## 2. MVP feature list (scope)

Core user flows:

Sign up / Sign in (Firebase Auth)

Guided onboarding Q&A (structured fields) → save profile data

AI polish button: generate human‑friendly resume text from structured fields (Mistral 7B via HF/Replicate)

Publish page (slug) with per-field visibility: Public / Masked / Request-on-view

Public resume page (static cached page served via CDN)

Recruiter flow: view public page; if PII masked, click "Request Contact" → user approves → recruiter gets contact

Basic recruiter search by slug, skill, location (initially simple filtering / CSV upload match)

Analytics: view counts, request counts, last updated

Nice-to-have (post-MVP): LinkedIn/GitHub import, tailored resume generation for specific JD, recruiter subscription/search dashboard, domain mapping.

## 3. Tech stack (recommended for MVP)

Frontend: Next.js (React) deployed on Vercel — pages for onboarding, profile editor, public resume.

Backend: Firebase (Auth, Firestore, Cloud Functions). Cloud Functions handle LLM calls, workflow logic, and secure recruiter requests.

DB: Firestore (document model) + Storage for attachments/assets (user photos, PDFs).

LLM inference: Hugging Face Inference API (Mistral 7B) or Replicate for lower cost. Optionally route heavy polishing to OpenAI for paid users.

CDN: Vercel + static caching using ISR / edge caching for public pages.

Monitoring: Sentry (errors), Google Cloud Monitoring / Firebase Performance for infra metrics.

CI/CD: GitHub Actions for tests, lint, and deploy to Vercel & Firebase.

## 4. High-Level Architecture (HLD)

[ User Browser ]
|
|-- Next.js frontend (Vercel) -- public resume pages, editor UI
|
[ Firebase Auth ] [Firestore DB ] [Cloud Storage]
| |
|-- Cloud Functions (Node) ---------> Calls HF/Replicate LLM endpoints
|-> writes generated text, status
|-> triggers email/webhook to recruiter/user

[Hugging Face / Replicate] (LLM provider)

Admin/Recruiter UI (Next.js protected route) -> Cloud Functions -> Firestore

CDN & Cache (Vercel + CDN for public pages)

Key patterns:

All LLM calls run inside Cloud Functions (server-side) — API keys kept secret. Frontend calls functions only.

Generated resume HTML stored in Firestore + rendered/statically served to reduce re-runs.

PII masking handled at presentation layer and via field metadata & access control.

## 5. Data model (Firestore collections)

users/{userId}

uid: string

email: string

displayName

profileSlug: string (unique)

createdAt, updatedAt

settings: {publicProfile: boolean, defaultPIIVisibility}

profiles/{userId}/resume (single document or multiple versions)

versionId

title

summary

skills: [{name, level, visibility}] // visibility: public|masked|request

experience: [{company, role, startDate, endDate, description, visibility}]

education: [{... , visibility}]

contact: {email:{value, visibility}, phone:{value, visibility}}

projects: [{name, url, description, visibility}]

generatedText: {draft: string, polished: string, lastGeneratedAt}

slug: string

published: boolean

lastUpdatedAt

recruiterRequests/{requestId}

fromRecruiter: {name, org, email, recruiterId (optional)}

toUserId

requestedFields: [field paths]

status: requested|approved|denied|expired

createdAt, updatedAt

analytics/{slug}/views

counts, lastViewedAt, topReferrers

auditLogs/{docId}

action, actor, timestamp, meta

Notes:

Use Firestore security rules tightly scoped to user auth.

Keep PII encrypted at rest by default (Firestore + client/server encryption layers if needed).

## 6. API surface (Cloud Functions endpoints)

POST /api/generate_resume (auth required)

Input: userId (from auth), structured profile data or profileId, generationMode (draft|polish)

Server: assemble prompt, call LLM, store generated text, return result summary

Rate-limit per user

POST /api/publish_profile (auth)

Input: userId, slug

Server: validate slug uniqueness, set published=true, build static page (or set ISR cache)

GET /api/profile/:slug (public)

Return: public view with masked fields per visibility rules, render HTML or JSON

Rate-limit & CDN cache

POST /api/recruiter_request (public or auth)

Input: recruiter info, slug, requestedFields

Server: create recruiterRequest doc, notify user (email/push), set expiry

POST /api/handle_request/:requestId (auth required by profile owner)

Approve / Deny flow — updates recruiterRequests doc and if approved, reveal PII via secure link or temp token

GET /api/secure_contact/:token (auth optional / token-based)

Returns decrypted PII if token valid and not expired

Admin endpoints for search (protected)

POST /api/search -> accepts skill/location/slug query; returns limited matched profiles (only public/masked fields and recruiter contact request option)

Security: All endpoints validate Firebase Auth tokens and enforce Firestore rules.

## 7. PII masking & recruiter request flow (detailed)

Data model: each sensitive field (email, phone, address, or full description) includes visibility enum: public|masked|request.

Public page rendering: masked fields are replaced with placeholder (e.g., **_@_**.com or Request access). The public resume route (`/resume/[slug]`) now resolves as a Next.js server component that fetches the published Firestore document by slug, honors the visibility metadata, and uses ISR (revalidate 60s) to keep pages fast while still showing request-only notices where applicable.

Recruiter requests: recruiter clicks "Request Contact" and supplies reason + organization. A recruiterRequest doc is created with requestedFields and an expiry (e.g., 7 days).

User notification: user gets email + in-app notification with Approve / Deny buttons.

Approval result: if approved, Cloud Function generates a one-time secure token (JWT or random signed token stored in DB) that grants time-limited access to specific fields; recruiter uses that token to fetch real PII via GET /api/secure_contact/:token.

Audit: all approvals/requests logged in auditLogs for compliance.

Security considerations:

Limit number of requests per recruiter per day to reduce spam.

Rate-limit per slug + IP.

Email verification required for recruiter accounts for increased trust (optional paid feature).

## 8. HLD — Component responsibilities

Frontend (Next.js)

Onboarding & guided Q&A UI

Profile editor (structured forms with visibility toggles)

Public resume renderer (server-side rendered / ISR cached)

Recruiter portal UI (protected)

Backend (Firebase Cloud Functions)

LLM orchestration (prompt construction + response sanitization)

Slug uniqueness & publish pipeline

Recruiter request lifecycle + secure token issuance

Integration with HF/Replicate/OpenAI

Database (Firestore)

Store structured profile + visibility metadata + generated text and analytics

Storage (Cloud Storage)

Store media, CV attachments, and generated HTML snapshots if used

LLM provider

Host Mistral 7B via HF / Replicate for MVP; optionally OpenAI for premium polishing

## 9. LLD — Implementation details for core modules

### 9.1 Resume Generator Function (generate_resume)

Trigger: HTTP POST from frontend (auth enforced)

Steps:

Fetch structured data from Firestore (or accept updated payload)

Construct prompt template (see prompts section below)

Check cache (if polished text exists & not stale) → return

Call LLM endpoint (Hugging Face inference API) with maxTokens limit

Postprocess: sanitize output (no PII leakage, no hallucination in fields), split into sections

Store generatedText.polished, lastGeneratedAt, and increment generation metrics

Return summary to frontend

Retries & failure handling: exponential backoff for transient LLM errors; log failures in Sentry.

Prompt template (example):

You are an expert resume writer. Given the structured fields below, create a concise professional resume section-by-section. Preserve accuracy. Do not invent dates or employers. If information is missing, ask the user instead of fabricating.

{structured_fields_json}

Return JSON with keys: summary, experience[], skills[], education[], projects[]

### 9.2 Publish Pipeline (publish_profile)

Validate slug uniqueness (atomic check + Firestore transaction)

Generate HTML snapshot (server-side render using Next.js rendering API or use prerendered template)

Store snapshot in Storage or rely on Next.js ISR to serve

Mark profile as published

### 9.3 Recruiter Request Handler

Create request doc with TTL (7 days)

Send email (via SendGrid) w/ actionable Approve/Deny links (deep link to app with auth & requestId)

On approve: generate signed token; mark request as approved; send token to recruiter (or allow recruiter to fetch direct via portal)

Prompts (starter templates)

Draft prompt (cheap):

System: You are a concise resume writer.
User: {structured JSON}
Task: Produce a short resume text with Summary (2-3 lines), Experience bullets (for each job 3 bullets max), Skills (comma list), Projects (1-2 lines each). Do not invent facts. If a field is empty, leave it blank.

Polish prompt (higher quality):

System: You are an expert technical resume writer targeting {role} roles in {industry}.
User: Raw resume JSON + job description (optional)
Task: Rewrite summary and experience bullets to highlight metrics and outcomes. Use concise, action-oriented language. Return JSON.

## 10. Security & Compliance

Store minimal PII; per-field visibility controls.

Firestore security rules to restrict reads/writes by UID and role.

Use HTTPS everywhere; store LLM/API keys in GCP Secret Manager.

For GDPR: provide delete/export user data

## 11. Testing Strategy

### 11.1 Test Coverage Goals

- **Overall Coverage**: Target 80%+ across all metrics
- **Statements**: 80% minimum
- **Branches**: 70% minimum (complex conditional logic)
- **Functions**: 85% minimum (all exported functions)
- **Lines**: 80% minimum

### 11.2 Testing Stack

- **Framework**: Jest with React Testing Library
- **Coverage**: Istanbul/nyc for detailed reporting
- **Mocking**: Jest mocks for Firebase, external APIs
- **CI/CD**: GitHub Actions with coverage gates

### 11.3 Test Categories

#### Unit Tests

- Pure functions and utilities
- Custom hooks (useAuth, useAIResume, useResume)
- Firebase service functions
- Type definitions and validations

#### Component Tests

- Page components (auth, dashboard, onboarding, etc.)
- UI components with user interactions
- Form validation and error states
- Loading states and async operations

#### Integration Tests

- Authentication flows
- Resume creation and editing workflows
- AI feature integration
- Firebase data operations

### 11.4 Mocking Strategy

#### Firebase Services

```typescript
// Mock all Firebase modules
jest.mock("firebase/app");
jest.mock("firebase/auth");
jest.mock("firebase/firestore");
jest.mock("firebase/storage");
jest.mock("firebase/functions");

// Mock specific functions
const mockCollection = jest.fn();
const mockGetDocs = jest.fn();

jest.mock("firebase/firestore", () => ({
  collection: mockCollection,
  getDocs: mockGetDocs,
  // ... other functions
}));
```

#### Next.js Navigation

```typescript
const mockParams = { id: "test-id" };
jest.mock("next/navigation", () => ({
  useParams: () => mockParams,
}));
```

#### External APIs

```typescript
// Mock Hugging Face API calls
global.fetch = jest.fn();
```

### 11.5 Test File Organization

```
src/__tests__/
├── app/                    # Page component tests
│   ├── auth/
│   ├── dashboard/
│   ├── onboarding/
│   └── resume/[slug]/
├── components/             # Reusable component tests
├── hooks/                  # Custom hook tests
├── lib/                    # Utility and service tests
├── types/                  # Type validation tests
└── setup.test.ts          # Global test setup
```

### 11.6 Test Patterns

#### Component Testing

```typescript
import { render, screen, waitFor } from "@testing-library/react";

// Test loading states
it("shows loading initially", () => {
  render(<Component />);
  expect(screen.getByText("Loading...")).toBeInTheDocument();
});

// Test successful data fetching
it("displays data after loading", async () => {
  render(<Component />);
  await waitFor(() => {
    expect(screen.getByText("Data loaded")).toBeInTheDocument();
  });
});

// Test error states
it("handles errors gracefully", async () => {
  mockApi.mockRejectedValue(new Error("API Error"));
  render(<Component />);
  await waitFor(() => {
    expect(screen.getByText("Error occurred")).toBeInTheDocument();
  });
});
```

#### Hook Testing

```typescript
import { renderHook, waitFor } from "@testing-library/react";

it("returns loading state initially", () => {
  const { result } = renderHook(() => useCustomHook());
  expect(result.current.loading).toBe(true);
});

it("returns data on success", async () => {
  const { result } = renderHook(() => useCustomHook());
  await waitFor(() => {
    expect(result.current.data).toBeDefined();
  });
});
```

### 11.7 CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm ci
      - run: npm test -- --coverage --watchAll=false
      - uses: codecov/codecov-action@v3
```

### 11.8 Coverage Requirements

- **Minimum Thresholds**:

  - Statements: 80%
  - Branches: 70%
  - Functions: 85%
  - Lines: 80%

- **Coverage Exclusions**:
  - Generated files (build output)
  - Test utilities and mocks
  - Third-party libraries
  - Configuration files

### 11.9 Performance Testing

- Component render performance
- Bundle size analysis
- Lighthouse CI for performance metrics
- Memory leak detection in hooks
