# System Collection Architecture Diagram

## Current State (Before First Resume)

```
┌─────────────────────────────────────────────────────────┐
│                    Firestore Console                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Collections:                                           │
│  ├─ resumeProfiles                                      │
│  │  └─ (your resumes here)                              │
│  │                                                      │
│  ├─ users                                               │
│  │  └─ (user data)                                      │
│  │                                                      │
│  ├─ notifications                                       │
│  │  └─ (notifications)                                  │
│  │                                                      │
│  └─ ❌ system (MISSING - will appear on first resume)    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## After First Resume (Automatically Created)

```
┌─────────────────────────────────────────────────────────┐
│                    Firestore Console                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Collections:                                           │
│  ├─ resumeProfiles                                      │
│  │  └─ doc123 (Resume #1 - ID: 1)                       │
│  │  └─ doc456 (Resume #2 - ID: 2)                       │
│  │                                                      │
│  ├─ users                                               │
│  │  └─ (user data)                                      │
│  │                                                      │
│  ├─ notifications                                       │
│  │  └─ (notifications)                                  │
│  │                                                      │
│  └─ ✅ system (CREATED! Now visible)                     │
│     └─ resumeIdCounter                                 │
│        ├─ currentId: 2                                 │
│        ├─ createdAt: 2025-11-16T...                    │
│        └─ description: "Global counter for IDs"        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## ID Generation Flow

```
                    Resume Creation Flow
                           │
                           ▼
              ┌────────────────────────┐
              │ generateNumericResumeId()
              └────────┬───────────────┘
                       │
                       ▼
          ┌─────────────────────────┐
          │ Check: system/resumeId  │
          │ Counter exists?         │
          └──┬──────────────────┬───┘
             │                  │
          YES│                  │NO
             │                  │
             │                  ▼
             │         ┌────────────────────┐
             │         │ Create counter:    │
             │         │ currentId: 0       │
             │         └────────┬───────────┘
             │                  │
             └──────────┬───────┘
                        │
                        ▼
          ┌──────────────────────────────┐
          │ Atomic Operation:            │
          │ currentId += 1               │
          │ (thread-safe, no collisions) │
          └──────────┬───────────────────┘
                     │
                     ▼
          ┌──────────────────────────────┐
          │ Return New Resume ID         │
          │ Resume #1 → ID: 1            │
          │ Resume #2 → ID: 2            │
          │ Resume #N → ID: N            │
          └──────────┬───────────────────┘
                     │
                     ▼
          ┌──────────────────────────────┐
          │ Save Resume with ID          │
          │ Resume stored in DB ✅        │
          └──────────────────────────────┘
```

## Multi-User Scenario (Atomic Safety)

```
         Timeline of Events with 3 Simultaneous Users

Time    User A                User B                User C
──────────────────────────────────────────────────────────
T1      Read counter (0)      Read counter (0)      Read counter (0)
        │                     │                     │
T2      Request ID            Request ID            Request ID
        │                     │                     │
T3      Atomic Inc ──────────►Atomic Inc ──────────►Atomic Inc
        │                     │                     │
T4      ✅ Get ID: 1          ✅ Get ID: 2          ✅ Get ID: 3
        │                     │                     │
T5      Resume #1 saved       Resume #2 saved       Resume #3 saved
        ID: 1                 ID: 2                 ID: 3

Result: ✅ No Collisions! Sequential IDs Guaranteed!
        (Firestore atomic operation ensures this)
```

## System Collection Structure

```
Firestore Database
    │
    └─ system (collection)
        │
        └─ resumeIdCounter (document)
            │
            ├─ currentId: number
            │  └─ Atomic counter (increments with each resume)
            │
            ├─ createdAt: timestamp
            │  └─ When the counter was created
            │
            ├─ lastResetAt: timestamp
            │  └─ When counter was last reset (admin only)
            │
            └─ description: string
               └─ "Global counter for numeric resume IDs"
```

## Automatic Creation Sequence

```
Step 1: User Creates Resume
        │
        └─► POST /api/create-resume
            │
            └─► buildResumeProfile()
                │
                └─► generateNumericResumeId()
                    │
                    ├─ Check: Does system/resumeIdCounter exist?
                    │
                    ├─ If NO:
                    │   │
                    │   └─► initializeIdCounter()
                    │       │
                    │       └─► Creates system/resumeIdCounter
                    │           with currentId: 0
                    │
                    ├─ Atomic Operation:
                    │   │
                    │   └─► increment(currentId, 1)
                    │       Returns: 1 (for first resume)
                    │
                    └─► Resume saved with numericId: 1
                        │
                        └─► Firestore now has system collection! ✨

Step 2: system/resumeIdCounter appears in Console
        │
        └─► Visible at Firestore Console
            └─► Collections → system → resumeIdCounter
                └─► currentId: 1
```

## Firestore Rules Structure

```
Firestore Security Rules
├─ /users/{userId}
│  └─ Allow: authenticated user reads/writes own data
│
├─ /resumeProfiles/{profileId}
│  ├─ Read: published resumes (public) OR own resumes (authenticated)
│  ├─ Create: authenticated users only
│  └─ Update/Delete: owner only
│
├─ /system/{document=**}  ← NEW! Added to support ID counter
│  ├─ Read: authenticated users
│  └─ Write: authenticated users
│     (Can be restricted to Cloud Functions only in production)
│
└─ /notifications/{userId}/{document=**}
   └─ Allow: authenticated user reads/writes own notifications
```

## Deployment Status

```
┌──────────────────────────────────────────────┐
│         Firestore Rules Deployment           │
├──────────────────────────────────────────────┤
│                                              │
│  File: firestore.rules                       │
│  Status: ✅ DEPLOYED                         │
│  Changes: Added system collection rules      │
│  Date: 2025-11-16                            │
│                                              │
│  New Rule:                                   │
│  ┌──────────────────────────────────────┐   │
│  │ match /system/{document=**} {        │   │
│  │   allow read: if auth != null;       │   │
│  │   allow write: if auth != null;      │   │
│  │ }                                    │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  Result: ✅ System collection writable       │
│           ✅ ID generator can create counter │
│           ✅ Automatic initialization works  │
│                                              │
└──────────────────────────────────────────────┘
```

## Quick Reference Diagram

```
         Your App's Data Structure

Firestore (Cloud Database)
├─ Collections (organized data)
│  │
│  ├─ resumeProfiles (where resumes are stored)
│  │  ├─ Resume #1 (numericId: 1)
│  │  ├─ Resume #2 (numericId: 2)
│  │  └─ Resume #3 (numericId: 3)
│  │
│  ├─ system (system-level config)
│  │  └─ resumeIdCounter (ID counter)
│  │     └─ currentId: 3 (how many resumes created)
│  │
│  ├─ users (user data)
│  │  └─ (authentication & profiles)
│  │
│  └─ notifications (user notifications)
│     └─ (notifications sent to users)
│
Next Resume ID = system/resumeIdCounter.currentId + 1
               = 3 + 1
               = 4
```

## Summary

```
BEFORE FIRST RESUME       AFTER FIRST RESUME
─────────────────────     ──────────────────
resumeProfiles  ✓         resumeProfiles  ✓
  (empty)                   Resume #1 ✓

users           ✓         users           ✓
notifications   ✓         notifications   ✓
system          ✗         system          ✓
  (missing)                  resumeIdCounter ✓
                              currentId: 1 ✓
```

---

**Key Insight**: The system collection is created **on-demand** when the first resume is generated. This is a common pattern called "lazy initialization" and is completely normal! ✨
