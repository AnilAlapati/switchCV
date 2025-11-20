# Test Coverage Improvement Plan

**Date**: November 15, 2025  
**Current Status**: 78 failing tests, 449 passing tests  
**Overall Coverage**: 34.77% (target: 70%+)

---

## Executive Summary

The project has 42 test files with **449 passing tests** and **78 failing tests** across 18 failing test suites. Current coverage is significantly below industry standard (34.77% statements). This plan addresses:

1. **Component Export Issues** (11 failures) - Missing or incorrect exports
2. **DOM Selector Mismatches** (8 failures) - Test selectors don't match rendered elements
3. **Mock/Provider Issues** (15 failures) - Missing Firebase/Router/Context mocks
4. **API/Utility Coverage Gaps** (44 failures) - API handlers and utility functions untested

---

## Failing Test Suites (18 total)

### Critical Issues (Component Exports)

1. **src/**tests**/app/profiles/search/page.test.tsx** (5 failures)

   - ProfileSearchPage undefined - export issue
   - Affects: search input, results, auth checks

2. **src/**tests**/app/recruiter/portal/page.test.tsx** (6 failures)

   - RecruiterPortalPage undefined
   - Affects: portal tabs, header, functionality

3. **src/**tests**/app/create-resume/page.test.tsx** (4 failures)

   - CreateResumePage component not found
   - Affects: form rendering, resume preview

4. **src/**tests**/app/onboarding/page.test.tsx** (7 failures)

   - Onboarding component issues
   - Affects: step navigation, form completion

5. **src/**tests**/app/onboarding/complete-form.test.tsx** (8 failures)
   - DOM selector queries (progress bar, button queries)
   - getByRole queries finding multiple elements or none

### Mock/Provider Issues

6. **src/**tests**/components/ResumePreview.test.tsx** (6 failures)

   - Firebase mock issues, context provider missing

7. **src/**tests**/components/AnalyticsDashboard.test.tsx** (5 failures)

   - Firebase/Analytics mocks incomplete

8. **src/components/NotificationBell.test.tsx** (4 failures)
   - Router mock missing

### API Handler Coverage Gaps

9. **src/**tests**/api/analytics.test.ts** (3 failures)
10. **src/**tests**/api/profiles/check-access.test.ts** (2 failures)
11. **src/**tests**/api/profiles/request-access.test.ts** (4 failures)
12. **src/app/api/profiles/check-access/check-access.test.ts** (2 failures)
13. **src/app/api/profiles/request-access/request-access.test.ts** (3 failures)
14. **src/app/api/profiles/approve-access/approve-access.test.ts** (2 failures)

### Utility/Hook Coverage

15. **src/hooks/useAIResume.test.tsx** (5 failures)

    - AI API failures, mock setup issues

16. **src/lib/tokenGenerator.test.ts** (3 failures)
17. **src/lib/utils/resumeVisibility.test.ts** (2 failures)
18. **src/**tests**/mocks/firebase.ts** (1 failure)

---

## Coverage Breakdown (Current)

| Metric     | Current | Target | Gap     |
| ---------- | ------- | ------ | ------- |
| Statements | 34.77%  | 70%    | +35.23% |
| Branches   | 29.65%  | 70%    | +40.35% |
| Functions  | 37.05%  | 70%    | +32.95% |
| Lines      | 35.02%  | 70%    | +34.98% |

**Uncovered Code**: ~1,474 statements, 1,122 branches, 350 functions

---

## Priority Fix Order

### Phase 1: Critical Foundation (High Impact)

- [ ] Fix component exports (ProfileSearchPage, RecruiterPortalPage, etc.)
- [ ] Set up proper mock providers for all component tests
- [ ] Fix Onboarding form DOM selectors
- **Expected Impact**: Resolve ~30 failures, unlock component testing

### Phase 2: API & Integration (Medium Impact)

- [ ] Complete Firebase mock setup
- [ ] Add API route handler tests
- [ ] Fix utility function tests
- **Expected Impact**: Resolve ~25 failures, improve statements coverage to ~45%

### Phase 3: Coverage Expansion (Coverage Growth)

- [ ] Add integration tests for user workflows
- [ ] Add branch coverage for conditional logic
- [ ] Test error handling paths
- **Expected Impact**: Increase to ~60% coverage

### Phase 4: Polish & Documentation (Final)

- [ ] Generate coverage report with file-by-file breakdown
- [ ] Document coverage gaps and recommendations
- [ ] Create baseline for future coverage tracking
- **Expected Impact**: Complete visibility into coverage status

---

## Detailed Fix Procedures

### Fix 1: Component Exports

**Files to Check**:

- `src/app/profiles/search/page.tsx` - Verify ProfileSearchPage default export
- `src/app/recruiter/portal/page.tsx` - Verify RecruiterPortalPage default export
- `src/app/create-resume/page.tsx` - Verify CreateResumePage default export
- `src/app/onboarding/page.tsx` - Verify Onboarding default export

**Action**: Ensure all components have `export default ComponentName` statements

### Fix 2: Test Mocks

**Firebase Mock** (`src/__tests__/mocks/firebase.ts`):

```typescript
// Ensure all Firebase modules are properly mocked:
- auth: { onAuthStateChanged, signInWithPopup, signOut }
- firestore: { collection, query, getDocs }
- functions: { httpsCallable }
```

**Next.js Router Mock**:

```typescript
// useRouter mock needs: push, replace, pathname, query
```

**Context Providers**:

```typescript
// All component tests should wrap with necessary providers
```

### Fix 3: DOM Selectors

**Onboarding Form Issues**:

- Replace generic `getByRole("generic")` with more specific selectors
- Use `getByTestId()` instead of role queries when needed
- Verify rendered output matches test expectations

### Fix 4: API Test Completion

**Pattern**:

```typescript
// Each API route test needs:
1. Mock Firebase client/admin
2. Mock authentication
3. Test success path
4. Test error paths (auth, validation, DB errors)
5. Verify response structure
```

---

## Success Metrics

| Phase   | Tests Passing  | Coverage % | Timeline |
| ------- | -------------- | ---------- | -------- |
| Start   | 449/527 (85%)  | 34.77%     | Day 1    |
| Phase 1 | 480/527 (91%)  | 40%        | Day 2    |
| Phase 2 | 505/527 (96%)  | 50%        | Day 3    |
| Phase 3 | 520/527 (99%)  | 60%+       | Day 4    |
| Phase 4 | 527/527 (100%) | 70%+       | Day 5    |

---

## Notes

- Failing tests are well-distributed across component, API, and utility layers
- Most failures have clear causes (exports, mocks, selectors)
- No architectural issues detected - fixable with targeted improvements
- Branch coverage is the weakest area - needs conditional logic testing
