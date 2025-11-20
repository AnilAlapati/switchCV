# Resume Deletion Permission Fix - November 16, 2025

## Problem

The resume deletion was failing with:

```
❌ Failed to delete resume: 7 PERMISSION_DENIED: Missing or insufficient permissions.
```

## Root Cause

The deletion was being attempted through a Next.js API route that used the client-side Firebase SDK without proper authentication context. API routes don't have the user's authentication context that Firestore security rules require.

## Solution Implemented

**Moved deletion logic from API route back to the client component** with proper Firebase SDK authentication.

### Key Changes:

1. **ResumeStatusCard.tsx** (`src/components/dashboard/ResumeStatusCard.tsx`)

   - Now handles deletion directly using Firebase SDK's `deleteDoc()`
   - Has proper authentication context (user is logged in)
   - Firestore security rules are satisfied since the authenticated user is making the request
   - Still verifies ownership before deletion for extra safety

2. **Removed deprecated API route**

   - Deleted `/src/app/api/resumes/delete/route.ts` (no longer needed)
   - Removed failed attempts to use Admin SDK in Next.js API routes

3. **Improved deletion flow**:
   - Resolves numeric ID to document ID if needed
   - Gets resume document to verify ownership and extract numeric ID
   - Deletes using authenticated Firebase SDK
   - Recycles numeric ID back to the pool using `addDeletedIdToPool()`

## How It Works Now

1. User clicks "Delete" button → confirmation dialog appears
2. On confirmation, client-side deletion:
   - Verifies user is logged in
   - Finds the actual Firestore document ID (if numeric ID was provided)
   - Retrieves resume to verify user owns it
   - Deletes the document (has auth context, so passes security rules)
   - Recycles the numeric ID for reuse
   - Reloads page to reflect changes

## Firestore Security Rules

The rules allow deletion when:

```
allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
```

This now works because the client has proper Firebase authentication context.

## Testing

The deletion should now work properly:

1. Dashboard loads and shows resume
2. Click "Delete" button
3. Confirm deletion in dialog
4. Page reloads and shows "Resume Status: Not Created"

No errors should appear in the console or UI.
