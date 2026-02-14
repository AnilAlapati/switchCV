# Firebase Hosting SSR Bundle Size Analysis & Deployment Performance

**Date**: February 14, 2026  
**Issue**: Deployment takes 8-10 minutes for hosting (vs 2-3 min for functions)  
**Root cause**: Firebase's Next.js preview integration bundles entire `node_modules` into SSR function  
**Current size**: 126-130 MB compressed, 2.1 GB uncompressed

---

## Why Hosting Deploys Are Slow

### Architecture Overview

```
Developer Change
    ↓
npm run build (compiles Next.js locally)
    ↓
firebase deploy --only hosting
    ├─ Uploads static files (.next/static/)   [211 files]
    ├─ Uploads server code (.next/server/)    [SSR function source]
    └─ Triggers Cloud Functions auto-build
        ├─ npm install (fresh from package.json)  [~40 sec]
        ├─ npm run build (TypeScript compile)     [~30 sec]
        ├─ Package .firebase/*/functions/         [~60 sec]
        ├─ Upload to Cloud Storage bucket         [~60 sec]
        ├─ Trigger Cloud Build container         [~90 sec]
        ├─ Deploy Cloud Run instance (2nd Gen)   [~120 sec]
        └─ Wait for health checks & routing      [~60 sec]

Total Firebase Hosting deploy time: 8-10 minutes
```

### Why Cloud Functions Alone Are Fast

Deploying just `firebase deploy --only functions` is **2-3 minutes** because:

- Functions source is only **491 KB** (compressed)
- TypeScript compiles in < 1 second
- Direct Cloud Build deployment, no SSR container overhead

---

## Bundle Breakdown: What's Taking Up Space?

### Compressed Size vs Uncompressed

```
Deployed to Firebase (compressed):  126.4 MB  (.firebase/switchcv-dev/functions/)
Actually on disk (uncompressed):    2.1 GB

Breakdown by component:
  node_modules/                    1.3 GB (62%)
  .next/                           806 MB (38%)
  package.json, etc.                ~5 MB
```

### Top 20 Largest node_modules Packages

| Package                    | Size           | Why It's There                   | Needed?                          |
| -------------------------- | -------------- | -------------------------------- | -------------------------------- |
| `next`                     | 170 MB         | Next.js framework                | ✅ REQUIRED                      |
| `@next`                    | 128 MB         | Next.js internal plugins         | ✅ REQUIRED                      |
| `@firebase`                | 102 MB         | Firebase Admin SDK               | ⚠️ For server-side features      |
| `@swagger-api`             | 80 MB          | Swagger UI React                 | ❌ BLOAT - only for `/api/docs`  |
| `@sentry`                  | 63 MB          | Error monitoring                 | ⚠️ Needed for prod, not for dev  |
| `@opentelemetry`           | 52 MB          | Observability (Sentry → OpenTel) | ⚠️ Optional observability        |
| `lucide-react`             | 44 MB          | Icon library                     | ✅ Used in UI                    |
| `firebase`                 | 39 MB          | Firebase Client SDK              | ⚠️ Included unnecessarily in SSR |
| `date-fns`                 | 38 MB          | Date utilities                   | ✅ Used widely                   |
| `three`                    | 37 MB          | 3D graphics library              | ❌ BLOAT - for demo pages only   |
| `posthog-js`               | 31 MB          | Analytics client                 | ❌ BLOAT - client-side only      |
| `three-stdlib`             | 29 MB          | 3D library extensions            | ❌ BLOAT - for demo pages        |
| `stats-gl`                 | 29 MB          | WebGL stats renderer             | ❌ BLOAT - for demo pages        |
| `hls.js`                   | 24 MB          | Video streaming library          | ❌ BLOAT - not used              |
| `@swc`                     | 24 MB          | Rust-based compiler (SWC)        | ✅ REQUIRED for Next.js          |
| `typescript`               | 23 MB          | TypeScript compiler              | ✅ REQUIRED (build-time)         |
| `@google-cloud`            | 21 MB          | Google Cloud SDKs                | ⚠️ For Cloud Run runtime         |
| `@mediapipe`               | 19 MB          | AI/ML library                    | ❌ BLOAT - for demo only         |
| `core-js-pure` / `core-js` | 30 MB combined | Polyfills                        | ⚠️ Mostly unused                 |

### .next/ Breakdown (806 MB)

```
.next/
  ├─ server/                 ~450 MB [Next.js router + middleware compiled]
  ├─ static/                 ~200 MB [CSS, JS chunks for client]
  ├─ cache/                  ~100 MB [Next.js build cache]
  └─ other                   ~56 MB
```

---

## The Problem: Firebase's Next.js Preview Doesn't Tree-Shake Properly

### Why Client-Only Libraries End Up in SSR

When you import a component in a server route:

```typescript
// src/app/api/handler.ts
import { MyComponent } from "@/components/hero"; // ← Client component

// MyComponent.tsx imports:
import { Canvas } from "@react-three/fiber"; // ← 3D graphics
import { Navbar } from "swagger-ui-react"; // ← Swagger UI
import { PostHogPageView } from "posthog-js"; // ← Analytics
```

**Firebase's build process includes ALL of these** in the SSR bundle, even though they're never used server-side. The build doesn't know these are client-only.

**Expected behavior** (Vercel/Next.js on other platforms):

```
- Detect "use client" directive → tree-shake for SSR
- Only include actual server code in cloud function
- Result: ~20-30 MB SSR bundle
```

**Actual behavior** (Firebase preview):

```
- Bundle entire node_modules
- Result: 126-130 MB SSR function
```

---

## BLOAT Candidates for Removal

These packages can likely be removed or moved to dev dependencies:

| Package                                | Size  | Action                     | Impact       |
| -------------------------------------- | ----- | -------------------------- | ------------ |
| `swagger-ui-react`                     | 80 MB | Remove or lazy-load        | ~80 MB saved |
| `@react-three/fiber` + three ecosystem | 95 MB | Move to client-only bundle | ~95 MB saved |
| `posthog-js`                           | 31 MB | Dynamic import client-side | ~31 MB saved |
| `stats-gl`                             | 29 MB | Remove (dev demo only)     | ~29 MB saved |
| `@mediapipe`                           | 19 MB | Remove (prototype code)    | ~19 MB saved |

**Potential savings: ~254 MB → deploy time could drop to 5-6 minutes**

---

## Current Mitigation Strategies

### 1. Accept the 8-10 Minute Deploy Time (Interim)

**Pro**: No code changes needed, works today  
**Con**: Every deploy takes 2.5x longer than alternatives

### 2. Use Vercel Instead (Recommended for Production)

```bash
# Vercel's Next.js integration
npm install -g vercel
vercel --prod

# Typical deploy time: 2-3 minutes (vs 8-10 on Firebase)
# Reason: Vercel's platform optimizes Next.js bundling
```

### 3. Split Hosting & Functions (Medium Effort)

```
Option A: Keep UI on Firebase (slow), move APIs to API Gateway
Option B: Move everything to Cloud Run, use static bucket for .next/static/

Both require significant refactoring and are not recommended unless bundle grows further.
```

---

## Why We Can't Just Remove Three.js (Demo Pages)

The 3D libraries (`three`, `@react-three/fiber`, `three-stdlib`) are packaged because:

1. `/vibe-concepts/*` routes use 3D visualization demos
2. These routes are SSR'd (not static)
3. The build can't distinguish "demo route" from "production route"

**Solution paths**:

- ❌ Remove demo routes entirely → saves 95 MB but loses showcase
- ✅ Move demos to `/demo/*` and make client-only (use `'use client'` properly)
- ✅ Use dynamic imports to delay loading until client-side

---

## Version & Deployment Metadata

### Version Numbering

**Current**: `0.1.20` in `package.json`

```json
{
  "name": "switchcv",
  "version": "0.1.20",
  "private": true
}
```

This version does NOT auto-increment on deploy. It must be manually bumped before commits.

**Versioning strategy**:

- `0.1.x` = MVP/alpha release (current)
- `0.2.x` = First beta with feedback incorporation
- `1.0.0` = Production GA

**Current deployment includes version 0.1.20** in both dev and prod environments.

---

## Recommendations

### Short-term (Done ✅)

- [x] Document bundle analysis
- [x] Add this to LESSONS_LEARNED.md for team reference

### Medium-term (Next Sprint)

- [ ] Use dynamic imports for three.js libraries
- [ ] Mark demo components with `'use client'` directive properly
- [ ] Investigate if Firebase CLI or build can tree-shake better
- [ ] Consider Vercel migration if budget allows

### Long-term (GA Release)

- [ ] Measure if removing demo pages saves enough to justify removal
- [ ] Evaluate Cloud Run alternative if beyond 200 MB

---

## Monitoring Deploy Performance

Track these in CI/CD metrics:

```bash
# Add to deployment script
echo "Deploy start: $(date)"
firebase deploy --only hosting,functions
echo "Deploy end: $(date)"

# From logs, extract:
# - Bundle size (check .firebase/*/functions/ before upload)
# - Build time (SSR function build)
# - Deploy time (total)
```

---

## References

- [Firebase Hosting Framework Integration Docs](https://firebase.google.com/docs/hosting/frameworks/nextjs)
- [Next.js Bundle Analysis](https://nextjs.org/docs/app/building-your-application/optimizing/bundle-analyzer)
- [Vercel Next.js Deployment](https://vercel.com/docs/deployments/nextjs)
