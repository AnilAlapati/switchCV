# SwitchCV 360° Code Review

**Reviewer:** Claude Opus 4.5 (Preview)  
**Date:** November 28, 2025  
**Branch:** `feature/Nov_28_v1`  
**Repository:** AnilAlapati/switchCV

---

## Executive Summary

SwitchCV is a well-architected **privacy-first resume platform** built with Next.js 16, Firebase, and AI integrations (Gemini, Groq, OpenAI). The codebase demonstrates strong engineering practices with some areas for improvement.

| Category         | Rating   | Notes                           |
| ---------------- | -------- | ------------------------------- |
| **Architecture** | ⭐⭐⭐⭐ | Clean separation, good patterns |
| **Security**     | ⭐⭐⭐⭐ | Solid foundations, minor gaps   |
| **Code Quality** | ⭐⭐⭐⭐ | TypeScript strict, good linting |
| **Testing**      | ⭐⭐⭐   | Good unit tests, lacking E2E    |
| **Performance**  | ⭐⭐⭐⭐ | Caching, rate limiting in place |
| **DevOps**       | ⭐⭐⭐⭐ | Good scripts, needs CI/CD docs  |

---

## 1. 🏗️ Architecture

### ✅ Strengths

- **Clean Next.js App Router** structure with proper API routes
- **Separation of concerns**: hooks, services, components, types
- **Firebase Functions** well-organized with middleware pipeline
- **Provider pattern** (`AuthProvider`, `SWRProvider`, `ConnectivityStatusProvider`)
- **Circuit breaker + retry logic** for external AI services
- **Pluggable AI search providers** (Firestore vector vs legacy)

### ⚠️ Concerns

1. **Two resume collections** (`resumes` and `resumeProfiles`) - migration seems incomplete
2. **Dev mode bypass** could be dangerous if misconfigured:

```typescript
// functions/src/searchResumeService.ts
const isDevBypassEnabled = (): boolean => {
  return (
    process.env.FUNCTIONS_EMULATOR === "true" &&
    process.env.DEV_BYPASS_CHECKS === "true"
  );
};
```

### Key Files

| File                            | Purpose                         |
| ------------------------------- | ------------------------------- |
| `src/app/layout.tsx`            | Root layout with providers      |
| `src/lib/config.ts`             | Environment and dev mode config |
| `functions/src/index.ts`        | Cloud Functions entry point     |
| `functions/src/config/index.ts` | ConfigManager singleton         |

---

## 2. 🔐 Security

### ✅ Good Practices

- **Security headers** in `next.config.ts`:
  - HSTS with 2-year max-age
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Content-Security-Policy configured
- **Custom Claims** for role-based access in Firestore rules
- **Token verification with caching** (5-min TTL)
- **Rate limiting** with Firestore-backed persistence
- **Audit logging** for sensitive operations
- **PII redaction** in error reporter
- **Zod validation** for input schemas

### 🔴 Critical Issues

#### 2.1 CORS Too Permissive

**Location:** `functions/src/*.ts`

```typescript
// Current - allows ALL origins
const corsHandler = cors({ origin: true });
```

**Recommendation:**

```typescript
const corsHandler = cors({
  origin: ["https://switchcv.com", "https://app.switchcv.com"],
  credentials: true,
});
```

#### 2.2 Email Template Injection Risk

**Location:** `functions/src/emailFunctions.ts`

```typescript
// Current - direct interpolation
html = html.replace(regex, String(value || ""));
```

**Recommendation:** Escape HTML entities before interpolation:

```typescript
import { escape } from "html-escaper";
html = html.replace(regex, escape(String(value || "")));
```

#### 2.3 Rate Limit Fails Open

**Location:** `functions/src/middleware/rateLimiter.ts`

```typescript
catch (error) {
  // On error, allow request but log it
  return { allowed: true, remaining: this.config.maxRequests, ... };
}
```

**Recommendation:** Fail closed or implement in-memory fallback.

### 🟡 Medium Issues

| Issue                                         | Location                 | Recommendation                    |
| --------------------------------------------- | ------------------------ | --------------------------------- |
| `@typescript-eslint/no-explicit-any` disabled | `eslint.config.mjs`      | Gradually enable                  |
| API errors expose internal details            | Various API routes       | Use `handleApiError` consistently |
| No CSRF protection visible                    | State-changing endpoints | Add CSRF tokens                   |

---

## 3. 📝 Code Quality

### ✅ Strengths

- **Strict TypeScript** (`strict: true` in tsconfig.json)
- **ESLint** with custom rules:
  - Max file lines: 300 (600 for AI services)
  - `no-console` enforced (use logger)
  - `react-hooks/exhaustive-deps`: error
- **Structured logging** via Pino (`src/lib/logger.ts`)
- **Consistent API helpers** (`handleApiError`, `getAuthenticatedUserId`)
- **Type definitions** for all major entities (`src/types/index.ts`)

### ⚠️ Areas for Improvement

| Issue                   | Current State                  | Recommendation                 |
| ----------------------- | ------------------------------ | ------------------------------ |
| Many `any` types        | Firestore dynamic data         | Add proper types incrementally |
| Inconsistent validation | Some functions skip validation | Use Zod everywhere             |
| Large files             | Some exceed 300 lines          | Split into smaller modules     |

### Code Quality Tools in Place

```javascript
// eslint.config.mjs highlights
"max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
"no-console": "error",
"react-hooks/rules-of-hooks": "error",
"react-hooks/exhaustive-deps": "error",
```

---

## 4. 🧪 Testing

### ✅ Coverage Statistics

| Metric     | Coverage |
| ---------- | -------- |
| Statements | 79.21%   |
| Branches   | 62.94%   |
| Functions  | 90.47%   |
| Lines      | 79.13%   |

### Test Distribution

| Category               | Files   | Notes                  |
| ---------------------- | ------- | ---------------------- |
| Component Tests (.tsx) | 86      | UI components, hooks   |
| Unit Tests (.ts)       | 78      | Services, utilities    |
| Integration Tests      | 1       | Resume generation flow |
| **Total**              | **164** |                        |

### ✅ Well-Tested Areas

- `useAuth.tsx` - Comprehensive auth flow tests
- `useResume.tsx` - CRUD operations covered
- `quotaService.test.ts` - Quota management
- `aiGenerationService.test.ts` - AI integration

### 🔴 Critical Gaps

| Missing Tests                  | Risk Level | Impact                      |
| ------------------------------ | ---------- | --------------------------- |
| **Payment/Subscription flows** | 🔴 High    | Monetization at risk        |
| **End-to-end tests**           | 🔴 High    | User journey untested       |
| **Firestore security rules**   | 🟡 Medium  | Security validation missing |
| **Email sending**              | 🟡 Medium  | Communication reliability   |
| **Admin operations**           | 🟡 Medium  | Admin features untested     |

### Recommendations

```bash
# Add Playwright for E2E
npm install -D @playwright/test

# Add Firestore rules testing
npm install -D @firebase/rules-unit-testing
```

---

## 5. ⚡ Performance

### ✅ Implemented Optimizations

| Feature           | Implementation             | Location                         |
| ----------------- | -------------------------- | -------------------------------- |
| SWR caching       | Data fetching with cache   | `SWRProvider.tsx`                |
| Token cache       | 5-min TTL, 250 max entries | `functions/src/authFunctions.ts` |
| Firestore indexes | Composite indexes defined  | `firestore.indexes.json`         |
| Vector search     | Firestore `findNearest`    | `searchResumeService.ts`         |
| Scheduled cleanup | Stale data removal         | `functions/src/index.ts`         |

### ⚠️ Potential Issues

#### 5.1 Unbounded Query

**Location:** `functions/src/statsService.ts`

```typescript
const usersSnapshot = await admin.firestore().collection("users").get();
// Will timeout/OOM at scale
```

**Recommendation:** Use pagination or Cloud Tasks for batch processing.

#### 5.2 Token Cache Unbounded Growth

**Location:** `functions/src/authFunctions.ts`

```typescript
if (tokenCache.size > MAX_CACHE_ENTRIES) {
  // Only removes one entry - can grow to 251
}
```

**Recommendation:** Use LRU cache or batch cleanup.

---

## 6. 📦 Dependencies

### Current Stack

| Package          | Version | Status    |
| ---------------- | ------- | --------- |
| `next`           | 16.0.1  | ✅ Latest |
| `react`          | 19.2.0  | ✅ Latest |
| `firebase`       | 12.5.0  | ✅ Latest |
| `firebase-admin` | 13.6.0  | ✅ Latest |
| `zod`            | 4.1.13  | ✅ Latest |
| `pino`           | 10.1.0  | ✅ Latest |
| `swr`            | 2.3.6   | ✅ Latest |

### Missing Recommendations

| Tool                   | Purpose               | Recommendation             |
| ---------------------- | --------------------- | -------------------------- |
| Error Tracking         | Production monitoring | Add **Sentry**             |
| Product Analytics      | User behavior         | Add **PostHog**            |
| Scalable Rate Limiting | High traffic          | Consider **Upstash Redis** |

---

## 7. 🔧 DevOps & Operations

### ✅ Present

- Comprehensive npm scripts for dev modes
- Health check scripts (`scripts/check-repo-health.sh`)
- Deployment checklist (`docs/DEPLOYMENT_CHECKLIST.md`)
- Git aliases and commit helpers
- Firebase emulator support

### ⚠️ Missing

| Item                   | Priority  | Notes                         |
| ---------------------- | --------- | ----------------------------- |
| CI/CD pipeline         | 🔴 High   | No `.github/workflows/` found |
| Dockerfile             | 🟡 Medium | Containerization not set up   |
| Infrastructure as Code | 🟡 Medium | No Terraform/Pulumi           |
| Load testing           | 🟢 Low    | No k6/Artillery setup         |

---

## 8. 📚 Documentation

### ✅ Existing Documentation

| Document                  | Quality    | Notes                     |
| ------------------------- | ---------- | ------------------------- |
| `DEV_MODE_GUIDE.md`       | ⭐⭐⭐⭐⭐ | Excellent developer guide |
| `ARCHITECTURE_DIAGRAM.md` | ⭐⭐⭐⭐⭐ | Clear system diagrams     |
| `DEPLOYMENT_CHECKLIST.md` | ⭐⭐⭐⭐   | Step-by-step deployment   |
| Inline JSDoc              | ⭐⭐⭐⭐   | Good coverage in services |

### ⚠️ Missing Documentation

| Document                            | Priority  |
| ----------------------------------- | --------- |
| API documentation (OpenAPI/Swagger) | 🔴 High   |
| Database schema documentation       | 🟡 Medium |
| Runbook for incident response       | 🟡 Medium |
| Changelog/Release notes             | 🟢 Low    |

---

## 9. Firestore Security Rules Analysis

### ✅ Good Patterns

```javascript
// Custom Claims for role checks (optimized)
allow read: if request.auth.token.role == 'admin';

// Ownership verification
allow read: if request.auth.uid == resource.data.userId;

// Prevent bulk scraping
match /usernames/{usernameId} {
  allow list: if false;
}
```

### ⚠️ Concerns

| Rule                   | Issue                                         |
| ---------------------- | --------------------------------------------- |
| `system/{document=**}` | Completely blocked - relies on Admin SDK only |
| No rate limiting       | Firestore rules can't rate limit              |

---

## 10. Cloud Functions Analysis

### Exposed Functions

| Function                      | Type              | Authentication |
| ----------------------------- | ----------------- | -------------- |
| `generateResumeContent`       | HTTP              | Bearer Token   |
| `generateJobMatchSuggestions` | HTTP              | Bearer Token   |
| `searchResumesAI`             | Callable          | context.auth   |
| `getSearchQuota`              | Callable          | context.auth   |
| `onUserCreated`               | Auth Trigger      | N/A            |
| `onUserRoleChanged`           | Firestore Trigger | N/A            |
| `aggregateGlobalStats`        | Scheduled         | N/A            |
| `cleanupExpiredResumes`       | Scheduled         | N/A            |

### Security Measures

- ✅ Token verification with caching
- ✅ Role-based access control
- ✅ Rate limiting presets defined
- ✅ Custom claims synchronization
- ⚠️ CORS too permissive

---

## 🎯 Priority Action Items

### 🔴 Immediate (Security - Do This Week)

| #   | Action                                            | File(s)                                   |
| --- | ------------------------------------------------- | ----------------------------------------- |
| 1   | Restrict CORS origins to production domains       | `functions/src/*.ts`                      |
| 2   | Add HTML escaping to email templates              | `functions/src/emailFunctions.ts`         |
| 3   | Review rate limiter fail-open behavior            | `functions/src/middleware/rateLimiter.ts` |
| 4   | Add CSRF protection for state-changing operations | API routes                                |

### 🟡 Short-term (Quality - Next 2 Weeks)

| #   | Action                                     | Notes                          |
| --- | ------------------------------------------ | ------------------------------ |
| 5   | Add E2E tests with Playwright              | Critical user journeys         |
| 6   | Add Firestore security rules tests         | `@firebase/rules-unit-testing` |
| 7   | Fix unbounded queries in stats aggregation | Pagination/batching            |
| 8   | Add payment flow tests before launch       | Business critical              |

### 🟢 Long-term (Scalability - Next Month)

| #   | Action                                    | Notes                    |
| --- | ----------------------------------------- | ------------------------ |
| 9   | Add CI/CD pipeline                        | GitHub Actions           |
| 10  | Implement Sentry for error monitoring     | Production observability |
| 11  | Consider Redis for rate limiting at scale | Upstash Redis            |
| 12  | Add API documentation with OpenAPI        | Developer experience     |

---

## File Structure Overview

```
switchcv/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes (18 directories)
│   │   ├── auth/              # Auth pages
│   │   ├── dashboard/         # User dashboard
│   │   ├── recruiter/         # Recruiter features
│   │   └── resumes/           # Resume pages
│   ├── components/            # React components (15 directories)
│   ├── hooks/                 # Custom hooks (28 files)
│   ├── lib/                   # Utilities & services
│   │   ├── services/          # Business logic
│   │   ├── validations/       # Zod schemas
│   │   └── utils/             # Helpers
│   ├── types/                 # TypeScript types
│   └── __tests__/             # Test files (164 files)
├── functions/                 # Firebase Cloud Functions
│   └── src/
│       ├── config/            # Configuration management
│       ├── middleware/        # Rate limiting, auth
│       ├── services/          # Audit logging, monitoring
│       └── searchProviders/   # AI search implementations
├── docs/                      # Documentation
└── scripts/                   # Utility scripts
```

---

## Conclusion

SwitchCV demonstrates **solid engineering practices** for a startup-stage product:

- ✅ Modern tech stack (Next.js 16, React 19, Firebase)
- ✅ Good security foundations (auth, rules, rate limiting)
- ✅ Clean architecture with proper separation
- ✅ Comprehensive dev tooling

**Key risks to address before production scale:**

1. **CORS configuration** - Security vulnerability
2. **E2E testing** - Quality assurance gap
3. **Payment flow testing** - Business critical
4. **CI/CD automation** - Deployment reliability

The codebase is well-positioned for growth with the recommended improvements.

---

_Generated by Claude Opus 4.5 (Preview) on November 28, 2025_
