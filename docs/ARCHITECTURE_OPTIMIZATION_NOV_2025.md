# Architecture Optimization & Cost Analysis (Nov 2025)

## Executive Summary

This document outlines the architectural shift from a purely static export to a Hybrid Firebase Web Frameworks approach. This change was made to support dynamic features (AI generation, Analytics) while maintaining the cost and performance benefits of static hosting where possible.

## 1. Architecture Evolution

### Previous Design: Static Export (`output: 'export'`)

- **Concept:** Next.js generates HTML files for every page at build time.
- **Pros:**
  - Extremely cheap (hosting static files is negligible).
  - Fastest possible Time-to-First-Byte (TTFB) via CDN.
- **Cons (The "Bad"):**
  - **Broken Features:** API Routes (`/api/*`) do not work. They require a server.
  - **No Dynamic Logic:** Features like "Generate AI Resume" or "Real-time Analytics" would fail or require a separate backend.
  - **Build Time:** As the site grows to thousands of resumes, build times increase linearly.

### New Design: Firebase Web Frameworks (Hybrid)

- **Concept:** Firebase automatically detects Next.js. It serves static pages from the CDN and deploys API routes as Cloud Functions.
- **Pros (The "Improved"):**
  - **Best of Both Worlds:** Static pages (Landing, Dashboard UI) are still cached on CDN. Dynamic APIs (`/api/ai/generate`) run on-demand.
  - **Serverless Scalability:** No servers to manage. Handles 1 user or 1 million users automatically.
  - **Unified Deployment:** `firebase deploy` handles everything (Hosting + Functions).

## 2. Cost Analysis & Optimization

### How We Save Money

1.  **Scale to Zero:**
    - Cloud Functions only run when triggered. If no one uses the AI features at 3 AM, you pay $0.00 for compute.
    - _Contrast:_ A traditional EC2 instance or VPS costs money 24/7, even when idle.
2.  **Edge Caching:**
    - Static assets (JS, CSS, Images) are served from the Edge. This reduces the load on Cloud Functions, keeping compute costs low.
3.  **Region Selection:**
    - Services are deployed to `us-central1` (Iowa), which is typically one of the lowest-cost regions for Google Cloud.

### Potential Cost Drivers (Risks)

- **Function Invocations:** Every time an API is hit, it counts as an invocation.
  - _Mitigation:_ We implemented aggressive caching headers for read-heavy endpoints.
- **Cold Starts:**
  - First request might be slow (1-2s).
  - _Mitigation:_ Minimized function dependencies to keep boot time fast.

## 3. Scalability Strategy ("1 to 1 Million")

| Component    | Strategy                                                                  |
| :----------- | :------------------------------------------------------------------------ |
| **Frontend** | **Global CDN:** Automatically replicates content to servers worldwide.    |
| **Backend**  | **Cloud Functions:** Auto-scales instances based on concurrent requests.  |
| **Database** | **Firestore:** No-SQL database designed for massive horizontal scaling.   |
| **Assets**   | **Cloud Storage:** Petabyte-scale object storage for user resumes/images. |

## 4. Deployment Checklist (Post-Optimization)

- [x] Update `firebase.json` to use `source: "."`.
- [x] Remove `output: 'export'` from `next.config.ts`.
- [x] Update `firebase-functions` SDK to latest version.
- [ ] Set Production Secrets (`GEMINI_API_KEY`, `HUGGINGFACE_TOKEN`).
