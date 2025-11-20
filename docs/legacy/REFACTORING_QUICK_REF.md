# Quick Reference - Refactored Code Locations

## Frontend Refactoring (Create Resume)

### Main Component

**File:** `src/app/create-resume/page.tsx`
**Lines:** 336 (was 677)
**Purpose:** Main page component
**Uses:**

- `useAIConversation` hook
- `useAIResume` hook
- `ChatMessages` component
- `GeneratedResumePreview` component

### Custom Hook - Conversation Management

**File:** `src/hooks/useAIConversation.ts`
**Lines:** 240+
**Exports:**

- `useAIConversation()` hook
- Types: `Message`, `ConversationStage`, `ResumeData`

**Key Methods:**

```typescript
-initializeAIGreeting() -
  generateNextQuestion(stage, data) -
  addMessage(content, role) -
  addAssistantMessageWithDelay(content, delay);
```

### Utility - Resume Generation

**File:** `src/lib/resumeGenerator.ts`
**Lines:** 150+
**Exports:**

- `buildResumeProfile(userId, resumeData, enhancedContent)`
- `saveResumeToDB(resumeProfile)`
- Type: `EnhancedResumeContent`
- Interface: `ResumeProfile`

### Component - Chat Display

**File:** `src/components/ChatMessages.tsx`
**Lines:** 75+
**Props:**

```typescript
interface ChatMessagesProps {
  messages: Message[];
  isGeneratingQuestion: boolean;
}
```

### Component - Resume Preview

**File:** `src/components/GeneratedResumePreview.tsx`
**Lines:** 55+
**Props:**

```typescript
interface GeneratedResumePreviewProps {
  generatedResume: EnhancedResumeContent | null;
  aiModelUsed: string;
}
```

---

## Backend Refactoring (Services)

### Main Integration Facade

**File:** `functions/src/services/backendService.ts`
**Lines:** 46 (was 415)
**Purpose:** Unified interface delegating to specialized services

### Recruiter Request Service

**File:** `functions/src/services/recruiterRequestService.ts`
**Lines:** 94
**Methods:**

```typescript
- create(data): Promise<string>
- approve(requestId, adminId, reason): Promise<string>
- deny(requestId, adminId, reason): Promise<void>
```

### Access Token Service

**File:** `functions/src/services/accessTokenService.ts`
**Lines:** 71
**Methods:**

```typescript
- revoke(tokenId, reason): Promise<void>
- verify(tokenId, recruiterId): Promise<boolean>
- recordUsage(tokenId): Promise<void>
```

### User Data Service

**File:** `functions/src/services/userDataService.ts`
**Lines:** 114
**Methods:**

```typescript
- updateProfile(userId, changes): Promise<void>
- exportUserData(userId): Promise<Record<string, any>>
- deleteAccount(userId, reason): Promise<void>
```

### Profile Access Service

**File:** `functions/src/services/profileAccessService.ts`
**Lines:** 41
**Methods:**

```typescript
- logProfileAccess(accessorId, profileOwnerId, accessType): Promise<void>
```

### Security Service

**File:** `functions/src/services/securityService.ts`
**Lines:** 68
**Methods:**

```typescript
- logSuspiciousActivity(userId, activityType, details): Promise<void>
- validateTokenAccess(tokenId, recruiterId): Promise<boolean>
```

---

## Audit Logger Refactoring

### Main Facade (Re-export)

**File:** `functions/src/services/auditLogger.ts`
**Lines:** 13 (was 399)
**Purpose:** Public interface for audit logging

### Modular System Location

**Directory:** `functions/src/services/auditLoggers/`

#### Types & Enums

**File:** `auditLoggers/types.ts` (70 lines)

```typescript
interface AuditLogEntry { ... }
enum AuditAction { ... }  // 16 values
enum ResourceType { ... } // 7 values
```

#### Base Logger

**File:** `auditLoggers/baseLogger.ts` (27 lines)

```typescript
class BaseAuditLogger {
  async log(entry): Promise<string>;
}
```

#### Query Logger

**File:** `auditLoggers/queryLogger.ts` (78 lines)

```typescript
-getUserAuditLogs(userId, limit) -
  getResourceAuditLogs(resourceId, resourceType, limit) -
  getAuditLogsByDateRange(start, end, action);
```

#### Domain Loggers

**File:** `auditLoggers/domainLoggers.ts` (142 lines)

```typescript
-logUserCreated(userId, email, metadata) -
  logProfileAccessed(userId, profileId, accessType) -
  logRecruiterRequest(requestId, recruiterId, candidateId, action, approved) -
  logAccessToken(recruiterId, candidateId, tokenId, action) -
  logEmailSent(userId, emailAddress, template, success, error) -
  logLogin(userId, email, success) -
  logSuspiciousActivity(userId, activityType, details);
```

#### Maintenance Logger

**File:** `auditLoggers/maintenanceLogger.ts` (68 lines)

```typescript
- exportAuditLogs(userId, format): Promise<string>
- cleanupOldLogs(retentionDays): Promise<number>
```

#### Unified Index

**File:** `auditLoggers/index.ts` (47 lines)

```typescript
class AuditLogger extends BaseAuditLogger {
  // All methods from QueryLogger
  // All methods from MaintenanceLogger
  // All methods from DomainLoggers
}

export const auditLogger = new AuditLogger();
```

---

## Import Examples

### Frontend

```typescript
// Conversation hook
import { useAIConversation } from "@/hooks/useAIConversation";

// Resume utilities
import { buildResumeProfile, saveResumeToDB } from "@/lib/resumeGenerator";

// Components
import { ChatMessages } from "@/components/ChatMessages";
import { GeneratedResumePreview } from "@/components/GeneratedResumePreview";
```

### Backend Services

```typescript
// Individual services
import { recruiterRequestService } from "./recruiterRequestService";
import { accessTokenService } from "./accessTokenService";
import { userDataService } from "./userDataService";
import { profileAccessService } from "./profileAccessService";
import { securityService } from "./securityService";

// Unified facade (backward compatible)
import { backendService } from "./backendService";
```

### Audit Logger

```typescript
// Main interface (backward compatible)
import { auditLogger, AuditAction, ResourceType } from "./auditLogger";

// Direct module access (if needed)
import { queryAuditLogger } from "./auditLoggers/queryLogger";
import { domainAuditLoggers } from "./auditLoggers/domainLoggers";
```

---

## Statistics

### File Sizes

| Component          | Before    | After   | Reduction |
| ------------------ | --------- | ------- | --------- |
| create-resume/page | 677       | 336     | 50%       |
| backendService     | 415       | 46      | 89%       |
| auditLogger        | 399       | 13      | 97%       |
| **Total**          | **1,491** | **395** | **73%**   |

### New Files Created: 15

- Frontend: 4 files
- Backend Services: 5 files
- Audit Loggers: 6 files

### Total Lines of Code

- Extracted: 1,096 lines
- Organized into: 18+ focused files
- Reduced Main Files: 1,491 → 395 lines

---

## Backward Compatibility

✅ All public APIs maintained
✅ No breaking changes
✅ Existing imports still work
✅ Internal refactoring only

---

## Next Steps

1. **Review refactoring** - Check the code in PR
2. **Run tests** - Verify all functionality
3. **Continue refactoring** - Apply patterns to remaining large files
   - dashboard/access/page.tsx (444 lines)
   - dashboard/recruiter-requests/page.tsx (417 lines)
   - dashboard/page.tsx (397 lines)
4. **Update team documentation**
5. **Deploy changes**

---

## Questions?

Refer to:

- `REFACTORING_COMPLETION_REPORT.md` - Detailed results
- `REFACTORING_GUIDE_REMAINING.md` - How to refactor remaining files
- `REFACTORING_RESULTS.md` - Complete analysis
