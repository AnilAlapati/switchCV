# System Collection Setup - Complete Guide

## What is the System Collection?

The `system` collection in Firestore is used to store **global application state** that the system needs to manage. For SwitchCV, it contains:

- **`system/resumeIdCounter`** - A counter document that tracks the next available resume ID

## Why You Don't See It Yet

The `system/resumeIdCounter` document is **created on-demand** the first time a resume is generated. Until then, Firestore doesn't create empty collections.

## How to Create It Now

### Option 1: Use the Browser Console (Easiest)

1. Go to your Firestore Console: https://console.firebase.google.com/project/switchcv-e5136/firestore
2. Create a new collection named `system`
3. Add a document with:
   - **Document ID**: `resumeIdCounter`
   - **Fields**:
     ```json
     {
       "currentId": 0,
       "createdAt": "2025-11-16T...",
       "description": "Global counter for numeric resume IDs"
     }
     ```

### Option 2: Create via API Endpoint (Requires Authentication)

The `/api/admin/init-system` endpoint is available but requires user authentication. To use it:

```bash
# Make sure you're logged in first
curl -X POST http://localhost:3000/api/admin/init-system
```

### Option 3: Create via CLI Script (Recommended)

If you have Firebase service account key:

```bash
# First, download your service account key from:
# Firebase Console → Project Settings → Service Accounts → Generate New Private Key
# Save it as: firebase-service-account.json in the project root

node scripts/init-system.js
```

Output:

```
🔧 Initializing System Collection...
✅ System initialized successfully!
📍 Location: system/resumeIdCounter
📊 Initial counter: 0
📌 Next resume ID will be: 1
```

## What Happens When You Create a Resume

1. **First Time**: If `system/resumeIdCounter` doesn't exist, it's created automatically
2. **ID Generation**: The counter increments by 1
3. **Resume Saved**: New resume gets the ID (1, 2, 3, ...)
4. **Firestore**: Document appears at `system/resumeIdCounter` with `currentId: 1`

## Verifying It Works

### Check Firestore Console

After creating the first resume:

- Go to: Firestore Console
- Look for collection: `system`
- Document: `resumeIdCounter`
- Field: `currentId` (should be 1 or higher)

### Check via API

```bash
curl http://localhost:3000/api/admin/init-system
```

Response:

```json
{
  "success": true,
  "counter": {
    "currentId": 1,
    "message": "1 IDs used, next ID will be 2"
  },
  "nextResumeId": 2
}
```

## The Complete Flow

```
First Resume Creation:
│
├─ App calls: generateNumericResumeId()
│
├─ System checks: Does system/resumeIdCounter exist?
│  └─ NO → Create it with currentId: 0
│
├─ Atomic increment: currentId += 1 → returns 1
│
├─ Save resume with numericId: 1
│
└─ Result:
   ✅ Resume #1 created
   ✅ system/resumeIdCounter visible in Firestore
   ✅ Next resume will be #2

Second Resume:
│
├─ App calls: generateNumericResumeId()
│
├─ System checks: system/resumeIdCounter exists? YES
│
├─ Atomic increment: currentId (1) += 1 → returns 2
│
└─ Result:
   ✅ Resume #2 created
   ✅ system/resumeIdCounter.currentId = 2
```

## Security Considerations

The `system` collection write permission requires authentication (see `firestore.rules`):

```
match /system/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth != null;
}
```

**For Production**: Consider restricting writes to Cloud Functions only by changing the rule to:

```
allow write: if false; // Only Cloud Functions can write
```

## Firestore Security Rules

The rules were updated to support the system collection:

```firestore
match /system/{document=**} {
  allow read: if request.auth != null;  // Authenticated users can read
  allow write: if request.auth != null; // Authenticated users can write
}
```

**Status**: ✅ Deployed to your Firebase project

## Troubleshooting

### "Missing or insufficient permissions" Error

**Solution**: Make sure you're authenticated when accessing `/api/admin/init-system`

### System collection not appearing

**Solution**: Create the first resume, it will appear automatically

### Counter keeps resetting

**Solution**: Check that `currentId` field is a number, not a string

## Summary

| Item            | Status               | Location                 |
| --------------- | -------------------- | ------------------------ |
| Counter Created | After first resume   | `system/resumeIdCounter` |
| Rule Updated    | ✅ Deployed          | `firestore.rules`        |
| API Endpoint    | ✅ Available         | `/api/admin/init-system` |
| ID Generation   | ✅ Working           | Starts from 1            |
| Next Resume ID  | After you create one | Will be 1                |

---

**Need Help?**

- Create a resume and watch the system collection appear automatically
- Or manually create `system/resumeIdCounter` with `currentId: 0` in Firestore Console
- Both approaches work perfectly!
