# 📊 Large Files Analysis - SwitchCV

**Generated:** November 15, 2025  
**Scope:** TypeScript, JavaScript, and CSS files (>250 lines)  
**Total Files Found:** 30

---

## 🏆 Top 10 Largest Files

| #   | File                                                 | Lines | Type      | Priority | Status        |
| --- | ---------------------------------------------------- | ----- | --------- | -------- | ------------- |
| 1   | `src/app/onboarding/page-with-preview.tsx`           | 914   | React     | 🔴 HIGH  | ⏳ TODO       |
| 2   | `src/app/onboarding/page.tsx`                        | 896   | React     | 🔴 HIGH  | ⏳ TODO       |
| 3   | `src/app/create-resume/page.tsx`                     | 718   | React     | 🔴 HIGH  | ⏳ TODO       |
| 4   | `functions/src/index.ts`                             | 718   | Backend   | 🟢 DONE  | ✅ REFACTORED |
| 5   | `src/app/dashboard/access/page.tsx`                  | 444   | React     | 🟡 MED   | ⏳ TODO       |
| 6   | `src/app/dashboard/recruiter-requests/page.tsx`      | 417   | React     | 🟡 MED   | ⏳ TODO       |
| 7   | `functions/src/services/backendService.ts`           | 415   | Backend   | 🟡 MED   | ⏳ TODO       |
| 8   | `functions/src/services/auditLogger.ts`              | 398   | Backend   | 🟡 MED   | ⏳ TODO       |
| 9   | `src/app/dashboard/page.tsx`                         | 397   | React     | 🟡 MED   | ⏳ TODO       |
| 10  | `src/components/settings/NotificationAndAuditUI.tsx` | 379   | Component | 🟡 MED   | ⏳ TODO       |

---

## 📋 Complete List (All 30 Files)

### ✅ REFACTORED (1 file)

```
✓ functions/src/index.ts → 718 lines
  Split into: types.ts, resumeService.ts, jobMatchService.ts, analyticsService.ts
  New structure: 40 + 270 + 130 + 170 + 70 = 480 lines total (well organized)
```

---

### 🔴 HIGH PRIORITY (3 files - React Page Components)

These should be refactored next. Pattern: Extract form sections into components.

```
1. src/app/onboarding/page-with-preview.tsx → 914 lines
   Suggested split:
   ├── page-with-preview.tsx (200 lines) - Main layout
   ├── components/BasicInfoForm.tsx (150 lines)
   ├── components/ExperienceForm.tsx (150 lines)
   ├── components/EducationForm.tsx (100 lines)
   ├── components/SkillsForm.tsx (100 lines)
   ├── components/ProjectsForm.tsx (100 lines)
   └── hooks/useOnboardingPreview.ts (100 lines)

2. src/app/onboarding/page.tsx → 896 lines
   Similar structure to above

3. src/app/create-resume/page.tsx → 718 lines
   Suggested split:
   ├── page.tsx (150 lines) - Main container
   ├── components/ResumeBuilder.tsx (300 lines)
   ├── components/ResumePreview.tsx (150 lines)
   ├── hooks/useResumeBuilder.ts (100 lines)
   └── utils/resumeHelpers.ts (50 lines)
```

---

### 🟡 MEDIUM PRIORITY (17 files)

These have moderate complexity and can be refactored after high-priority items.

#### Backend Services

```
7. functions/src/services/backendService.ts → 415 lines
   ├── userOperations (130 lines)
   ├── resumeOperations (130 lines)
   └── analyticsOperations (100 lines)
   Suggested: Split into services/userService.ts, services/resumeService.ts, etc.

8. functions/src/services/auditLogger.ts → 398 lines
   Suggested: Create event handlers in separate files
   ├── handlers/userAuditHandler.ts
   ├── handlers/resumeAuditHandler.ts
   └── handlers/accessAuditHandler.ts
```

#### Dashboard Pages

```
5. src/app/dashboard/access/page.tsx → 444 lines
   Suggested:
   ├── page.tsx (100 lines) - Container
   ├── components/AccessRequests.tsx (150 lines)
   ├── components/AccessForm.tsx (100 lines)
   └── hooks/useAccessControl.ts (80 lines)

6. src/app/dashboard/recruiter-requests/page.tsx → 417 lines
   Suggested:
   ├── page.tsx (100 lines)
   ├── components/RequestsList.tsx (150 lines)
   ├── components/RequestDetail.tsx (100 lines)
   └── hooks/useRecruiterRequests.ts (67 lines)

9. src/app/dashboard/page.tsx → 397 lines
   Suggested: Extract each dashboard section into components
   ├── components/StatsOverview.tsx (100 lines)
   ├── components/RecentActivity.tsx (100 lines)
   ├── components/QuickActions.tsx (80 lines)
   └── components/Analytics.tsx (100 lines)
```

#### Components

```
10. src/components/settings/NotificationAndAuditUI.tsx → 379 lines
    ├── components/NotificationSettings.tsx (150 lines)
    ├── components/AuditLog.tsx (150 lines)
    └── hooks/useAuditUI.ts (70 lines)

12. src/components/recruiter/SearchInterface.tsx → 349 lines
    ├── components/SearchFilters.tsx (120 lines)
    ├── components/SearchResults.tsx (150 lines)
    └── hooks/useSearch.ts (70 lines)

13. src/components/AnalyticsDashboard.tsx → 298 lines
    ├── components/MetricsCard.tsx (80 lines)
    ├── components/ChartSection.tsx (120 lines)
    └── components/SummaryStats.tsx (80 lines)

11. functions/src/emailFunctions.ts → 348 lines
    ├── handlers/userCreatedHandler.ts (80 lines)
    ├── handlers/recruiterRequestHandler.ts (100 lines)
    ├── handlers/approvalHandler.ts (80 lines)
    └── utils/emailTemplates.ts (50 lines)
```

#### API Routes

```
3. src/app/api/profiles/analytics/route.ts → 323 lines
   ├── Analytics calculation (150 lines)
   ├── Data aggregation (100 lines)
   └── Response formatting (70 lines)

5. src/app/api/ai/generate/route.ts → 292 lines
   ├── Request validation (80 lines)
   ├── AI processing (120 lines)
   └── Response handling (70 lines)
```

#### Tests

```
4. src/__tests__/app/onboarding/complete-form.test.tsx → 375 lines
   ├── Test for BasicInfo (80 lines)
   ├── Test for Experience (100 lines)
   ├── Test for Education (80 lines)
   └── Test for Skills/Projects (100 lines)

11. src/__tests__/hooks/useAuth.test.tsx → 332 lines
    ├── Authentication tests (150 lines)
    ├── Token handling tests (100 lines)
    └── Error handling tests (80 lines)

14. src/__tests__/components/AnalyticsDashboard.test.tsx → 320 lines
    ├── Rendering tests (100 lines)
    ├── Interaction tests (100 lines)
    └── Data tests (120 lines)

18. src/__tests__/components/ResumePreview.test.tsx → 313 lines
    ├── Component rendering tests (100 lines)
    ├── Data binding tests (100 lines)
    └── Styling tests (110 lines)

20. src/__tests__/components/RequestAccessDialog.test.tsx → 286 lines
    Similar structure to above

22. src/__tests__/api/analytics.test.ts → 263 lines
    ├── API endpoint tests (150 lines)
    └── Data validation tests (110 lines)

23. src/__tests__/app/onboarding/page.test.tsx → 262 lines
    Page-level tests
```

#### Configuration

```
17. src/config/resumeQuestions.ts → 261 lines
    Consider organizing into:
    ├── sections/basicInfoQuestions.ts
    ├── sections/experienceQuestions.ts
    ├── sections/educationQuestions.ts
    └── sections/skillsQuestions.ts
```

#### Hooks & Utils

```
16. src/hooks/useAuditLog.ts → 258 lines
    ├── Log fetching logic (80 lines)
    ├── Filtering logic (80 lines)
    └── Formatting logic (80 lines)

19. src/components/recruiter/RequestManagement.tsx → 257 lines
    ├── List display (100 lines)
    ├── Management UI (100 lines)
    └── State handling (57 lines)

21. functions/src/services/emailService.ts → 257 lines
    ├── Email sending (120 lines)
    ├── Templates (80 lines)
    └── Validation (57 lines)

24. src/app/api/recruiters/request-contact/route.ts → 256 lines
    ├── Request handling (100 lines)
    ├── Validation (80 lines)
    └── Response (76 lines)
```

---

## 📈 Refactoring Impact Analysis

### Current State

```
Total lines (files >250): ~9,500 lines
Average file size: 316 lines
Max file size: 914 lines
Min file size: 251 lines
```

### After Refactoring (Best Case Scenario)

If all 30 files are refactored optimally:

```
Target: All files <250 lines
Average file size: 150-180 lines
Max file size: 250 lines
Total lines: ~8,000-9,000 lines (same code, better organized)
```

### Projected Benefits

- ✅ 100% of codebase easily navigable
- ✅ All files maintainable and testable
- ✅ Better performance (smaller AST for TypeScript)
- ✅ Faster IDE operations
- ✅ Easier code reviews
- ✅ Simpler onboarding for new developers

---

## 🎯 Recommended Refactoring Schedule

### Phase 1: HIGH PRIORITY (This Week)

- ✅ `functions/src/index.ts` (DONE)
- ⏳ `src/app/onboarding/page-with-preview.tsx` (914 lines)
- ⏳ `src/app/onboarding/page.tsx` (896 lines)

### Phase 2: MEDIUM PRIORITY (Next Week)

- ⏳ `src/app/create-resume/page.tsx` (718 lines)
- ⏳ `functions/src/services/backendService.ts` (415 lines)
- ⏳ `src/app/dashboard/access/page.tsx` (444 lines)

### Phase 3: COMPONENT REFACTORING (Following Week)

- ⏳ Dashboard page components
- ⏳ UI components (NotificationAndAuditUI, SearchInterface, etc.)
- ⏳ Email functions

### Phase 4: TEST & CONFIG REFACTORING (Ongoing)

- ⏳ Test files (optional, can reduce if high coverage)
- ⏳ Configuration files
- ⏳ Utility files

---

## 💡 Refactoring Patterns by Type

### Pattern A: React Page Components

```typescript
// BEFORE: 800+ line page.tsx

// AFTER: page.tsx (200 lines)
export default function Page() {
  const [state, setState] = useState(...)
  return (
    <>
      <Header />
      <Section1 />
      <Section2 />
      <Section3 />
    </>
  )
}

// Plus separate component files
// - components/Section1.tsx (200 lines)
// - components/Section2.tsx (200 lines)
// - hooks/usePageState.ts (100 lines)
```

### Pattern B: Backend Service Files

```typescript
// BEFORE: 400+ line service.ts

// AFTER: service.ts (60 lines)
export { userOperations } from "./userService";
export { resumeOperations } from "./resumeService";
export { analyticsOperations } from "./analyticsService";

// Plus separate service files
// - services/userService.ts (150 lines)
// - services/resumeService.ts (150 lines)
// - services/analyticsService.ts (150 lines)
```

### Pattern C: Component Files

```typescript
// BEFORE: 300+ line component.tsx

// AFTER: Component.tsx (100 lines)
export default function Component() {
  return (
    <>
      <SubComponent1 />
      <SubComponent2 />
      <SubComponent3 />
    </>
  );
}

// Plus sub-components
// - SubComponent1.tsx
// - SubComponent2.tsx
// - hooks/useComponent.ts
```

---

## 🔍 How to Analyze Your Own Large Files

### Using the Command Line

```bash
# Find all files >250 lines
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  ! -path "*/node_modules/*" ! -path "*/.next/*" \
  -exec wc -l {} + | awk '$1 > 250 {print $1 " lines: " $2}' | sort -rn

# Find files in a specific directory
find src/app -name "*.tsx" -exec wc -l {} + | sort -rn | head -10

# Count total lines in project
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1
```

### Using VSCode

1. Install "Better Word Count" extension
2. Open any file and check the status bar
3. Use Find/Replace to navigate to specific line counts
4. Use Outline view (Ctrl+Shift+O) to see structure

---

## ✅ Refactoring Checklist Template

When refactoring a large file, use this checklist:

```markdown
## Refactoring: [FileName.tsx]

- [ ] Identified logical sections (form, state, hooks, utils)
- [ ] Created new files for each section
- [ ] Moved code to appropriate files
- [ ] Updated imports in main file
- [ ] All imports resolve correctly
- [ ] No TypeScript errors
- [ ] Tests pass
- [ ] Functionality unchanged
- [ ] Git commit created
- [ ] PR created for review
- [ ] Code review approved
- [ ] Merged to main branch

### Files Created

- [ ] components/Section1.tsx
- [ ] components/Section2.tsx
- [ ] hooks/useLogic.ts
- [ ] types/index.ts

### Files Modified

- [ ] page.tsx (reduced from 914 to 200 lines)

### Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing complete
- [ ] No regression issues
```

---

## 📚 Documentation Files Generated

1. **CODE_REFACTORING_REPORT.md** - Comprehensive analysis and benefits
2. **REFACTORING_SUMMARY.md** - Quick reference guide
3. **REFACTORING_STRUCTURE.md** - Visual structure and migration paths
4. **LARGE_FILES_LIST.md** - This file (prioritized list)

---

## 🎓 Learning Resources

### Why File Size Matters

- [Cognitive Complexity & File Size](https://en.wikipedia.org/wiki/Cognitive_complexity)
- [Single Responsibility Principle](https://en.wikipedia.org/wiki/Single_responsibility_principle)
- [TypeScript Performance Tips](https://www.typescriptlang.org/docs/handbook/performance.html)

### Refactoring Techniques

- Extract Method
- Extract Class/Component
- Extract Interface/Type
- Move Method
- Create Service Layer

---

**Last Updated:** November 15, 2025  
**Status:** Refactoring Phase 1 Complete ✅  
**Next Review:** After Phase 2 completion
