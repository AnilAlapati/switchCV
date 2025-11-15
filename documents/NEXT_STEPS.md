# Immediate Next Steps - Action Plan

## Current Status

- **Pass Rate**: 457/534 (85.6%)
- **Target**: 475-500/534 (89-94%)
- **Gain Needed**: +18-43 tests
- **Estimated Time**: 2-3 hours

## Quick Wins (45 minutes)

### 1. Complete check-access API Tests

**File**: `src/app/api/profiles/check-access/check-access.test.ts`
**Current**: 8/9 passing
**Issue**: "Grant access to resume owner" test gets 500 instead of 200
**Action**: Debug mock setup for getDoc call - likely missing data in mock return
**Expected**: +1 test
**Time**: 15 minutes

### 2. Fix request-access API Tests

**File**: `src/app/api/profiles/request-access/request-access.test.ts`
**Current**: Unknown (likely 5-10 passing of 10-15 total)
**Action**: Check mock setup (similar pattern to check-access), verify error handling
**Expected**: +3-5 tests
**Time**: 20 minutes

### 3. Fix approve-access Edge Cases

**File**: `src/app/api/profiles/approve-access/approve-access.test.ts`
**Current**: 7/9 passing
**Issues**: Error handling test (mockRejectedValue), mock cleanup between tests
**Action**: Use mockImplementation instead of mockResolvedValueOnce for these edge cases
**Expected**: +2 tests
**Time**: 10 minutes

## Medium Wins (1-1.5 hours)

### 4. Fix Utility Tests

**Files**:

- `src/lib/tokenGenerator.test.ts` - Unknown failures
- `src/lib/utils/resumeVisibility.test.ts` - Unknown failures

**Action**:

1. Run and identify failures
2. Most likely: missing mocks or incorrect test setup
3. Use testUtils.tsx mock factories if needed

**Expected**: +2-4 tests
**Time**: 30 minutes

### 5. Fix Component Tests (Simple Cases)

**Target files** (choose 2-3 to focus):

- `src/components/NotificationBell.test.tsx`
- `src/__tests__/components/ResumePreview.test.tsx`
- `src/__tests__/components/AnalyticsDashboard.test.tsx`

**Action**:

1. Run each test individually
2. Look for missing mocks (useAuth, useRouter, etc.)
3. Use testUtils.tsx render function which includes all mocks
4. Fix DOM selectors (use data-testid instead of role queries)

**Expected**: +5-10 tests
**Time**: 40 minutes

### 6. Fix Onboarding Regressions

**Files**:

- `src/__tests__/app/onboarding/page.test.tsx`
- `src/__tests__/app/onboarding/complete-form.test.tsx`

**Action**: Re-run, check if previous fixes caused new failures
**Expected**: +2 tests
**Time**: 15 minutes

## Priority Order

### Phase 1: API Tests (Must Do - 30 min)

1. check-access - Complete 8/9 → 9/9
2. approve-access - Complete 7/9 → 9/9
3. request-access - Review and fix (estimate +3-5)

**Expected gain**: +8-10 tests

### Phase 2: Utilities (Should Do - 30 min)

1. tokenGenerator
2. resumeVisibility

**Expected gain**: +2-4 tests

### Phase 3: Components (Nice to Have - 40 min)

1. NotificationBell
2. ResumePreview
3. AnalyticsDashboard

**Expected gain**: +5-10 tests

## Testing Commands

### Quick Test Individual Suites

```bash
# API tests
npm test -- src/app/api/profiles/check-access/check-access.test.ts --no-coverage
npm test -- src/app/api/profiles/request-access/request-access.test.ts --no-coverage
npm test -- src/app/api/profiles/approve-access/approve-access.test.ts --no-coverage

# Utility tests
npm test -- src/lib/tokenGenerator.test.ts --no-coverage
npm test -- src/lib/utils/resumeVisibility.test.ts --no-coverage

# Component tests
npm test -- src/components/NotificationBell.test.tsx --no-coverage
npm test -- src/__tests__/components/ResumePreview.test.tsx --no-coverage
npm test -- src/__tests__/components/AnalyticsDashboard.test.tsx --no-coverage

# Onboarding tests
npm test -- src/__tests__/app/onboarding/ --no-coverage

# Full suite with summary
npm test -- --no-coverage 2>&1 | grep -E "Test Suites:|Tests:|PASS|FAIL"
```

## Resources Available

### Mock Factories (testUtils.tsx)

```typescript
mockFactories.user();
mockFactories.profile();
mockFactories.searchResult();
mockFactories.accessRequest();
mockFactories.analyticsEvent();
mockFactories.aiResponse();

// Custom render with all mocks
import { render } from "@/__tests__/helpers/testUtils";
render(<YourComponent />);
```

### Common Mock Patterns

```typescript
// useAuth
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "test" }, loading: false }),
}));

// useRouter
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// Firebase
jest.mock("firebase/firestore", () => ({
  getDoc: jest.fn().mockResolvedValue(createMockFirestoreDoc({})),
}));
```

## Success Criteria

| Target          | Current | Goal     |
| --------------- | ------- | -------- |
| Pass Rate       | 85.6%   | 90%+     |
| Test Count      | 457/534 | 475+/534 |
| Failing Tests   | 77      | <30      |
| API Tests Pass  | ~80%    | 100%     |
| Component Tests | ~50%    | 70%+     |
| Utilities       | ~60%    | 100%     |

## Known Blockers (Do NOT Attempt)

❌ **Client Component Tests** (34 tests) - Skip these

- ProfileSearchPage (13 tests)
- RecruiterPortalPage (15 tests)
- CreateResumePage (4 tests)
- These require Playwright/E2E testing instead

## Estimated Timeline

- **Phase 1 (API)**: 30 minutes → +8-10 tests
- **Phase 2 (Utilities)**: 30 minutes → +2-4 tests
- **Phase 3 (Components)**: 40 minutes → +5-10 tests
- **Total**: ~100 minutes → +15-24 tests

**Final Target**: 472-481/534 (88-90%)

## Documentation to Update After

1. Update `PHASE2_EXECUTION_LOG.md` with final numbers
2. Update `TEST_IMPROVEMENT_STRATEGY.md` with completed items
3. Create `FINAL_TEST_REPORT.md` with before/after metrics
4. Document E2E testing setup for client components
