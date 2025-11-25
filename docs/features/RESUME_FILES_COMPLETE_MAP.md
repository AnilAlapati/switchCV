# 📋 Complete Resume Files Map & Usage Guide

## 🎯 Overview

This document maps ALL resume-related files in the codebase, explains their purpose, and shows where they're being used.

---

## 📂 File Structure & Usage

### 1. **CORE HOOKS** (Resume Data Management)

#### `src/hooks/useResume.tsx` ✅

**Purpose**: Main hook to fetch and manage user's resume data
**What it does**:

- Fetches resume from Firestore using `resumeProfiles` collection
- Filters by current user's UID
- Returns resume data with loading/error states
- Provides convenience functions: `hasResume()`, `getResumeId()`

**Used by**:

- `src/app/profile/settings/page.tsx` - Gets resumeId and hasResume status
- `src/app/dashboard/page.tsx` - Checks if user has resume
- `src/components/dashboard/ResumeStatusCard.tsx` - Displays resume status
- ALL pages that need to check if user has a resume

**Returns**:

```typescript
{
  resume: ResumeProfileWithId | null,
  loading: boolean,
  error: string | null,
  hasResume: boolean,
  resumeId: string | number | null,
  refetch: () => void
}
```

---

#### `src/hooks/useAIResume.tsx` ✅

**Purpose**: Generate and enhance resume content using AI
**What it does**:

- Takes structured resume data
- Calls Firebase Cloud Function `generateResumeContent`
- Returns AI-enhanced resume with suggestions
- Handles auto-model selection

**Used by**:

- Tested in `src/__tests__/hooks/useAIResume.test.tsx`
- Ready to be used in resume generation components (NOT YET INTEGRATED INTO CREATE-RESUME)

**Returns**:

```typescript
{
  generateResumeContent: (data, template, tone, modelId?) => Promise<EnhancedResumeContent>,
  loading: boolean,
  error: string | null
}
```

---

#### `src/hooks/useResumeEnhancer.tsx` ✅

**Purpose**: Enhance existing resume with AI suggestions
**What it does**:

- Takes existing ResumeProfile
- Applies enhancement functions
- Returns optimized resume with scores

**Used by**:

- Not yet integrated into UI components
- Available for future enhancement features

---

#### `src/hooks/useResumeComparison.tsx` ✅

**Purpose**: Compare two resume versions
**What it does**:

- Compares old vs new resume
- Generates detailed comparison report
- Scores similarities and differences

**Used by**:

- Not yet integrated into UI
- Ready for A/B testing or version comparison features

---

#### `src/hooks/useResumeDelete.ts` ✅

**Purpose**: Delete a resume from Firestore
**What it does**:

- Deletes resume document
- Manages ID recycling (for numeric IDs)
- Error handling

**Used by**:

- Settings pages (future enhancement)
- Dashboard delete functionality (future)

---

#### `src/hooks/useResumeDataCollection.ts` ✅

**Purpose**: Collect resume data through conversational flow
**What it does**:

- Multi-stage conversation to gather resume info
- Validates user input
- Prepares data for resume generation

**Status**: Infrastructure ready, not integrated into current create-resume flow

---

### 2. **CORE LIBRARIES** (Business Logic)

#### `src/lib/resumeEnhancer.ts` ✅

**Purpose**: AI-powered resume enhancement and optimization
**Exports**:

- `analyzeATS()` - Checks ATS compatibility (score 0-100)
- `generateResumeEnhancement()` - Creates enhancement suggestions
- `analyzeFormatting()` - Checks formatting quality
- `suggestKeywords()` - AI keyword suggestions
- `analyzeSkills()` - Skill gap analysis

**Used by**:

- `useResumeEnhancer.tsx` hook
- Dashboard quality cards (future)
- Resume preview pages (future)

---

#### `src/lib/resumeComparison.ts` ✅

**Purpose**: Compare two resumes and generate reports
**Exports**:

- `compareResumes()` - Main comparison function
- `compareBasicInfo()` - Compare personal info
- `compareSkills()` - Compare skill sections
- `compareExperience()` - Compare work history
- `compareEducation()` - Compare education

**Used by**:

- `useResumeComparison.tsx` hook
- Future A/B testing features
- Version comparison dashboard (future)

---

#### `src/lib/resumeComparison.types.ts` ✅

**Purpose**: TypeScript types for resume comparison
**Exports**:

- `Resume` interface
- `ComparisonResult` interface
- `SectionComparison` interface
- `Difference` interface

---

#### `src/lib/resumeComparisonUtils.ts` ✅

**Purpose**: Utility functions for resume comparison
**Exports**:

- `extractDifferences()` - Find what changed
- `extractSimilarities()` - Find what's same
- `generateRecommendations()` - Smart suggestions
- `calculateTotalYears()` - Experience calculation

---

#### `src/lib/services/resumeService.ts` ✅

**Purpose**: Firestore operations for resumes
**Exports**:

- `fetchResumeBySlug()` - Get resume by URL slug
- `trackResumeView()` - Log when resume is viewed

**Used by**:

- `src/app/resume/[slug]/page.tsx` - Public resume pages
- Analytics tracking (future)

---

#### `src/lib/resumeIdMapping.ts` ✅

**Purpose**: Map between document IDs and numeric IDs
**Exports**:

- `getDocumentIdFromResumeId()` - Convert numeric ID to doc ID
- `getMappingFromDocId()` - Convert doc ID to numeric ID
- `createOrUpdateMapping()` - Store mappings

**Why it exists**:

- Firestore document IDs are long
- Numeric IDs are better for URLs
- This provides translation layer

---

#### `src/lib/resumeIdRecycler.ts` ✅

**Purpose**: Recycle deleted resume IDs
**Exports**:

- `getRecycledIdFromPool()` - Reuse old ID
- `addDeletedIdToPool()` - Save deleted ID for reuse

**Why it exists**:

- Numeric IDs can run out
- Recycling prevents ID overflow
- Improves efficiency

---

#### `src/lib/numericIdGenerator.ts` ✅

**Purpose**: Generate sequential numeric resume IDs
**Exports**:

- `generateNumericResumeId()` - Create next ID
- Counter management
- Recycling integration

**Used by**:

- Resume creation flows
- API endpoints

---

#### `src/lib/resumeMigration.ts` ✅

**Purpose**: Migrate resumes between formats/versions
**What it does**:

- Handles data structure updates
- Backward compatibility
- Version management

**Status**: Utility library for admin/maintenance

---

#### `src/lib/resumeDeleter.ts` ✅

**Purpose**: Safe resume deletion with cleanup
**Exports**:

- `deleteResume()` - Full deletion with ID recycling
- Cleanup and validation

---

#### `src/lib/utils/resumeVisibility.ts` ✅

**Purpose**: Manage resume privacy and sharing settings
**Exports**:

- `hasRequestItems()` - Check if items need review
- `isItemShared()` - Check item visibility
- Visibility utilities

**Used by**:

- `src/components/resume/ResumeProjectsSection.tsx`
- Resume preview components
- Profile search features

---

### 3. **CONFIGURATION**

#### `src/config/resumeQuestions.ts` ✅

**Purpose**: Q&A questions for resume creation
**Exports**:

- `resumeQuestions` array (20+ questions)
- `getQuestionById()`
- `getQuestionsByCategory()`
- `getNextQuestion()`
- `getPreviousQuestion()`

**Question Categories**:

- Personal (name, email, location, social)
- Summary (professional background)
- Experience (work history)
- Education (degrees)
- Skills (technical & soft)
- Projects (portfolio items)

**Used by**:

- NOT YET INTEGRATED into create-resume flow
- Ready for Q&A form component
- Tests in `resumeQuestions.test.ts`

---

### 4. **UI COMPONENTS**

#### Resume Preview Components

Located in: `src/components/resume/`

**PreviewHeader.tsx** - Name, title, contact

- **Used by**: `ResumePreview.tsx`, Resume detail pages

**PreviewSummary.tsx** - Professional summary

- **Used by**: `ResumePreview.tsx`

**PreviewExperience.tsx** - Work history

- **Used by**: `ResumePreview.tsx`

**PreviewEducation.tsx** - Education section

- **Used by**: `ResumePreview.tsx`

**PreviewSkills.tsx** - Skills display

- **Used by**: `ResumePreview.tsx`

**PreviewProjects.tsx** - Portfolio projects

- **Used by**: `ResumePreview.tsx`

**PreviewContact.tsx** - Contact information

- **Used by**: `ResumePreview.tsx`

**ResumePageLayout.tsx** - Layout wrapper

- **Used by**: Resume public pages

**ResumeProjectsSection.tsx** - Projects with visibility control

- **Used by**: Resume display pages
- Uses: `resumeVisibility.ts` utilities

---

#### Main Resume Display

**src/components/ResumePreview.tsx**

- **Purpose**: Composite component displaying complete resume
- **Uses**: All Preview\* components above
- **Used by**:
  - `src/app/resume/[slug]/page.tsx` - Public resume view
  - Dashboard resume preview cards
  - Settings pages

**src/components/ResumePreviewPanel.tsx**

- **Purpose**: Collapsible panel for resume preview
- **Used by**: Dashboard, settings

---

#### Create Resume Components

Located in: `src/components/create-resume/`

**CreateResumeHeader.tsx** ✅

- Shows AI connection status
- Displays model name when connected

**CreateResumeInputForm.tsx** ✅

- Chat input box for conversational resume
- Shows stage: input/generating/complete

**AILoadingState.tsx** ✅

- Loading spinner during AI generation
- Error display with console hints

**Status**: Chat interface ready, but NO Q&A form component exists

---

#### Dashboard Cards

**src/components/dashboard/ResumeStatusCard.tsx**

- **Purpose**: Shows resume status on dashboard
- **Uses**: `useResume.tsx` hook, `resumeIdRecycler`
- **Shows**: Resume ID, creation date, delete option

**src/components/dashboard/ResumeQualityCard.tsx** (Future)

- Will show ATS score and quality metrics
- Uses: `resumeEnhancer.ts`

---

### 5. **API ROUTES**

#### `src/app/api/ai/status/route.ts` ✅

**Purpose**: Check if AI services are configured
**Endpoint**: `GET /api/ai/status`
**Returns**:

```typescript
{
  connected: boolean,
  model?: string,
  provider?: string
}
```

**Used by**: Create resume page to show connection status

---

#### `src/app/api/resume/generate/route.ts` ✅

**Purpose**: Conversational resume generation
**Endpoint**: `POST /api/resume/generate`
**Input**:

```typescript
{
  message: string,
  conversationHistory: Message[]
}
```

**Returns**:

```typescript
{
  response: string,
  model: string
}
```

---

### 6. **PAGES**

#### `src/app/create-resume/page.tsx` ✅

**Purpose**: Chat-based resume creation
**Features**:

- ✅ Conversation history
- ✅ AI response generation
- ✅ Loading/error states
- ❌ NOT Q&A structured form
- ❌ No final resume generation

**Imports**:

- `useAuth` - Get current user
- `useRouter` - Navigation
- Components: Header, InputForm, LoadingState

---

#### `src/app/resume/[slug]/page.tsx`

**Purpose**: Public resume view page
**Features**:

- Display resume by URL slug
- Privacy controls
- Share functionality
- Track views

**Uses**:

- `resumeService.ts` - Fetch by slug
- `ResumePreview.tsx` - Display
- `useResume` hook
- `resumeVisibility.ts` - Privacy

---

#### `src/app/dashboard/page.tsx`

**Purpose**: User dashboard
**Shows**:

- Resume status card
- Resume quality metrics
- Action buttons

**Uses**:

- `useResume` hook
- `ResumeStatusCard` component

---

#### `src/app/profile/settings/page.tsx`

**Purpose**: User profile settings
**Shows**:

- Resume management
- Profile info
- Privacy settings

**Uses**:

- `useResume` hook
- Resume actions

---

### 7. **TESTS**

#### Test Files (30+ test files):

- `src/__tests__/hooks/useResume.test.tsx` - useResume hook
- `src/__tests__/hooks/useAIResume.test.tsx` - AI resume generation
- `src/__tests__/hooks/useResumeComparison.test.tsx` - Resume comparison
- `src/__tests__/lib/resumeEnhancer.test.ts` - Enhancer logic
- `src/__tests__/lib/resumeComparison.test.ts` - Comparison logic
- Many component tests...

---

## 🔄 Data Flow Diagrams

### Resume Creation Flow (Current)

```
User → /create-resume
  ↓
CreateResume page
  ↓
Chat interface (CreateResumeInputForm)
  ↓
POST /api/resume/generate
  ↓
generateText() from aiGenerationService
  ↓
Gemini/HuggingFace API
  ↓
Response to user
```

**❌ MISSING**: Actual resume object creation and saving to Firestore

---

### Resume Display Flow (Complete)

```
User → /resume/[slug]
  ↓
fetchResumeBySlug() from resumeService
  ↓
Query Firestore by slug
  ↓
ResumePreview component
  ↓
Displays using Preview* sub-components
```

---

### Resume Enhancement Flow (Ready but unused)

```
useResumeEnhancer hook
  ↓
analyzeATS() - Get score
  ↓
generateResumeEnhancement() - Get suggestions
  ↓
suggestKeywords() - Add keywords
  ↓
Return enhanced resume
```

---

## 📊 File Count Summary

| Category       | Count   | Status             |
| -------------- | ------- | ------------------ |
| Core Hooks     | 6       | ✅ All implemented |
| Core Libraries | 12      | ✅ All implemented |
| Components     | 15+     | ✅ Most done       |
| API Routes     | 2       | ✅ Basic done      |
| Pages          | 4+      | ⚠️ Partial         |
| Tests          | 30+     | ✅ Comprehensive   |
| **Total**      | **70+** | **Mostly done**    |

---

## 🎯 What's Actually Missing

### 1. **Q&A Form Component** ❌

- Should use `resumeQuestions.ts`
- Display questions one by one
- Collect answers
- Save progress
- **File needed**: `src/components/ResumeQAForm.tsx` or similar

### 2. **Resume Generation from Collected Data** ❌

- Take Q&A answers
- Format into ResumeProfile
- Call Firebase Cloud Function to generate AI-enhanced content
- Save to Firestore
- Show generated resume

### 3. **Integration into Create-Resume Page** ⚠️

- Currently: Chat interface only
- Needed: Two-step process:
  1. Q&A form (structured)
  2. Generated resume display

---

## 🚀 How to Complete the System

### Step 1: Build Q&A Form Component

```tsx
// src/components/ResumeQAForm.tsx
- Uses resumeQuestions.ts
- Tracks answers in state
- Shows progress
- Validates input
- Exports collected data
```

### Step 2: Build Resume Generation Logic

```tsx
// Use useAIResume hook
// Or create new component that:
1. Takes Q&A answers
2. Formats as ResumeProfile
3. Calls generateResumeContent
4. Saves to Firestore
5. Gets back resumeId
```

### Step 3: Update Create-Resume Page

```tsx
// Conditional flow:
- If no resume: Show Q&A form
- If generating: Show loading
- If complete: Show generated resume
- Options: Accept, Rewrite, Download
```

---

## 💡 Usage Examples

### Using useResume Hook

```typescript
const { resume, hasResume, resumeId, loading } = useResume();

if (loading) return <Loading />;
if (!hasResume) return <NoResume />;

return <ResumePreview data={resume} />;
```

### Using useAIResume Hook

```typescript
const { generateResumeContent, loading, error } = useAIResume();

const enhanced = await generateResumeContent(
  myResumeData,
  "modern",
  "professional"
);
```

### Using resumeEnhancer Library

```typescript
import { analyzeATS, generateResumeEnhancement } from "@/lib/resumeEnhancer";

const atsScore = analyzeATS(resume);
const enhancement = generateResumeEnhancement(resume);
```

---

## 🔐 Security & Privacy

### Privacy Controls

- Resume visibility settings (`resumeVisibility.ts`)
- Access request system (profile search feature)
- Time-limited sharing

### Data Safety

- Firestore rules enforcement
- ID validation and mapping
- Safe deletion with recycling

---

## 🎓 Testing

### Test Commands

```bash
# Test useResume hook
npm test -- useResume

# Test AI resume generation
npm test -- useAIResume

# Test resume comparison
npm test -- useResumeComparison

# Test enhancer
npm test -- resumeEnhancer

# All resume tests
npm test -- resume
```

---

## 📝 Summary

**What exists**:

- ✅ All resume data management hooks
- ✅ All business logic (enhance, compare, analyze)
- ✅ All resume display components
- ✅ Resume preview pages
- ✅ Dashboard integration
- ✅ API routes for AI
- ✅ Privacy/visibility system
- ✅ Q&A questions config
- ✅ Tests (30+ files)

**What's missing**:

- ❌ Q&A form component to use resumeQuestions
- ❌ Integration of Q&A → AI generation → Save
- ❌ Resume generation from collected data
- ❌ Futuristic display component (mentioned in docs)

**What's ready to use**:

- Profile search system (Feature #5 from documents)
- Email notifications (Backend services)
- Skill matrix & gap analysis (Feature #5)
- Analytics tracking

---

**Generated**: November 18, 2025
**Branch**: feature/Nov_17
**Status**: 80% complete - Main pieces exist, need final integration
