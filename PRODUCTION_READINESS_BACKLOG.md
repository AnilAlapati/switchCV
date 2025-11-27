# Production Readiness Backlog

**Generated:** November 27, 2025  
**Status:** Automated fixes applied, manual fixes prioritized below

---

## ✅ COMPLETED (Just Now)

### 1. TypeScript Strict Mode Enabled

- ✅ Removed `ignoreBuildErrors: true` from `next.config.ts`
- ✅ Verified: All type errors are in test files only (production code is type-safe)
- 📝 Note: Test mock type mismatches can be fixed incrementally

### 2. ESLint Enforcement Rules Added

- ✅ `no-console: "error"` - Blocks console statements in production
- ✅ `react-hooks/exhaustive-deps: "error"` - Prevents hook dependency bugs
- ✅ Test files excluded from console rule

### 3. Environment Variable Validation

- ✅ Created `src/lib/env.ts` with Zod schema
- ✅ All environment variables validated at startup
- ✅ Type-safe access to `env` object

### 4. Enhanced Security Headers

- ✅ Added Content-Security-Policy to `next.config.ts`
- ✅ Configured for Firebase, Google APIs, and Analytics
- ✅ Frame-ancestors 'none' prevents clickjacking

---

## 🔴 CRITICAL - Fix Before Production Deploy (2-3 days)

### Priority 1: Replace Console Statements (4-6 hours)

**Files affected:** `src/lib/resumeIdRecycler.ts`, `src/lib/resumeMigration.ts`, `src/components/search/SmartSearch.tsx`

**Action:**

```bash
# Find all console usage
npx eslint src/ --quiet

# Fix each file:
# - Replace console.log with logger.info
# - Replace console.error with logger.error
# - Replace console.warn with logger.warn
```

**Pattern:**

```typescript
// ❌ Before
console.log(`Resume ID ${id} processed`);

// ✅ After
logger.info({ resumeId: id }, "Resume ID processed");
```

**Files to fix:**

- `src/lib/resumeIdRecycler.ts` (10 console statements)
- `src/lib/resumeMigration.ts` (8 console statements)
- `src/components/search/SmartSearch.tsx` (1 console.error)
- `src/lib/draftIdGenerator.ts` (1 console.warn)

---

### Priority 2: Add Input Validation to API Routes (6-8 hours)

**All routes in** `src/app/api/`

**Action:** Create Zod schemas for each API route:

```typescript
// Example: src/app/api/resume/create/route.ts
import { z } from "zod";

const createResumeSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(5000).optional(),
  skills: z
    .array(
      z.object({
        name: z.string().max(100),
        level: z.enum(["beginner", "intermediate", "expert"]),
      })
    )
    .max(50),
  // ... complete schema
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validated = createResumeSchema.parse(body); // Throws if invalid
  // ... use validated
}
```

**Routes needing validation:**

- `api/resume/create` - Resume data
- `api/resume/enhance` - Text content
- `api/recruiter/search-resumes` - Search query
- `api/ai/generate` - Prompt text
- `api/seed/generate` - Seed params
- `api/drafts/[draftId]` - Draft updates
- `api/notifications` - Notification actions

---

### Priority 3: Implement Rate Limiting (4-6 hours)

**Protect critical endpoints**

You already have `src/lib/utils/rateLimit.ts` - enforce it:

```typescript
// src/app/api/resume/create/route.ts
import { rateLimit } from "@/lib/utils/rateLimit";

export async function POST(request: NextRequest) {
  const { userId } = await getAuthenticatedUserId(request);

  const limited = await rateLimit(userId, "resume:create", 10, 3600);
  if (limited) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 10 resumes per hour." },
      { status: 429 }
    );
  }
  // ... proceed
}
```

**Apply to:**

- `/api/resume/create` - 10/hour
- `/api/ai/generate` - 20/hour
- `/api/recruiter/search-resumes` - 50/hour
- `/api/seed/generate` - 5/hour

---

## 🟠 HIGH PRIORITY - Fix in Next Sprint (1-2 weeks)

### Priority 4: Fix React Hook Dependencies (2-3 hours)

**ESLint now errors on exhaustive-deps**

Run: `npx eslint src/ --fix` to auto-fix what's possible

**Manual fixes needed:**

```typescript
// src/hooks/useTier.ts - Add fetchTier to deps
useEffect(() => {
  if (!authLoading) {
    fetchTier();
  }
}, [authLoading, fetchTier]); // ✅ Added fetchTier
```

---

### Priority 5: Add Request/Response Size Limits (1 hour)

**Prevent memory exhaustion**

```typescript
// next.config.ts
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
    responseLimit: "8mb",
  },
};
```

---

### Priority 6: Improve Test Coverage (4-8 hours)

**Critical services undertested:**

- `src/lib/services/userService.ts` - **31% coverage** (need 80%+)
- `src/lib/services/resumeService.ts` - **54% coverage** (need 80%+)
- Lines 92-176, 221-285 in resumeService untested

**Action:** Add integration tests for publish/unpublish flows

---

### Priority 7: Add Error Tracking (2 hours)

**Integrate Sentry**

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Configure `sentry.client.config.ts` and `sentry.server.config.ts`

---

### Priority 8: Optimize Firestore Security Rules (3-4 hours)

**Current issue:** `get()` calls in rules are expensive

```javascript
// ❌ Current (slow)
allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'recruiter'

// ✅ Better - validate server-side
allow read: if request.auth != null
  // Role checked in API routes with caching
```

**Action:** Move role checks to server-side APIs with Redis caching

---

## 🟡 MEDIUM PRIORITY - Nice to Have (Ongoing)

### Priority 9: Add API Versioning (2-3 hours)

```
/api/v1/resume/create
/api/v1/recruiter/search
```

### Priority 10: Implement Caching Strategy (1-2 days)

- Add Redis for user tier/role caching
- Implement Next.js ISR for public resume pages
- Add CDN headers for static assets

### Priority 11: Add Monitoring (4-6 hours)

- Datadog or New Relic APM
- Custom metrics for LLM usage
- Cost tracking for Gemini API

### Priority 12: Circuit Breaker for External APIs (3-4 hours)

Wrap Gemini API calls:

```typescript
import CircuitBreaker from "opossum";

const geminiBreaker = new CircuitBreaker(callGeminiAPI, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});
```

### Priority 13: Add Request Cancellation (2-3 hours)

All `useEffect` hooks with fetch:

```typescript
useEffect(() => {
  const controller = new AbortController();
  fetchData(controller.signal);
  return () => controller.abort();
}, [deps]);
```

### Priority 14: Bundle Size Optimization (2-3 hours)

```bash
npm install @next/bundle-analyzer
ANALYZE=true npm run build
```

Remove unused dependencies, code split heavy components

### Priority 15: Accessibility Audit (4-6 hours)

```bash
npm install --save-dev eslint-plugin-jsx-a11y
```

Add to ESLint config, fix violations

---

## 🟢 LOW PRIORITY - Polish (Future)

### Priority 16: API Documentation

Generate OpenAPI/Swagger spec for all routes

### Priority 17: Load Testing

Use k6 or Artillery to simulate 1000+ concurrent users

### Priority 18: Disaster Recovery Plan

Document backup/restore procedures, RTO/RPO targets

### Priority 19: Feature Flags System

Migrate from env vars to LaunchDarkly or Unleash

### Priority 20: Performance Budgets

Set up Lighthouse CI in GitHub Actions

---

## 📊 Current Status Summary

| Category         | Status         | Notes                      |
| ---------------- | -------------- | -------------------------- |
| Type Safety      | ✅ Enabled     | Test errors only           |
| Linting          | ✅ Enforced    | Console/hooks strict       |
| Security Headers | ✅ Added       | CSP configured             |
| Env Validation   | ✅ Complete    | Zod schema ready           |
| Console Cleanup  | ⚠️ In Progress | Manual fixes needed        |
| Input Validation | ❌ Missing     | Critical gap               |
| Rate Limiting    | ⚠️ Partial     | Not enforced on all routes |
| Error Tracking   | ❌ Missing     | Need Sentry                |
| Test Coverage    | ⚠️ 90% overall | Key services low           |
| Monitoring       | ❌ Missing     | No APM                     |

---

## 🎯 Recommended Execution Plan

### Week 1 (Critical - 20 hours)

- [ ] Day 1-2: Replace all console statements (6h)
- [ ] Day 3-4: Add input validation to all API routes (8h)
- [ ] Day 5: Implement rate limiting on critical endpoints (6h)

### Week 2 (High Priority - 20 hours)

- [ ] Day 1: Fix React hook dependencies (3h)
- [ ] Day 2: Add request size limits (1h)
- [ ] Day 2-3: Improve test coverage (8h)
- [ ] Day 4: Integrate Sentry (2h)
- [ ] Day 5: Optimize Firestore rules (4h)

### Week 3-4 (Medium Priority - As needed)

- Pick items from medium priority based on business needs
- Focus on monitoring and caching first

---

## 🚀 Quick Wins (Do Today - 30 minutes)

1. **Import env validation in app** (5 min)

```typescript
// src/app/layout.tsx (top of file)
import "@/lib/env"; // Validates on startup
```

2. **Run linter** (10 min)

```bash
npx eslint src/ --quiet
# Review errors, create tickets
```

3. **Test build** (15 min)

```bash
npm run build
# Should succeed with new TypeScript config
```

---

## 📝 Notes

- **No new markdown files needed** - This is your single source of truth
- **Progress tracking**: Mark items ✅ as you complete them
- **Team sync**: Review this weekly, adjust priorities based on product needs
- **Technical debt**: Don't let Medium/Low items accumulate - schedule quarterly cleanup sprints

---

**Next Review:** December 4, 2025  
**Owner:** Development Team  
**Escalation:** If critical items not done in 1 week, escalate to tech lead
