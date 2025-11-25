# 🧪 Testing Guide: Numeric Resume ID System

**Status:** ✅ Code Pushed to `feature/Nov_15` branch  
**Date:** November 16, 2025  
**Feature:** Numeric Resume ID System with Firestore Atomic Operations

---

## 📋 Table of Contents

1. [Pre-Testing Setup](#pre-testing-setup)
2. [Local Testing Steps](#local-testing-steps)
3. [Manual Testing Scenarios](#manual-testing-scenarios)
4. [Firestore Setup](#firestore-setup)
5. [Performance Testing](#performance-testing)
6. [Verification Checklist](#verification-checklist)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Pre-Testing Setup

### Step 1: Pull the Latest Code

```bash
cd /Users/anilalapati/Documents/Apps/SwitchCV_V2
git fetch origin
git checkout feature/Nov_15
git pull origin feature/Nov_15
```

### Step 2: Verify Environment Configuration

✅ **Already Configured in `.env.local`:**

```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_FIREBASE_PROJECT_ID=switchcv-e5136
# All other Firebase variables are set
```

No changes needed - everything is ready for local testing.

### Step 3: Install Dependencies (if needed)

```bash
npm install
```

### Step 4: Verify Build Compiles

```bash
npm run build
```

All TypeScript should compile without errors.

---

## 🏃 Local Testing Steps

### Phase 1: Start Development Server

```bash
npm run dev
```

You should see:

```
▲ Next.js 15.0.3
- Local:        http://localhost:3000
- Environments: .env.local
```

### Phase 2: Initialize Firestore Counter

**Option A: Automatic Initialization (Recommended)**

The counter will auto-initialize on first resume creation. However, you can initialize it manually:

**Option B: Manual Initialization via Firestore Console**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select Project: `switchcv-e5136`
3. Navigate to: **Firestore Database** → **Collections**
4. Click **Start Collection**
5. Collection ID: `system` → Document ID: `resumeIdCounter`
6. Add these fields:
   ```json
   {
     "currentId": 0,
     "lastResetAt": "<current-timestamp>",
     "createdAt": "<current-timestamp>"
   }
   ```

---

## 🧪 Manual Testing Scenarios

### Scenario 1: Create a Resume with Numeric ID

**What to Test:** Verify that new resumes generate numeric IDs automatically

#### Steps:

1. Navigate to: `http://localhost:3000/create-resume`
2. Fill in the resume form with sample data:
   - Name: "Test User"
   - Email: "test@example.com"
   - Title: "Software Engineer"
   - Summary: "Test resume for numeric ID feature"
3. Click **Create Resume**

#### Expected Result:

✅ Resume created successfully  
✅ Numeric ID generated (should be: `1`, `2`, `3`, etc.)  
✅ Resume saved to Firestore with `numericId` field  
✅ Browser redirects to resume page

#### Where to Find:

- Firestore: Collections → `resumeProfiles` → Check for `numericId` field
- Browser: Should redirect to URL like `/resumes/1`

---

### Scenario 2: View Resume with Numeric ID

**What to Test:** Verify that numeric URLs work correctly

#### Steps:

1. From the previous resume creation, note the numeric ID (e.g., `1`)
2. Navigate to: `http://localhost:3000/resumes/1`

#### Expected Result:

✅ Resume loads successfully  
✅ All resume data displays correctly  
✅ Share button shows the numeric URL  
✅ No errors in browser console

---

### Scenario 3: Verify Backward Compatibility (Old Slug URLs)

**What to Test:** Old resume URLs with slugs should still work

#### Steps:

1. Find an old resume in Firestore with a `slug` field
2. Navigate to its old URL pattern: `http://localhost:3000/resume/[slug-value]`

#### Expected Result:

✅ Old resume still loads  
✅ Displays correctly  
✅ Browser shows the old URL format  
✅ No errors

---

### Scenario 4: Check Dashboard Shows Numeric ID

**What to Test:** Dashboard displays numeric ID in resume card

#### Steps:

1. Navigate to: `http://localhost:3000/dashboard`
2. Look at the "Resume Status Card" section

#### Expected Result:

✅ Shows "View Resume" button  
✅ Button links to: `http://localhost:3000/resumes/[numeric-id]`  
✅ No hardcoded `switchcv.com` domain visible  
✅ Uses localhost URL for development

---

### Scenario 5: Test Environment-Aware URLs

**What to Test:** Verify URLs use localhost in development

#### Steps:

1. Open Developer Tools (F12)
2. Go to Console tab
3. Create a new resume or view dashboard
4. Check Network tab for API calls and redirects

#### Expected Result:

✅ All URLs use `http://localhost:3000`  
✅ No references to `https://switchcv.com`  
✅ No hardcoded domains in HTML attributes  
✅ All links are environment-aware

---

## 📊 Performance Testing

### Run Load Test

```bash
node test-id-generator.js
```

### Expected Output:

```
╔════════════════════════════════════════════╗
║    NUMERIC RESUME ID LOAD TEST RESULTS     ║
╚════════════════════════════════════════════╝

✅ SMALL LOAD (100 requests)
   Collision Detection: 0 collisions ✅
   Rate: 20,863 IDs/sec
   Time: 4.79ms

✅ MEDIUM LOAD (1,000 requests)
   Collision Detection: 0 collisions ✅
   Rate: 119,804 IDs/sec
   Time: 8.35ms

✅ LARGE LOAD (10,000 requests)
   Collision Detection: 0 collisions ✅
   Rate: 441,358 IDs/sec
   Time: 22.66ms

✅ STRESS LOAD (100,000 requests)
   Collision Detection: 0 collisions ✅
   Rate: 767,256 IDs/sec
   Time: 130.33ms

SUMMARY
─────────────────────────────────────
Total IDs Generated: 1,111,100
Collisions Found: 0
Average Rate: 668,745 IDs/sec
Status: ✅ PASSED
```

---

## 🔧 Firestore Setup

### Step 1: Verify Counter Document

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select Project: `switchcv-e5136`
3. Navigate to **Firestore Database**
4. Find collection: `system`
5. Document: `resumeIdCounter`
6. Should show:
   ```
   currentId: 0 (or higher if you've created resumes)
   lastResetAt: <timestamp>
   createdAt: <timestamp>
   ```

### Step 2: Create Composite Index (Optional but Recommended)

For production deployment, create this index:

1. Go to Firestore Console → **Indexes** tab
2. Click **Create Index**
3. Collection: `resumeProfiles`
4. Field 1: `numericId` (Ascending)
5. Field 2: `published` (Ascending)
6. Click **Create**

**Note:** Firestore will suggest this automatically when you run a query.

### Step 3: Verify Resume Documents

Check a few resume documents in `resumeProfiles` collection:

```json
{
  "userId": "user-123",
  "name": "Test User",
  "email": "test@example.com",
  "numericId": 1,           // NEW FIELD ✅
  "slug": "test-user-abc",  // Still present for backward compatibility
  "published": true,
  "createdAt": <timestamp>,
  "updatedAt": <timestamp>
}
```

---

## ✅ Verification Checklist

### Code Changes Verification

- [ ] Pull code from `feature/Nov_15` branch
- [ ] No merge conflicts
- [ ] All files compile without TypeScript errors

### Environment Setup

- [ ] `.env.local` has `NEXT_PUBLIC_BASE_URL=http://localhost:3000`
- [ ] Firebase credentials are correct
- [ ] All environment variables set

### Firestore Setup

- [ ] `system/resumeIdCounter` document exists
- [ ] `currentId` is initialized to 0 (or higher)
- [ ] Can read from Firestore Console

### Manual Testing

- [ ] Create new resume → generates numeric ID ✅
- [ ] View resume with `/resumes/[id]` → works ✅
- [ ] Dashboard shows numeric URL ✅
- [ ] Old slug URLs still work (backward compatible) ✅
- [ ] URLs use localhost (not hardcoded domain) ✅

### Performance Testing

- [ ] Run `node test-id-generator.js`
- [ ] All 5 test scenarios pass
- [ ] Zero collisions in all tests
- [ ] Average rate ≥ 600K IDs/sec

### Browser Testing

- [ ] No console errors
- [ ] No network errors
- [ ] All API calls successful
- [ ] Page loads quickly

---

## 🛠️ Troubleshooting

### Issue 1: "Cannot find module '@/lib/numericIdGenerator'"

**Solution:**

```bash
npm run build
npm run dev
```

Clear TypeScript cache and rebuild.

---

### Issue 2: Firestore Counter Document Not Found

**Solution:**

Manually create it in Firestore Console:

1. Go to Firestore
2. Click **+ Start Collection**
3. Collection ID: `system`
4. Document ID: `resumeIdCounter`
5. Add fields:
   ```
   currentId: 0 (number)
   lastResetAt: (timestamp)
   createdAt: (timestamp)
   ```

Or add this code to your app startup:

```typescript
import { initializeIdCounter } from "@/lib/numericIdGenerator";

// In your root component or _app.tsx
useEffect(() => {
  initializeIdCounter();
}, []);
```

---

### Issue 3: Numeric ID Always Returns 1

**Solution:**

Check if counter is properly incremented:

```bash
# View counter value in Firestore Console
# Collection: system
# Document: resumeIdCounter
# Field: currentId (should increment after each resume creation)
```

If stuck at 0:

1. Delete the document
2. Create a new one with `currentId: 0`
3. Try creating a resume again

---

### Issue 4: URLs Still Show `switchcv.com`

**Solution:**

Make sure `src/lib/config.ts` is imported correctly:

```typescript
import { getResumeUrl } from "@/lib/config";

// Use this instead of hardcoding:
const url = getResumeUrl(numericId);
```

Check all modified files for hardcoded domains.

---

### Issue 5: Old Slug URLs Return 404

**Solution:**

This is expected for new resumes (they only have numeric IDs).

But old resumes should still work. Verify in `src/app/resume/[slug]/page.tsx`:

```typescript
// This regex should detect numeric IDs
const isNumeric = /^\d+$/.test(slug);
```

If old resumes don't work, check the `slug` field exists in Firestore.

---

## 📱 Testing on Different Devices

### Desktop (Recommended)

```bash
npm run dev
# Open http://localhost:3000 in browser
```

### Mobile (Same Network)

1. Find your machine's IP:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

2. On phone, navigate to:

```
http://[YOUR-IP]:3000
```

---

## 📊 After Successful Testing

Once all tests pass, you can:

### 1. Create a Pull Request

```bash
git push origin feature/Nov_15
# Go to GitHub and create PR
# Add testing evidence
```

### 2. Code Review

- Link to this testing guide
- Share load test results
- Include before/after screenshots

### 3. Merge & Deploy

Follow `DEPLOYMENT_CHECKLIST.md` for production deployment.

---

## 📚 Related Documentation

- **Full Guide:** `documents/NUMERIC_ID_SYSTEM.md`
- **Quick Reference:** `documents/NUMERIC_ID_QUICK_REFERENCE.md`
- **Architecture:** `documents/NUMERIC_ID_ARCHITECTURE_DIAGRAMS.md`
- **Deployment:** `DEPLOYMENT_CHECKLIST.md`
- **Implementation:** `NUMERIC_ID_IMPLEMENTATION_SUMMARY.md`

---

## 🎯 Success Criteria

You'll know testing is complete when:

✅ All 5 manual test scenarios pass  
✅ Load test shows 0 collisions  
✅ URLs use localhost (not hardcoded domain)  
✅ No TypeScript errors  
✅ Browser console has no errors  
✅ Firestore documents have `numericId` field  
✅ Old slug URLs still work

---

## 🤝 Need Help?

If you encounter issues:

1. Check `TROUBLESHOOTING` section above
2. Review the relevant documentation file
3. Check browser console (F12) for errors
4. Check Firestore Console for data integrity
5. Run `npm run build` to catch any compilation errors

---

**Happy Testing! 🚀**

When ready to deploy, follow: `DEPLOYMENT_CHECKLIST.md`
