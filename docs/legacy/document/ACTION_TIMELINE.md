# 📅 Security Fix Action Timeline

**Visual guide for when to do each action**

---

## Timeline Overview

```
TODAY                    TOMORROW                  48 HOURS FROM NOW
┌────────────────┐     ┌────────────────┐       ┌────────────────┐
│   ASSESS       │     │   UPDATE       │       │    DEPLOY      │
│   &            │────▶│   &            │────▶  │    &           │
│   START        │     │   TEST         │       │    VERIFY      │
│   ROTATE       │     │                │       │                │
└────────────────┘     └────────────────┘       └────────────────┘
   30 mins-1 hour      1-2 hours                 30 mins-1 hour
```

---

## TODAY (NEXT 2 HOURS)

### ⏰ Right Now (5 minutes)

```
TASK: Check if keys are in Git history
STATUS: CRITICAL - Do immediately

Command:
  git log --follow -- .env.local

Expected Result:
  "fatal: no path .env.local" (GOOD - keys not in history)

If you see commits:
  Keys ARE in history (BAD - will need cleanup)
  See: IMMEDIATE_ACTION_REQUIRED.md → "If Keys Found in Git History"

Document:
  ✓ Make note of current exposed keys (for reference)
  ✓ Know what you're looking for in provider dashboards
```

**STATUS**: ✅ 5 mins ✓

---

### 🔐 0-30 minutes: Start Firebase API Key Rotation

```
TASK: Rotate Firebase API Key
STATUS: HIGH - Do this first

Steps:
  1. Go to: https://console.firebase.google.com/
  2. Select project: switchcv-e5136
  3. Go to: Project Settings (gear icon)
  4. Click: Service Accounts tab
  5. Find: Web API Key (old: AIzaSyDxPBYfgCyaPThLlUPG_IEqOHRDe0Ci6vI)
  6. Delete the old key
  7. Click: Create new API Key
  8. Copy new key

Save it:
  Keep in temporary location (you'll add to .env.local later)

Reference:
  Full steps: API_KEY_ROTATION_GUIDE.md → Firebase API Key section

Timeline:
  ⏱ 15-20 minutes
```

**PROGRESS**: ✅ 15-20 mins elapsed

---

### 🔑 30-50 minutes: Rotate Gemini API Key

```
TASK: Rotate Gemini API Key
STATUS: HIGH - Do second

Steps:
  1. Go to: https://aistudio.google.com/apikey
  2. Find: Old key (AIzaSyDWEg83gh4zt7D1pXK4jpr_BGj_5lx35I0)
  3. Click: Delete button (trash icon)
  4. Click: Create API Key
  5. Select project: switchcv-e5136
  6. Copy new key

Save it:
  Keep in temporary location

Optional (Recommended):
  Restrict to your domain
  See: API_KEY_ROTATION_GUIDE.md → Restrict to Domain section

Reference:
  Full steps: API_KEY_ROTATION_GUIDE.md → Gemini API Key section

Timeline:
  ⏱ 15-20 minutes
```

**PROGRESS**: ✅ 30-40 mins elapsed

---

### 🤖 50-60 minutes: Start HuggingFace Token Rotation

```
TASK: Rotate HuggingFace Token
STATUS: HIGH - Do third

Steps:
  1. Go to: https://huggingface.co/settings/tokens
  2. Find: Old token (***REMOVED***)
  3. Click: Delete (trash icon)
  4. Click: New token
  5. Name: "SwitchCV App"
  6. Type: Read (or Write if fine-tuning)
  7. Copy new token

Save it:
  Keep in temporary location

Reference:
  Full steps: API_KEY_ROTATION_GUIDE.md → HuggingFace Token section

Timeline:
  ⏱ 15-20 minutes
```

**PROGRESS**: ✅ 50-60 mins elapsed

---

## MILESTONE 1: All Keys Rotated ✅

```
✓ Firebase API Key rotated
✓ Gemini API Key rotated
✓ HuggingFace Token rotated
✓ Old keys deleted from provider dashboards

NEXT: Update .env.local and test
```

---

## TOMORROW (NEXT 24 HOURS)

### 📝 Morning: Update .env.local

```
TASK: Update your .env.local file with new keys
STATUS: HIGH - Must do before testing

Steps:
  1. Open: .env.local
  2. Update these 5 lines:

     NEXT_PUBLIC_FIREBASE_API_KEY=<NEW_FIREBASE_KEY>
     GEMINI_API_KEY=<NEW_GEMINI_KEY>
     NEXT_PUBLIC_GEMINI_API_KEY=<NEW_GEMINI_KEY>
     HUGGINGFACE_TOKEN=<NEW_HUGGINGFACE_TOKEN>
     NEXT_PUBLIC_HUGGINGFACE_TOKEN=<NEW_HUGGINGFACE_TOKEN>

  3. Save file
  4. DO NOT COMMIT THIS FILE

Timeline:
  ⏱ 5 minutes
```

**PROGRESS**: ✅ 5 mins

---

### 🧪 Mid-Morning: Test Application

```
TASK: Verify app works with new keys
STATUS: MEDIUM - Critical for catching errors

Steps:
  1. Start dev server:
     npm run dev

  2. Wait for: "Ready in X seconds"

  3. Open: http://localhost:3000

  4. Test features:
     ✓ Login page loads
     ✓ Can sign in
     ✓ Dashboard loads
     ✓ Resume creation works (uses Gemini)
     ✓ No 401/403 errors
     ✓ No API key errors

  5. Check console (F12):
     ✓ No red errors
     ✓ No warnings about auth

  6. Stop server: Ctrl+C

Timeline:
  ⏱ 10-15 minutes

If errors:
  ✓ Check .env.local has correct keys
  ✓ Check no typos in new keys
  ✓ Restart: npm run dev
  ✓ Clear browser cache: Ctrl+Shift+Delete
```

**PROGRESS**: ✅ 15-20 mins

---

### ✅ Afternoon: Verify Old Keys Deleted

```
TASK: Confirm old keys are gone from provider dashboards
STATUS: MEDIUM - Safety verification

Check Firebase:
  1. Go to: console.firebase.google.com
  2. Project: switchcv-e5136
  3. Settings > Service Accounts
  4. Check: OLD key is GONE
  5. Check: NEW key exists

Check Gemini:
  1. Go to: aistudio.google.com/apikey
  2. Check: OLD key (AIzaSyDWEg83...) is GONE
  3. Check: NEW key exists

Check HuggingFace:
  1. Go to: huggingface.co/settings/tokens
  2. Check: OLD token (hf_TjSOJQTY...) is GONE
  3. Check: NEW token exists

Timeline:
  ⏱ 10 minutes
```

**PROGRESS**: ✅ 10 mins

---

### 🚀 Evening: Prepare for Deployment

```
TASK: Get ready to deploy tomorrow
STATUS: MEDIUM - Prep work

Steps:
  1. Ensure all keys rotated: ✓
  2. Test app locally: ✓
  3. Review deployment checklist:
     See: IMMEDIATE_ACTION_REQUIRED.md → Deployment section
  4. Get access to deployment platform:
     - Vercel, Firebase Hosting, etc.
     - Need to set environment variables
  5. Prepare new key values in secure location

Timeline:
  ⏱ 10 minutes
```

**PROGRESS**: ✅ 10 mins

---

## MILESTONE 2: Keys Updated and Tested ✅

```
✓ .env.local updated with new keys
✓ Application tested with new keys
✓ All features working
✓ No errors in console
✓ Old keys verified deleted
✓ Ready for deployment
```

---

## 48 HOURS FROM NOW (DAY 2)

### ⚡ Morning: Deploy Code

```
TASK: Push code and deploy to production
STATUS: CRITICAL - Do this without delay

Steps:
  1. Push code:
     git push origin feature/Nov_15

  2. Go to deployment platform:
     (Vercel, Firebase Hosting, AWS, etc.)

  3. Set environment variables:
     NEXT_PUBLIC_FIREBASE_API_KEY=<NEW_KEY>
     GEMINI_API_KEY=<NEW_KEY>
     NEXT_PUBLIC_GEMINI_API_KEY=<NEW_KEY>
     HUGGINGFACE_TOKEN=<NEW_TOKEN>
     NEXT_PUBLIC_HUGGINGFACE_TOKEN=<NEW_TOKEN>

  4. Deploy application

  5. Wait for: "Deployment successful"

Timeline:
  ⏱ 15-20 minutes

Verify:
  - Go to: https://yourdomain.com
  - Test key features work
  - Check: No errors in browser console
```

**PROGRESS**: ✅ 15-20 mins

---

### 🔐 Mid-Morning: Deploy Firestore Rules

```
TASK: Deploy updated security rules
STATUS: HIGH - Critical for access control

Steps:
  1. Have Firebase CLI installed: firebase --version

  2. Deploy rules:
     firebase deploy --only firestore:rules

  3. Wait for: "Firestore rules published"

  4. Verify:
     firebase firestore:describe rules
     Should show system collection is restricted

Timeline:
  ⏱ 5-10 minutes
```

**PROGRESS**: ✅ 5-10 mins

---

### 📊 Afternoon: Monitor and Verify

```
TASK: Ensure everything works in production
STATUS: MEDIUM - Critical for catching issues

Steps:
  1. Monitor for errors:
     - Check Firebase Console → Logs
     - Check deployment platform logs
     - Check error tracking service (if enabled)

  2. Test in production:
     - Go to: https://yourdomain.com
     - Log in
     - Create resume (if applicable)
     - Search (if applicable)
     - Check browser console: No errors

  3. Monitor for 1 hour:
     - Watch logs
     - No unusual activity
     - No failed API calls

  4. If issues:
     - Rollback to previous version
     - Debug issue
     - Fix and redeploy

Timeline:
  ⏱ 20-30 minutes
```

**PROGRESS**: ✅ 20-30 mins

---

## FINAL MILESTONE: Secure Deployment Complete ✅

```
✅ Code deployed
✅ Firestore rules updated
✅ All new keys active
✅ Old keys deleted
✅ All features tested
✅ No errors in production
✅ Application secure
```

---

## Complete Timeline Summary

```
DAY 1 (TODAY)
├─ 00:00 - Check Git history (5 mins)
├─ 00:05 - Rotate Firebase key (20 mins)
├─ 00:25 - Rotate Gemini key (20 mins)
├─ 00:45 - Rotate HuggingFace token (20 mins)
└─ 01:05 - DONE: All keys rotated ✅

DAY 2 (TOMORROW)
├─ 09:00 - Update .env.local (5 mins)
├─ 09:05 - Test application (15 mins)
├─ 09:20 - Verify keys deleted (10 mins)
├─ 09:30 - Prepare for deployment (10 mins)
├─ 15:00 - Deploy code (15 mins)
├─ 15:15 - Deploy Firestore rules (10 mins)
├─ 15:25 - Monitor and verify (30 mins)
└─ 16:00 - DONE: Securely deployed ✅

TOTAL TIME: ~2.5 hours spread over 2 days
```

---

## What If...

### "I can't rotate keys today"

Do it tomorrow, but ASAP. Each day increases risk.

### "I can't deploy tomorrow"

Deploy within 48 hours. Security fixes need to be live.

### "Something breaks during test"

Don't deploy. Rollback to previous version and debug.

### "I get an API error after deploying"

Check that environment variables are set correctly.
Restart the application.
Check logs in deployment platform.

### "Keys are in Git history"

See: IMMEDIATE_ACTION_REQUIRED.md → "If Keys Found in Git History"
Takes 15 mins to clean.

---

## Progress Tracking

Copy this and update as you go:

```
PHASE 1: Key Rotation (Today)
- [ ] Check Git history
- [ ] Rotate Firebase key
- [ ] Rotate Gemini key
- [ ] Rotate HuggingFace token
Timeline: 1 hour

PHASE 2: Update & Test (Tomorrow morning)
- [ ] Update .env.local
- [ ] Test application
- [ ] Verify old keys deleted
Timeline: 40 mins

PHASE 3: Deployment (Tomorrow afternoon)
- [ ] Deploy code
- [ ] Deploy Firestore rules
- [ ] Monitor for errors
Timeline: 50 mins

TOTAL: 2.5 hours over 2 days
```

---

## Key Reminders

```
🔐 SECURITY
├─ Don't commit .env.local
├─ Don't share API keys
├─ Delete old keys from dashboards
└─ Monitor after deployment

⚡ SPEED
├─ Do Phase 1 today (1 hour)
├─ Do Phase 2 tomorrow (40 mins)
├─ Do Phase 3 tomorrow (50 mins)
└─ Total: 2.5 hours

✅ VERIFICATION
├─ Test app with new keys
├─ Verify old keys deleted
├─ Monitor in production
└─ No errors = success
```

---

**Follow this timeline and you'll be secure in 48 hours!**
