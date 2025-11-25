# Resume Creation & Display Issues - Troubleshooting Guide

## Problem Summary

- User created a resume through the AI conversation flow
- Application redirected to `/resume/a-anil-i8ys4p` (shareable public resume page)
- Got "missing permissions error"
- Then "site cannot be reached"

## Root Cause Analysis

### Potential Issues:

#### 1. **Firestore Permissions** (Most Likely)

The public resume page tries to query `resumeProfiles` collection:

```typescript
// src/app/resume/[slug]/page.tsx
const resumesRef = collection(db, "resumeProfiles");
const q = query(resumesRef, where("slug", "==", id));
const querySnapshot = await getDocs(q);
```

**Current Firestore Rules:**

```
match /resumeProfiles/{profileId} {
  allow read: if (request.auth != null && request.auth.uid == resource.data.userId) || resource.data.published == true;
  allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
  allow update: if request.auth != null && request.auth.uid == resource.data.userId;
  allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
}
```

**Problem:** The rules allow read access ONLY if:

- User is authenticated AND owns the resume, OR
- The resume has `published == true`

But the query might fail if:

- The document doesn't exist yet
- The document was saved but `published` flag is missing
- There's a security rule evaluation issue

#### 2. **Document Not Saved to Firestore**

The create-resume page saves to Firestore:

```typescript
const docRef = await addDoc(collection(db, "resumeProfiles"), {
  ...resumeProfile,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
```

The `resumeProfile` object might be missing the `published: true` field or have other issues.

#### 3. **Slug Generation Issue**

The slug might not be matching between save and query:

- Generated slug during save: `a-anil-i8ys4p`
- Query searching for: `a-anil-i8ys4p`
- They must match exactly

#### 4. **Server vs Client Rendering**

The public resume view now lives in `src/app/resume/[slug]/page.tsx` as a **server component**. Rendering on the server (with `revalidate = 60`) avoids client-side auth races while still enforcing the `published` flag and visibility metadata.

## Solutions to Try

### Solution 1: Check Browser Console

1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for errors like:
   - "Missing or insufficient permissions"
   - "Failed to load resume"
   - Network errors

### Solution 2: Verify Firestore Data

1. Open Firebase Console
2. Go to Firestore Database
3. Check `resumeProfiles` collection:
   - Does the document exist?
   - Does it have `published: true`?
   - Check the `slug` field matches

### Solution 3: Fix Firestore Rules

Update `firestore.rules` to allow unauthenticated reads for published resumes:

```
match /resumeProfiles/{profileId} {
  allow read: if resource.data.published == true;
  allow read: if request.auth != null && request.auth.uid == resource.data.userId;
  allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
  allow update: if request.auth != null && request.auth.uid == resource.data.userId;
  allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
}
```

### Solution 4: Improve Server Diagnostics

The server component in `src/app/resume/[slug]/page.tsx` already enforces `where("published", "==", true)` and surfaces simple request-only placeholders rather than raw Firestore errors. Check the console for the request-only badge output if placeholders appear when the resume exists but some fields remain masked.

### Solution 5: Server Rendering Is Active

The server-side route (`src/app/resume/[slug]/page.tsx`) already satisfies this. It fetches the published resume on the server, returns `notFound()` when the slug disappears, and renders placeholder messaging when data is masked/request-only instead of hitting the client.

## Quick Fixes to Apply

### Option A: Update Firestore Rules (Recommended)

```bash
firebase deploy --only firestore:rules
```

### Option B: Check the Saved Data

```bash
firebase firestore:inspect resumeProfiles
```

### Option C: Debug in Browser Console

```javascript
// In browser console, check if auth is initialized
import { auth } from "@/lib/firebase";
console.log("Current user:", auth.currentUser);

// Try querying manually
import { getDocs, query, where, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

const q = query(
  collection(db, "resumeProfiles"),
  where("slug", "==", "a-anil-i8ys4p")
);
const snap = await getDocs(q);
console.log("Found", snap.docs.length, "resumes");
```

## Next Steps

1. ✅ Check browser console for exact error message
2. ✅ Verify document exists in Firestore with correct `published` field
3. ✅ Update Firestore rules to allow public read access
4. ✅ Add better error logging
5. ✅ Test the public resume URL after fixes
