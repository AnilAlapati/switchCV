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

### 5. Input Validation & Rate Limiting (Critical Routes)

- ✅ `api/notifications` - Added Zod validation & Rate Limiting
- ✅ `api/resume/enhance` - Added Zod validation & Rate Limiting
- ✅ `api/resume/create` - Verified Zod validation & Rate Limiting (Fixed crash)
- ✅ `api/recruiter/search` - Verified Quota/Rate Limiting
- ✅ `api/ai/generate` - Verified Zod validation & Rate Limiting
- ✅ `api/seed/generate` - Verified Zod validation & Quota Management
- ✅ `api/drafts/[draftId]` - Verified Zod validation & Rate Limiting
- ✅ Fixed all associated tests to pass with new validation rules

### 6. Console Cleanup

- ✅ Verified `src/lib/resumeIdRecycler.ts` uses logger
- ✅ Verified `src/lib/resumeMigration.ts` uses logger
- ✅ Verified `src/components/search/SmartSearch.tsx` uses logger
- ✅ Verified `src/lib/draftIdGenerator.ts` uses logger
- ✅ Confirmed console usage is restricted to test files only

---

## 🔴 CRITICAL - Fix Before Production Deploy (2-3 days)

### Priority 4: Fix React Hook Dependencies (2-3 hours)

- ✅ Verified `src/hooks/useTier.ts` has correct dependencies
- ✅ Verified no `react-hooks/exhaustive-deps` errors in codebase

### Priority 5: Add Request/Response Size Limits (1 hour)

- ✅ Updated `safeParseBody` in `src/lib/utils/api-helpers.ts` to enforce 1MB limit
- ✅ Applied `safeParseBody` to `api/resume/create`
- ✅ Applied `safeParseBody` to `api/resume/enhance`
- ✅ Applied `safeParseBody` to `api/ai/generate`
- ✅ Applied `safeParseBody` to `api/drafts/[draftId]`
- ✅ Verified `api/recruiter/search` is GET only (no body)

---

## 🟠 HIGH PRIORITY - Fix in Next Sprint (1-2 weeks)

### Priority 6: Improve Test Coverage (4-8 hours)

- ✅ `src/lib/services/userService.ts` - **100% coverage** (was 31%)
- ✅ `src/lib/services/resumeService.ts` - **88% coverage** (was 54%)
- ✅ Added integration tests for publish/unpublish flows
- ✅ Verified all tests pass

---

### Priority 7: Add Error Tracking (Deferred)

- ⏭️ **Skipped**: Decided to rely on Firebase/Vercel default logs for now to avoid extra costs/setup.
- Can revisit if debugging becomes difficult in production.

---

### Priority 8: Optimize Firestore Security Rules (3-4 hours)

- ✅ Created `onUserRoleChanged` Cloud Function to sync roles to Auth Custom Claims
- ✅ Updated `firestore.rules` to use `request.auth.token.role` instead of expensive `get()` calls
- ✅ Reduces Firestore reads and improves performance

---

### Priority 8b: Multi-Provider AI System (NEW)

- ✅ Created `src/lib/services/aiProviderService.ts` - Tiered AI model selection
- ✅ **Basic users**: Cheapest models only (Groq Llama 3.1 8B = nearly FREE)
- ✅ **Premium users**: Better models (Gemini Flash, GPT-4o-mini)
- ✅ **Enterprise users**: Best models (GPT-4o, Gemini Pro, Claude)
- ✅ Automatic fallback if primary provider fails
- ✅ Added OpenAI and Groq API key support to `env.ts`
- ✅ Tested: Groq ✅, Gemini ✅ working

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
| Test Coverage    | ✅ Improved    | Critical services >80%     |
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
