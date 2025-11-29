# SwitchCV To-Do List — November 28, 2025

## ✅ Completed Security Fixes

All critical and high-severity issues identified by the AI reviews have been resolved.

| #   | Issue                                      | Severity     | Fix Applied                                                             | Files Changed                                                                                          |
| --- | ------------------------------------------ | ------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | Self-service tier/role escalation          | 🔴 Critical  | Reject client-supplied `subscriptionTier` and `role` in profile updates | `src/app/api/user/profile/route.ts`                                                                    |
| 2   | Unauthenticated recruiter endpoints        | 🔴 Critical  | Added `getAuthenticatedUserId()` + role checks                          | `src/app/api/recruiters/request-contact/route.ts`, `approve-contact/route.ts`, `deny-contact/route.ts` |
| 3   | Anonymous profile search + client SDK      | 🔴 High      | Require auth + switched to `adminDb`                                    | `src/app/api/profiles/search/route.ts`                                                                 |
| 4   | In-memory rate limiting bypassed           | 🔴 High      | New Firestore-backed distributed rate limiter                           | `src/lib/utils/distributedRateLimit.ts`                                                                |
| 5   | CORS allows all origins                    | 🔴 Critical  | Restricted to production domains                                        | `functions/src/middleware/corsHandler.ts`                                                              |
| 6   | Email template injection                   | 🔴 Critical  | Added HTML escaping with `html-escaper`                                 | `functions/src/emailFunctions.ts`                                                                      |
| 8   | Fix unbounded query in `emailFunctions.ts` | GPT-5.1/Opus | Use pagination for batch processing                                     | `functions/src/emailFunctions.ts`                                                                      |
| 9   | Add Firestore security rules tests         | Opus 4.5     | Added unit tests with `@firebase/rules-unit-testing`                    | `src/__tests__/firestore.rules.test.ts`                                                                |
| 10  | Token cache uses LRU eviction              | Opus 4.5     | Implemented LRU eviction policy in `jobMatchService.ts`                 | `functions/src/jobMatchService.ts`                                                                     |
| 11  | Set up CI/CD pipeline                      | Opus 4.5     | Updated `.github/workflows/ci.yml` to run tests with Firestore Emulator | `.github/workflows/ci.yml`                                                                             |
| 12  | Move quota limits to Remote Config         | Gemini       | Moved hardcoded quotas in `searchResumeService.ts` to `config/index.ts` | `functions/src/searchResumeService.ts`, `functions/src/config/index.ts`                                |

**Test Status:** ✅ All 2,497 tests passing (11 new rules tests)

---

## 🟡 Medium Priority — Next 2 Weeks

| #   | Task                                | Source        | Notes                                                             |
| --- | ----------------------------------- | ------------- | ----------------------------------------------------------------- |
| 1   | Add E2E tests with Playwright       | Opus 4.5      | Critical user journeys: signup, resume creation, recruiter search |
| 3   | Add payment/subscription flow tests | Opus 4.5      | Business critical before monetization launch                      |
| 4   | Build admin panel for system config | Nov 29 Review | GUI to toggle maintenance flags/messages without Firebase Console |

---

## 🟢 Low Priority — Next Month

| #   | Task                                | Source   | Notes                                                           |
| --- | ----------------------------------- | -------- | --------------------------------------------------------------- |
| 1   | API documentation (OpenAPI/Swagger) | Opus 4.5 | Document all API endpoints                                      |
| 2   | Database schema documentation       | Opus 4.5 | Document Firestore collections and fields                       |
| 3   | Optimize premium recruiter search   | GPT-5.1  | Move from linear scan to Firestore composite queries or Algolia |
| 5   | Add Sentry for error tracking       | Opus 4.5 | Production monitoring                                           |

**Test Status:** ✅ All 2,497 tests passing (11 new rules tests)

---

## 🟡 Medium Priority — Next 2 Weeks

| #   | Task                                | Source        | Notes                                                             |
| --- | ----------------------------------- | ------------- | ----------------------------------------------------------------- |
| 1   | Add E2E tests with Playwright       | Opus 4.5      | Critical user journeys: signup, resume creation, recruiter search |
| 3   | Add payment/subscription flow tests | Opus 4.5      | Business critical before monetization launch                      |
| 4   | Build admin panel for system config | Nov 29 Review | GUI to toggle maintenance flags/messages without Firebase Console |

---

## 🟢 Low Priority — Next Month

| #   | Task                                | Source   | Notes                                                              |
| --- | ----------------------------------- | -------- | ------------------------------------------------------------------ |
| 1   | API documentation (OpenAPI/Swagger) | Opus 4.5 | Document all API endpoints                                         |
| 2   | Database schema documentation       | Opus 4.5 | Document Firestore collections and fields                          |
| 3   | Optimize premium recruiter search   | GPT-5.1  | Move from linear scan to Firestore composite queries or Algolia    |
| 4   | Move quota limits to Remote Config  | Gemini   | `PREMIUM_MONTHLY_QUOTA` etc. hardcoded in `searchResumeService.ts` |
| 5   | Add Sentry for error tracking       | Opus 4.5 | Production monitoring                                              |
| 6   | Add PostHog for product analytics   | Opus 4.5 | User behavior tracking                                             |
| 7   | Runbook for incident response       | Opus 4.5 | Operations documentation                                           |
| 8   | Load testing setup (k6/Artillery)   | Opus 4.5 | Performance validation                                             |

---

## 📊 Test Coverage Status

| Metric     | Coverage |
| ---------- | -------- |
| Statements | 79.21%   |
| Branches   | 62.94%   |
| Functions  | 90.47%   |
| Lines      | 79.13%   |

### Test Gaps to Address

- [ ] Payment/subscription flows
- [ ] End-to-end user journeys
- [ ] Firestore security rules
- [ ] Email sending verification
- [ ] Admin operations

---

## 🔍 Review Summary

Three AI models reviewed the codebase on Nov 28:

| Model        | Approach         | Verdict                              |
| ------------ | ---------------- | ------------------------------------ |
| **GPT-5.1**  | Security-focused | Found most critical vulnerabilities  |
| **Opus 4.5** | Balanced         | Good architecture + testing coverage |
| **Gemini 3** | Overly positive  | Missed critical security issues      |

**Recommendation:** Trust GPT-5.1 for security, Opus 4.5 for overall quality assessment.

---

## 📝 Notes

- All security fixes have corresponding test updates
- Dev mode bypass remains safe (compile-time `NODE_ENV` check)
- Vector search provider toggle (`AI_SEARCH_PROVIDER`) working correctly
- Auth maintenance flags now live in Firestore (`config/system`); deprecated env vars `NEXT_PUBLIC_REGISTRATION_DISABLED` and `NEXT_PUBLIC_LOGIN_DISABLED` have been removed
- Custom claims sync via `onUserRoleChanged` Cloud Function verified
