# Draft → Publish Architecture & AI Search Implementation

## Overview

This document describes the implementation of the two-collection resume lifecycle model and AI-powered semantic search for SwitchCV.

## Architecture Summary

### Data Flow

```
User creates resume → drafts/{alphanumericId} (NOT searchable)
                           ↓ [Publish]
                      resumes/{numericId} → Vector Embedding generated
                                              ↓
                      Recruiter searches: "Java lead with cloud experience"
                                              ↓
                      AI finds best matches from resumes collection
                                              ↓ [User clicks Edit]
                      drafts/{newAlphanumericId} (resume marked "being edited")
                                              ↓ [Publish again]
                      resumes/{sameNumericId} (updated content)
```

### Collections

| Collection       | ID Format              | Access      | Purpose                       |
| :--------------- | :--------------------- | :---------- | :---------------------------- |
| `drafts`         | Alphanumeric (8 chars) | Owner only  | Work-in-progress resumes      |
| `resumes`        | Numeric (1-99999999)   | Public read | Published, searchable resumes |
| `draftIdMapping` | Alphanumeric           | Server only | Draft ID uniqueness tracking  |
| `searchQuotas`   | userId                 | Server only | AI search quota tracking      |

## Files Created/Modified

### New Files

1. **`src/lib/draftIdGenerator.ts`**

   - `generateUniqueDraftId()` - Creates 8-char alphanumeric IDs
   - `reserveDraftId()` - Reserves ID in Firestore
   - `releaseDraftId()` - Releases ID when draft deleted/published
   - `getDraftIdMapping()` - Retrieves mapping info

2. **`src/lib/services/draftService.ts`**

   - `createDraft()` - Creates new draft (enforces one-draft-at-a-time)
   - `getDraft()` - Retrieves draft with ownership verification
   - `getUserActiveDraft()` - Gets user's current draft
   - `updateDraft()` - Updates draft content
   - `deleteDraft()` - Deletes draft and releases ID

3. **`functions/src/indexResumeService.ts`**

   - `indexResumeOnWrite` - Firestore trigger for embedding generation
   - `reindexResume` - Manual reindexing callable function
   - `generateSearchProfile()` - Creates searchable text from resume
   - `generateEmbedding()` - Calls Gemini text-embedding-004

4. **`functions/src/searchResumeService.ts`**

   - `searchResumesAI` - Main search callable function
   - `getSearchQuota` - Returns remaining quota for user
   - `checkAndDecrementQuota()` - Manages monthly quotas
   - `cosineSimilarity()` - Vector similarity calculation

5. **`src/app/drafts/[draftId]/page.tsx`**

   - Draft preview page for owners
   - Edit, delete, and publish actions
   - Protected route (owner-only access)

6. **`src/app/api/drafts/[draftId]/route.ts`**

   - GET - Fetch draft content
   - PATCH - Update draft profile
   - DELETE - Delete draft and release ID

7. **`scripts/backfill-resume-embeddings.js`**

   - Generates embeddings for existing published resumes
   - Supports dry-run mode, batch size, and limit options
   - Rate-limited to avoid API quota issues

8. **`src/components/search/SmartSearch.tsx`**

   - AI-powered search UI for premium recruiters
   - Shows quota remaining, handles errors gracefully
   - Displays match scores and skill tags

9. **`src/app/api/search/ai/route.ts`**
   - API wrapper for searchResumesAI Cloud Function
   - Handles authentication and error mapping

### Modified Files

1. **`src/config/constants.ts`**

   - Added `DRAFT_CONFIG` - Draft ID settings
   - Added `AI_SEARCH` - Search configuration
   - Added `RESUME_STATES` - Lifecycle state constants

2. **`src/types/index.ts`**

   - Added `DraftResume` interface
   - Added `PublishedResume` interface
   - Removed `published` field from `ResumeProfile`

3. **`src/lib/services/resumeService.ts`**

   - Added `publishDraft()` - Atomic draft → resume migration
   - Added `unpublishResume()` - Resume → draft for editing
   - Added `getPublishedResume()` - Fetch by numeric ID
   - Added `getResumeEditingStatus()` - Check if being edited

4. **`firestore.rules`**

   - Added `drafts` collection rules (owner-only)
   - Added `draftIdMapping` rules (server-only)
   - Added `searchQuotas` rules (server-only)

5. **`firestore.indexes.json`**

   - Added index for `drafts` collection
   - Added index for `resumes` collection
   - Added index for `searchQuotas` collection

6. **`functions/src/index.ts`**

   - Exported new AI search functions

7. **`src/app/resumes/[id]/page.tsx`**

   - Added `EditingInProgressBanner` component
   - Shows "being edited" banner for non-owners

8. **`src/app/api/resumes/[id]/route.ts`**
   - Returns `isBeingEdited` status in all responses

## Configuration

### Constants (`src/config/constants.ts`)

```typescript
DRAFT_CONFIG = {
  ID_LENGTH: 8,
  ID_CHARSET: "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789",
  COLLECTION: "drafts",
  ID_MAPPING_COLLECTION: "draftIdMapping",
  MAX_ID_RETRIES: 5,
};

AI_SEARCH = {
  EMBEDDING_MODEL: "text-embedding-004",
  VECTOR_DIMENSION: 768,
  MAX_RESULTS: 10,
  MIN_SIMILARITY_SCORE: 0.5,
  PREMIUM_MONTHLY_QUOTA: 50,
  ENTERPRISE_MONTHLY_QUOTA: 999999,
  QUOTA_COLLECTION: "searchQuotas",
};
```

## Usage Examples

### Creating a Draft

```typescript
import { createDraft } from "@/lib/services/draftService";

const draft = await createDraft(userId, resumeProfile);
// Returns: { draftId: "d7xK9mP2", userId, profile, ... }
```

### Publishing a Draft

```typescript
import { publishDraft } from "@/lib/services/resumeService";

const published = await publishDraft(draftId, userId);
// Returns: { resumeId: 12345678, profile, ... }
// Embedding generated automatically by Cloud Function
```

### Unpublishing for Edit

```typescript
import { unpublishResume } from "@/lib/services/resumeService";

const draft = await unpublishResume(resumeId, userId);
// Returns new draft, original resume marked as "being edited"
```

### AI Search (Client)

```typescript
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const searchResumes = httpsCallable(functions, "searchResumesAI");

const result = await searchResumes({
  query: "Java lead with AWS and microservices experience",
  filters: { location: "London" },
  limit: 10,
});
// Returns: { results: [...], quotaRemaining: 49 }
```

## Security

1. **Drafts**: Only owner can read/write
2. **Published Resumes**: Anyone can read, only owner can modify
3. **AI Search**: Premium/Enterprise recruiters only
4. **Quotas**: Server-managed, cannot be modified by clients

## Next Steps

1. ~~**Frontend Routes**: Create `/drafts/[draftId]` and update `/resumes/[resumeId]`~~ ✅ DONE
2. ~~**Backfill Script**: Generate embeddings for existing published resumes~~ ✅ DONE
3. ~~**UI Components**: Add "Smart Search" interface for recruiters~~ ✅ DONE
4. **Testing**: Add integration tests for lifecycle operations

## Completed Implementation

### Frontend Routes (✅ Done)

- `src/app/drafts/[draftId]/page.tsx` - Draft preview page
- `src/app/api/drafts/[draftId]/route.ts` - Draft API (GET, PATCH, DELETE)
- Updated `src/app/resumes/[id]/page.tsx` - Shows "being edited" banner
- Updated `src/app/api/resumes/[id]/route.ts` - Returns `isBeingEdited` status

### Backfill Script (✅ Done)

- `scripts/backfill-resume-embeddings.js` - Generates embeddings for existing resumes
- Usage: `node scripts/backfill-resume-embeddings.js [--dry-run] [--batch=25] [--limit=100]`

### Smart Search UI (✅ Done)

- `src/components/search/SmartSearch.tsx` - AI-powered search component for premium users
- `src/app/api/search/ai/route.ts` - API route that calls Cloud Function

## Cost Considerations

- **Embedding Generation**: ~$0.00001 per resume (one-time on publish)
- **Search Queries**: ~$0.00001 per query
- **Firestore Reads**: Vector search requires fetching all indexed resumes
  - Consider Pinecone/Weaviate for 10k+ resumes
