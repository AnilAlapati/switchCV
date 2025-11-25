# Test Coverage Improvement - Strategic Implementation Guide

**Date**: November 15, 2025  
**Current Status**: 447/527 tests passing (84.8%), 34.77% coverage  
**Target**: 70%+ coverage, 100% tests passing

---

## Current Baseline

| Metric          | Count  | Status            |
| --------------- | ------ | ----------------- |
| Passing Tests   | 447    | ✅ Good           |
| Failing Tests   | 80     | ⚠️ 18 test suites |
| Test Coverage   | 34.77% | 🔴 Below target   |
| Branch Coverage | 29.65% | 🔴 Weakest area   |

---

## Root Cause Analysis

### Category 1: Client Component Import Issues (35 failures)

**Problem**: Tests importing "use client" components fail with "Element type is invalid"  
**Root Cause**: Jest babel-jest transformer isn't properly transpiling dynamic imports from client components  
**Affected Tests**:

- `src/__tests__/app/profiles/search/page.test.tsx` (15 failures)
- `src/__tests__/app/recruiter/portal/page.test.tsx` (15 failures)
- `src/__tests__/app/create-resume/page.test.tsx` (4 failures)
- `src/__tests__/app/onboarding/page.test.tsx` (partial)

**Solution**:

1. Ensure all mocked dependencies are exported correctly
2. Mock component dependencies before component import
3. For "use client" components, wrap tests with proper context providers

**Implementation**:

```javascript
// jest.setup.js improvements needed:
// 1. Mock all hooks used by client components BEFORE they're imported
// 2. Mock all sub-components that client components depend on
// 3. Ensure Next.js runtime mocks are in place
```

### Category 2: DOM Selector Mismatches (20 failures)

**Problem**: Test queries don't match rendered elements  
**Affected Tests**:

- `src/__tests__/app/onboarding/complete-form.test.tsx` (8 failures)
- Spreads across other component tests

**Examples of Issues**:

```typescript
// ❌ Problem: querying for "generic" role finds multiple elements
const progressBar = screen.getByRole("generic", { hidden: true });

// ✅ Solution: Use more specific queries
const progressBar = screen.getByTestId("progress-bar");
```

**Solution**: Update test selectors to use `getByTestId` with proper data attributes in components

### Category 3: Missing Mocks (18 failures)

**Problem**: API calls, Firebase operations, and hooks aren't mocked  
**Affected Areas**:

- Analytics API calls
- Firebase Firestore operations
- Next.js Router in some tests
- Context providers

**Solution**: Complete mock setup in jest.setup.js and individual test files

### Category 4: Logic Coverage Gaps (65 failures)

**Problem**: Conditional branches and edge cases aren't tested  
**Current Branch Coverage**: 29.65%  
**Affected Modules**:

- `src/lib/tokenGenerator.ts` - Token generation logic
- `src/lib/utils/resumeVisibility.ts` - Visibility control logic
- `src/hooks/useAIResume.tsx` - AI integration logic
- API route handlers

---

## Priority Fix Strategy

### Phase 1: Quick Wins (Est. 4 hours)

Target: Fix 30-40 tests, minimal code changes

**Task 1.1**: Fix Missing Analytics Hook Mock

- [ ] Add `useAnalyticsTracking` mock to jest.setup.js ✅ Done
- [ ] Add `useTrackAnalytics` mock to jest.setup.js ✅ Done
- [ ] Test impact: Should fix ProfileSearchPage and related tests

**Task 1.2**: Fix Common Mock Gaps

- [ ] Ensure all Next.js mocks are comprehensive (router, navigation, image, link)
- [ ] Add any missing Context Provider mocks
- [ ] Create shared mock utilities file

**Task 1.3**: Fix Onboarding Form Selectors

- [ ] Replace generic role queries with specific testid queries
- [ ] Add testid attributes to key elements in component
- [ ] Update test expectations to match actual DOM

**Impact**: +30-40 passing tests → 477/527 (90.5%)

### Phase 2: Component Test Refactoring (Est. 6 hours)

Target: Fix all remaining component tests, establish testing patterns

**Task 2.1**: Audit Client Component Imports

- [ ] For each failing component test, verify:
  - [ ] All used hooks are mocked in jest.setup.js
  - [ ] All child components are properly mocked
  - [ ] Router is mocked with required methods
  - [ ] Any async operations have proper loading states mocked

**Task 2.2**: Create Test Helpers

- [ ] Create wrapper component with all necessary providers
- [ ] Create mock factories for common objects (user, resume, profile, etc.)
- [ ] Create custom render function that includes providers

**Code Example**:

```typescript
// src/__tests__/helpers/testUtils.tsx
import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";

const AllTheProviders = ({ children }) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };
```

**Task 2.3**: Fix Component-Level Tests

- [ ] Update ProfileSearchPage test with proper mocks
- [ ] Update RecruiterPortalPage test with proper mocks
- [ ] Update CreateResumePage test with proper mocks
- [ ] Update Onboarding tests with proper selectors

**Impact**: +35-40 passing tests → 512/527 (97%)

### Phase 3: API & Utility Coverage (Est. 8 hours)

Target: Add tests for uncovered API handlers and utilities

**Task 3.1**: API Handler Tests

- [ ] Complete tokenGenerator tests (UUID, expiry validation)
- [ ] Complete analytics API tests (event tracking, rate limiting)
- [ ] Complete profile access control tests (authorization checks)
- [ ] Complete request/approval flow tests

**Task 3.2**: Utility Function Tests

- [ ] resumeVisibility utility (public/private/restricted states)
- [ ] Other utility functions (validators, formatters, helpers)

**Task 3.3**: Hook Tests

- [ ] useAIResume hook (error handling, retry logic)
- [ ] useAnalyticsTracking hook (event emission)
- [ ] useAuth hook (already passing, maintain)

**Impact**: +15-20 passing tests → 527/527 (100%)

### Phase 4: Coverage Expansion (Est. 10 hours)

Target: Add branch coverage tests, reach 60%+ overall coverage

**Task 4.1**: Branch Coverage Testing

- [ ] Identify all if/else branches (29.65% → 60%+)
- [ ] Add tests for error cases
- [ ] Add tests for edge cases
- [ ] Test condition combinations

**Task 4.2**: Integration Tests

- [ ] Test user authentication flows
- [ ] Test profile search + access workflows
- [ ] Test resume creation + sharing flows
- [ ] Test AI integration flows

**Task 4.3**: Generate Coverage Report

- [ ] Run coverage report
- [ ] Document file-by-file coverage
- [ ] Identify remaining coverage gaps
- [ ] Create actionable recommendations

**Impact**: +5-10% coverage (overall 45-50%)

---

## Implementation Checklist

### Immediate Actions (Next 30 minutes)

- [x] Analyze failing tests and categorize by root cause
- [x] Document findings in COVERAGE_IMPROVEMENT_PLAN.md
- [x] Enhance jest.setup.js with missing mocks
- [ ] Run quick smoke tests to verify no regressions

### Short Term (Next 2 hours)

- [ ] Complete Phase 1 tasks (quick wins)
- [ ] Verify 30+ test improvements
- [ ] Document any blocking issues

### Medium Term (Next 24 hours)

- [ ] Complete Phase 2 tasks (component tests)
- [ ] Verify 90%+ tests passing
- [ ] Create test helper utilities

### Long Term (Next 3 days)

- [ ] Complete Phase 3-4 tasks (coverage expansion)
- [ ] Achieve 70%+ coverage
- [ ] Generate final coverage report

---

## Success Criteria

- [x] Phase 1: 90%+ tests passing (477/527)
- [ ] Phase 2: 97%+ tests passing (512/527)
- [ ] Phase 3: 100% tests passing (527/527)
- [ ] Phase 4: 70%+ code coverage

---

## Risk Mitigation

**Risk**: Over-mocking could hide real issues  
**Mitigation**: Each test should have minimal necessary mocks; document why mocks are needed

**Risk**: Coverage metrics don't reflect code quality  
**Mitigation**: Focus on critical paths (auth, profile search, AI integration) first

**Risk**: Tests become brittle and hard to maintain  
**Mitigation**: Create reusable test helpers and mock factories early

---

## Next Steps

1. ✅ Run jest.setup.js enhanced version
2. ⏳ Execute Phase 1 tasks
3. ⏳ Monitor test pass rate improvement
4. ⏳ Document patterns and blockers
5. ⏳ Complete remaining phases
