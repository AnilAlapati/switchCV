# Coverage Fixes Required - Detailed Analysis

**Overall Coverage Status:**

- Statements: 0.48% (Target: >50%)
- Branches: 0.2% (Target: >50%)
- Functions: 0.86% (Target: >50%)
- Lines: 0.37% (Target: >50%)

---

## 1. API Routes - 0% Coverage (CRITICAL)

### Admin Routes

- `src/app/api/admin/init-system/route.ts` - 0% (32 lines)
- `src/app/api/admin/migrate-numeric-ids/route.ts` - 0% (15 lines)
- `src/app/api/admin/migrate-resume-ids/route.ts` - 0% (23 lines)

### AI Routes

- `src/app/api/ai/generate/route.ts` - 0% (74 lines)
- `src/app/api/ai/generate-resume/route.ts` - 0% (29 lines)
- `src/app/api/ai/models/route.ts` - 0% (8 lines)
- `src/app/api/ai/refresh-models/route.ts` - 0% (26 lines)
- `src/app/api/ai/status/route.ts` - 0% (27 lines)

### Analytics Routes

- `src/app/api/analytics/dashboard/route.ts` - 0% (52 lines)

### Contact Routes

- `src/app/api/contact/feedback/route.ts` - 0% (24 lines)

### Draft Routes

- `src/app/api/drafts/[draftId]/route.ts` - 0% (59 lines)

### Health Routes

- `src/app/api/health/route.ts` - 0% (40 lines)

### Interview Routes

- `src/app/api/interview/assistant/route.ts` - 0% (29 lines)

### JobSeeker Routes

- `src/app/api/jobseeker/access-requests/route.ts` - 0% (42 lines)
- `src/app/api/jobseeker/metrics/route.ts` - 0% (22 lines)

### Notification Routes

- `src/app/api/notifications/route.ts` - 0% (85 lines)

### Profile Routes

- `src/app/api/profiles/analytics/route.ts` - 0% (26 lines)
- `src/app/api/profiles/approve-access/route.ts` - 0% (39 lines)
- `src/app/api/profiles/check-access/route.ts` - 0% (34 lines)
- `src/app/api/profiles/request-access/route.ts` - 0% (84 lines)
- `src/app/api/profiles/respond-access/route.ts` - 0% (51 lines)
- `src/app/api/profiles/search/route.ts` - 0% (71 lines)
- `src/app/api/profiles/search/search-query.ts` - 0% (42 lines)
- `src/app/api/profiles/search/search-utils.ts` - 0% (23 lines)

### Recruiter Routes

- `src/app/api/recruiter/bulk-actions/route.ts` - 0% (61 lines)
- `src/app/api/recruiter/candidates/route.ts` - 0% (56 lines)
- `src/app/api/recruiter/debug-resumes/route.ts` - 0% (9 lines)
- `src/app/api/recruiter/interviews/route.ts` - 0% (63 lines)
- `src/app/api/recruiter/metrics/route.ts` - 0% (34 lines)
- `src/app/api/recruiter/pipeline/route.ts` - 0% (59 lines)
- `src/app/api/recruiter/request-access/route.ts` - 0% (36 lines)
- `src/app/api/recruiter/requests/route.ts` - 0% (67 lines)
- `src/app/api/recruiter/search/route.ts` - 0% (90 lines)
- `src/app/api/recruiter/search-resumes/access-status.ts` - 0% (75 lines)
- `src/app/api/recruiter/search-resumes/route.ts` - 0% (59 lines)
- `src/app/api/recruiter/search-resumes/search-result.ts` - 0% (7 lines)
- `src/app/api/recruiter/search-resumes/search-service.ts` - 0% (106 lines)

### Recruiter Contact Routes

- `src/app/api/recruiters/approve-contact/route.ts` - 0% (50 lines)
- `src/app/api/recruiters/deny-contact/route.ts` - 0% (29 lines)
- `src/app/api/recruiters/request-contact/route.ts` - 0% (63 lines)
- `src/app/api/recruiters/verify-token/route.ts` - 0% (62 lines)

### Resume Routes

- `src/app/api/resume/compare/route.ts` - 0% (14 lines)
- `src/app/api/resume/create/route.ts` - 0% (20 lines)
- `src/app/api/resume/delete/route.ts` - 0% (56 lines)
- `src/app/api/resume/enhance/route.ts` - 0% (17 lines)
- `src/app/api/resume/generate/route.ts` - 0% (71 lines)
- `src/app/api/resume/map-id/route.ts` - 0% (12 lines)
- `src/app/api/resumes/[id]/route.ts` - 0% (114 lines)
- `src/app/api/resumes/[id]/chat/route.ts` - 0% (67 lines)
- `src/app/api/resumes/create/route.ts` - 0% (46 lines)

### Search Routes

- `src/app/api/search/ai/route.ts` - 0% (57 lines)

### Other Routes

- `src/app/api/seed/generate/route.ts` - 0% (73 lines)
- `src/app/api/skills/route.ts` - 0% (35 lines)
- `src/app/api/system-config/route.ts` - 0% (11 lines)
- `src/app/api/user/profile/route.ts` - 0% (56 lines)
- `src/app/api/user/settings/route.ts` - 0% (38 lines)
- `src/app/api/user/username/check/route.ts` - 0% (39 lines)

---

## 2. Page Components - 0% Coverage

### Auth Pages

- `src/app/auth/page.tsx` - 0% (12 lines)
- `src/app/auth/choose-username/page.tsx` - 0% (70 lines)

### Dashboard Pages

- `src/app/dashboard/page.tsx` - 0% (33 lines)
- `src/app/dashboard/access-requests/page.tsx` - 0% (82 lines)
- `src/app/dashboard/recruiter/requests/page.tsx` - 0% (99 lines)

### Content Pages

- `src/app/contact/page.tsx` - 0% (66 lines)
- `src/app/create-resume/page.tsx` - 0% (91 lines)
- `src/app/drafts/[draftId]/page.tsx` - 0% (64 lines)
- `src/app/profile/page.tsx` - 0% (25 lines)
- `src/app/profile/settings/page.tsx` - 0% (97 lines)
- `src/app/profile/subscription/page.tsx` - 0% (11 lines)
- `src/app/recruiter/search/page.tsx` - 0% (35 lines)
- `src/app/resumes/[id]/page.tsx` - 0% (150 lines)
- `src/app/resumes/[id]/ai-edit/page.tsx` - 0% (91 lines)
- `src/app/resumes/[id]/edit/page.tsx` - 0% (98 lines)
- `src/app/seed/page.tsx` - 0% (28 lines)
- `src/app/select-role/page.tsx` - 0% (36 lines)

### Layout

- `src/app/layout.tsx` - 0% (4 lines)

### Home

- `src/app/page.tsx` - 0% (30 lines)

---

## 3. Vibe Concept Pages - 0% Coverage (Low Priority - Consider Exclusion)

- `src/app/vibe-concepts/indigo/page.tsx` - 0% (3 lines, 2% branches)
- `src/app/vibe-concepts/paper/page.tsx` - 0% (2 lines, 0% branches)
- `src/app/vibe-concepts/space/page.tsx` - 0% (2 lines, 0% branches)
- `src/app/vibe-concepts/sunset/page.tsx` - 0% (2 lines, 0% branches)
- Various other vibe pages with 0% coverage

---

## 4. Components - 0% Coverage

### Resume Components

- `src/components/resume/TemplateRenderer.tsx` - 0% (74 lines)
- `src/components/resume/LegacyResumeRenderer.tsx` - 0% (6 lines)
- `src/components/resume/templateRendererUtils.ts` - 0% (27 lines)
- Preview components (PreviewContact, PreviewEducation, etc.) - 0% coverage

### Dashboard Components

- `src/components/dashboard/RecruiterSearchBox.tsx` - 0% (66 lines)
- `src/components/dashboard/RecruiterSearchForm.tsx` - 0% (31 lines)
- `src/components/dashboard/UserProfileSettings.tsx` - 0% (61 lines)
- Various metric and status cards - 0% coverage

### Recruiter Components

- `src/components/recruiter/SearchInterface.tsx` - 0% (18 lines)
- `src/components/dashboard/recruiter/*` - Multiple files at 0%

### Auth Components

- `src/components/auth/GoogleSignInDebug.tsx` - 0% (37 lines)
- `src/components/auth/AuthFormInputs.tsx` - 0% (25 lines)
- `src/components/auth/UsernameInput.tsx` - 0% (12 lines)

### Other Components

- `src/components/ResumeCreationFlow.tsx` - 0% (72 lines)
- `src/components/RequestAccessDialog.tsx` - 0% (41 lines)
- `src/components/ResumeQAForm.tsx` - 0% (55 lines)

---

## 5. Hooks - 0% Coverage (High Priority for Testing)

### Critical Hooks

- `src/hooks/useAuth.tsx` - 0% (142 lines, 15 functions)
- `src/hooks/useAuth.helpers.ts` - 0% (119 lines, 15 functions)
- `src/hooks/useAuthPage.ts` - 0% (105 lines, 12 functions)
- `src/hooks/useResume.tsx` - 0% (59 lines, 11 functions)

### Data Hooks

- `src/hooks/useAIResume.tsx` - 0% (41 lines)
- `src/hooks/useAccessRequests.ts` - 0% (33 lines)
- `src/hooks/useBulkActions.ts` - 0% (53 lines)
- `src/hooks/useRecruiterPipeline.ts` - 0% (68 lines)
- `src/hooks/useResumeDelete.ts` - 0% (33 lines)
- `src/hooks/useNotifications.ts` - 0% (69 lines)
- `src/hooks/useAuditLog.ts` - 0% (64 lines)

### Search & Advanced Hooks

- `src/hooks/useAdvancedSearch.ts` - 0% (34 lines)
- `src/hooks/useProfileSearch.ts` - 0% (27 lines)

---

## 6. Services - 0% Coverage (High Priority)

### Critical Services

- `src/lib/services/aiGenerationService.ts` - 0% (184 lines, 22 functions)
- `src/lib/services/resumeDataExtractor.ts` - 0% (175 lines, 15 functions)
- `src/lib/services/resumeEnhancer.ts` - 0% (112 lines, 16 functions)
- `src/server/services/aiProviderService.ts` - 0% (110 lines, 26 functions)

### Resume Services

- `src/lib/services/resumeService.ts` - 0% (76 lines)
- `src/lib/services/draftService.ts` - 0% (39 lines)

### Analytics & Messaging

- `src/lib/services/analyticsService.ts` - 0% (81 lines)
- `src/lib/services/notificationDelivery.ts` - 0% (89 lines)
- `src/lib/services/conversationManager.ts` - 0% (69 lines)

---

## 7. Utilities - 0% Coverage

- `src/lib/utils/resumeEditor.ts` - 0% (93 lines, 143% branches!)
- `src/lib/utils/resumeVisibility.ts` - 0% (50 lines)
- `src/lib/utils/api-helpers.ts` - 0% (59 lines)
- `src/lib/utils/aiResponseParser.ts` - 0% (40 lines)
- `src/lib/gapAnalysis.ts` - 0% (77 lines, 23 functions)
- `src/lib/resumeComparison.ts` - 0% (44 lines)

---

## 8. Library Files - 0% Coverage

- `src/lib/firebase.ts` - 0% (76 lines)
- `src/lib/config.client.ts` - 0% (62 lines)
- `src/lib/analytics.service.ts` - 0% (65 lines)
- `src/lib/recruiterSearchHistory.ts` - 0% (75 lines)
- `src/lib/tokenGenerator.ts` - 0% (55 lines)
- `src/lib/numericIdGenerator.ts` - 0% (75 lines)
- Multiple other utility files

---

## 9. Context Providers - 0% Coverage

- `src/context/SystemConfigProvider.tsx` - 0% (91 lines, 17 functions)
- `src/context/DashboardMetricsContext.tsx` - 0% (7 lines, but 2% branches)

---

## Recommendation Priority Order:

### Phase 1: Critical Path (Highest Impact)

1. Hook tests (useAuth, useResume, useAuthPage) - Core user functionality
2. API route tests - All endpoints need integration tests
3. Service tests (aiGenerationService, resumeDataExtractor) - Core business logic

### Phase 2: Component Tests

1. Resume component tests (TemplateRenderer, Preview components)
2. Dashboard component tests
3. Recruiter component tests

### Phase 3: Utilities & Libraries

1. Critical utilities (resumeEditor, resumeVisibility, gapAnalysis)
2. Service helpers and utils
3. Config and context providers

### Phase 4: Low Priority

1. Vibe concept pages (consider marking as ignored in coverage)
2. Template and utility-only components
3. Type definition files (already at 100%)

---

## Quick Stats:

- **Total files analyzed:** 500+
- **Files with <50% coverage:** 300+
- **Critical files needing tests:** 50+
- **Total lines needing coverage:** 10,000+
- **Functions needing tests:** 2,000+
