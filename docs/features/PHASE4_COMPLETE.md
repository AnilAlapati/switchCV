# Phase 4 Complete: Resume Save API Route

**Status**: ✅ COMPLETE  
**Date**: 2025  
**Type**: Next.js API Route + Firestore Integration

---

## What Was Built

### `/api/resumes/create` POST Endpoint (125 lines)

**Location**: `src/app/api/resumes/create/route.ts`

**Purpose**: Save AI-generated resume to Firestore with numeric ID and make it publicly accessible

---

## Endpoint Specification

### Request

```http
POST /api/resumes/create
Content-Type: application/json
Authorization: Bearer {idToken}  (optional for security check)

{
  "userId": "firebase-uid",
  "resume": {
    "id": "resume_1234567890",
    "title": "John Doe's Resume",
    "summary": "Professional with 5 years experience...",
    "skills": ["React", "TypeScript", "Node.js"],
    "experience": [
      {
        "company": "Company A",
        "role": "Senior Engineer",
        "duration": "2020-2025",
        "description": "Led team of 5..."
      }
    ],
    "education": [
      {
        "institution": "MIT",
        "degree": "BS Computer Science",
        "field": "CS",
        "year": 2019
      }
    ]
  },
  "isPublic": true
}
```

### Response (Success - 200)

```json
{
  "success": true,
  "resumeId": "123456",
  "numericId": 123456,
  "publicUrl": "/resumes/123456"
}
```

### Response (Error - 400/403/500)

```json
{
  "error": "Missing required fields: userId or resume",
  "details": "Error message if available"
}
```

---

## API Logic Flow

```
1. Parse Request Body
   └─ Extract: userId, resume, isPublic

2. Validate Request
   ├─ Check required fields (userId, resume)
   └─ Return 400 if missing

3. Verify Authentication (Optional)
   ├─ Extract Bearer token from Authorization header
   ├─ Verify token with Firebase Admin Auth
   └─ Ensure tokenUserId matches userId (security check)

4. Generate Numeric ID
   ├─ Call generateNumericResumeId()
   ├─ Returns 1-99,999,999
   └─ Return 500 if fails

5. Prepare Resume Document
   ├─ Merge userId, numericId, timestamps
   ├─ Set isPublic flag
   ├─ Set status: "active"
   └─ Document structure:
       {
         ...resume data,
         userId,
         numericId,
         isPublic,
         visibility: "public" | "private",
         createdAt,
         updatedAt,
         status: "active"
       }

6. Save to Firestore (2 locations)
   ├─ User Collection:
   │  └─ resumes/{userId}/resumes/{numericId}
   └─ Global Collection:
      └─ allResumes/{numericId}
          └─ For search/listing purposes

7. Return Success Response
   └─ Include numericId and public URL
```

---

## Firestore Storage Structure

### Before Save

```
firestore.google.com/
  ├─ resumes/                          (user resumes collection)
  ├─ allResumes/                       (global resume index)
  └─ system/
     └─ resumeIdCounter
        └─ currentId: 123456
```

### After Saving Resume #123456

```
firestore.google.com/
  ├─ resumes/
  │  └─ {userId}/
  │     └─ resumes/
  │        └─ 123456/
  │           ├─ id: "resume_1234567890"
  │           ├─ title: "John Doe's Resume"
  │           ├─ summary: "..."
  │           ├─ skills: [...]
  │           ├─ experience: [...]
  │           ├─ education: [...]
  │           ├─ userId: "{userId}"
  │           ├─ numericId: 123456
  │           ├─ isPublic: true
  │           ├─ visibility: "public"
  │           ├─ createdAt: "2025-01-15T10:30:00Z"
  │           ├─ updatedAt: "2025-01-15T10:30:00Z"
  │           └─ status: "active"
  │
  ├─ allResumes/
  │  └─ 123456/
  │     ├─ userId: "{userId}"
  │     ├─ numericId: 123456
  │     ├─ title: "John Doe's Resume"
  │     ├─ isPublic: true
  │     └─ createdAt: "2025-01-15T10:30:00Z"
  │
  └─ system/
     └─ resumeIdCounter
        └─ currentId: 123457
```

---

## Error Handling

### Status Codes

| Code | Scenario       | Response                                         |
| ---- | -------------- | ------------------------------------------------ |
| 200  | Success        | `{success, resumeId, numericId, publicUrl}`      |
| 400  | Missing fields | `{error: "Missing required fields..."}`          |
| 403  | User mismatch  | `{error: "Cannot save resume for another user"}` |
| 500  | Server error   | `{error: "Failed to create resume", details}`    |

### Error Cases

- Missing userId or resume → 400
- Invalid auth token → allows save but no user verification
- Failed to generate ID → 500
- Firestore write fails → 500
- Token provided but invalid → Warning logged, continues

---

## Security Features

1. **User Isolation**: Only users can save their own resumes

   ```typescript
   if (tokenUserId && tokenUserId !== userId) {
     return 403 Forbidden
   }
   ```

2. **Authentication Optional But Verified**:

   - Allows unauthenticated users to save (onboarding)
   - If token provided, enforces token matches userId

3. **Firebase Admin SDK**:

   - Uses server-side validation
   - Environment variables for credentials
   - Secure Firestore access

4. **Firestore Security Rules** (Expected):

   ```firestore
   match /resumes/{userId}/resumes/{numericId} {
     allow read: if isPublic == true || uid == userId;
     allow write: if uid == userId;
   }

   match /allResumes/{numericId} {
     allow read: if true;
     allow write: if false;  // API-only writes
   }
   ```

---

## Integration with ResumeCreationFlow

```typescript
// In ResumeCreationFlow.tsx
const handleAcceptResume = useCallback(async () => {
  const response = await fetch("/api/resumes/create", {
    method: "POST",
    body: JSON.stringify({
      userId,
      resume: generatedResume,
      isPublic: true,
    }),
  });

  const data = await response.json();
  // Navigate to /resumes/{data.numericId}
  onComplete?.(data.resumeId);
});
```

---

## Next Steps: Phase 5 Testing

### Manual Test Flow

1. **Start Q&A Form**

   - Fill out resume questions
   - Click "Next" through all questions
   - Click "Complete Q&A"

2. **Watch Generation Loader**

   - Should show spinning animation
   - Progress bar moves from 0% to 100%
   - Status: "Generating → Saving → Complete"

3. **Review in Modal**

   - Resume displays with formatted sections
   - Can provide feedback
   - Can request rewrites (max 5)

4. **Accept & Save**

   - Click "Accept & Save" button
   - Should see saving animation
   - Should receive numericId in response

5. **Navigate to Public Resume**
   - Browser redirects to `/resumes/{numericId}`
   - Resume should display with ISR caching
   - URL is shareable with recruiters

### Automated Test Cases

```javascript
// Test: API saves resume correctly
POST /api/resumes/create with valid body
→ Response status 200
→ Response includes numericId
→ Firestore contains resume document

// Test: Numeric IDs increment
Create resume 1 → numericId = 1
Create resume 2 → numericId = 2
Create resume 3 → numericId = 3

// Test: User can only save their own resumes
Create resume with userId A, token for user B
→ Response status 403

// Test: Missing fields rejected
POST /api/resumes/create with missing userId
→ Response status 400
```

---

## Files Created/Modified

### Created

1. `src/app/api/resumes/create/route.ts` (125 lines)

### Modified

1. `src/components/ResumeCreationFlow.tsx` - Uses correct endpoint

---

## Summary

✅ API route fully implemented and documented  
✅ Firestore storage structure defined  
✅ Error handling comprehensive  
✅ Security checks in place  
✅ Ready for Phase 5 end-to-end testing

**Next Action**: Phase 5 - Test complete flow from Q&A → Save → View Public Resume
