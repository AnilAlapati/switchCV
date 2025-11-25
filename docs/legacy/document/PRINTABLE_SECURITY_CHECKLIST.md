# ✅ PRINTABLE SECURITY FIX CHECKLIST

**Project**: SwitchCV  
**Date Started**: ******\_\_\_\_******  
**Date Completed**: ******\_\_\_\_******

---

## 📋 CHECKLIST - Print This Page

### PHASE 1: Assess & Start (Today - 30 mins)

**Step 1: Check Git History**

```
TASK: Verify keys not in Git history
TIME: 5 minutes
COMMAND: git log --follow -- .env.local

☐ Run command
☐ Review output
☐ Expected: "fatal: no path .env.local" OR no commits shown
☐ If unexpected: Go to APPENDIX A

Status: _______________
Notes: _______________
```

**Step 2: Document Current Keys**

```
TASK: Record which keys to delete (for reference)
TIME: 2 minutes

☐ Firebase: AIzaSyDxPBYfgCyaPThLlUPG_IEqOHRDe0Ci6vI
☐ Gemini:   AIzaSyDWEg83gh4zt7D1pXK4jpr_BGj_5lx35I0
☐ HugFace:  ***REMOVED***

Status: _______________
```

---

### PHASE 2: Rotate Keys (Today - 1 hour)

**Step 3: Rotate Firebase API Key**

```
TASK: Get new Firebase API Key
TIME: 15-20 minutes
GUIDE: See API_KEY_ROTATION_GUIDE.md

☐ Go to https://console.firebase.google.com
☐ Select: switchcv-e5136
☐ Go to: Settings > Service Accounts
☐ Delete: Old key (AIzaSyDxPBYfgCyaPThLlUPG_IEqOHRDe0Ci6vI)
☐ Create: New key
☐ Copy: Save new key temporarily

New Key: ____________________________________
Status: _______________
Notes: _______________
```

**Step 4: Rotate Gemini API Key**

```
TASK: Get new Gemini API Key
TIME: 15-20 minutes
GUIDE: See API_KEY_ROTATION_GUIDE.md

☐ Go to https://aistudio.google.com/apikey
☐ Delete: Old key (AIzaSyDWEg83gh4zt7D1pXK4jpr_BGj_5lx35I0)
☐ Create: New key
☐ Select project: switchcv-e5136
☐ Copy: Save new key temporarily
☐ (Optional) Set domain restrictions

New Key: ____________________________________
Status: _______________
Notes: _______________
```

**Step 5: Rotate HuggingFace Token**

```
TASK: Get new HuggingFace token
TIME: 15-20 minutes
GUIDE: See API_KEY_ROTATION_GUIDE.md

☐ Go to https://huggingface.co/settings/tokens
☐ Delete: Old token (***REMOVED***)
☐ Create: New token
☐ Name: SwitchCV App
☐ Type: Read
☐ Copy: Save new token temporarily

New Token: ____________________________________
Status: _______________
Notes: _______________
```

**MILESTONE 1 ✅**

```
☐ All 3 keys rotated
☐ Old keys deleted from provider dashboards
☐ New keys saved

READY FOR: Phase 2 (Update & Test)
```

---

### PHASE 2: Update & Test (Tomorrow Morning - 40 mins)

**Step 6: Update .env.local**

```
TASK: Replace keys in .env.local
TIME: 5 minutes

☐ Open: .env.local
☐ Update: NEXT_PUBLIC_FIREBASE_API_KEY=<NEW_FIREBASE_KEY>
☐ Update: GEMINI_API_KEY=<NEW_GEMINI_KEY>
☐ Update: NEXT_PUBLIC_GEMINI_API_KEY=<NEW_GEMINI_KEY>
☐ Update: HUGGINGFACE_TOKEN=<NEW_HUGGINGFACE_TOKEN>
☐ Update: NEXT_PUBLIC_HUGGINGFACE_TOKEN=<NEW_HUGGINGFACE_TOKEN>
☐ Save file
☐ DO NOT COMMIT

Status: _______________
Notes: _______________
```

**Step 7: Test Application**

```
TASK: Verify app works with new keys
TIME: 10-15 minutes
COMMAND: npm run dev

☐ Run: npm run dev
☐ Wait for: "Ready in X seconds"
☐ Open: http://localhost:3000
☐ Test: Login page works
☐ Test: Can sign in
☐ Test: Dashboard loads
☐ Test: Features work
☐ Check: Open DevTools (F12)
☐ Check: No red errors
☐ Check: No API key warnings
☐ Stop: Press Ctrl+C

Status: _______________
Notes: _______________
```

**Step 8: Verify Old Keys Deleted**

```
TASK: Confirm keys no longer exist
TIME: 10 minutes

Firebase Dashboard:
☐ Go to: console.firebase.google.com
☐ Project: switchcv-e5136
☐ Settings > Service Accounts
☐ Verify: OLD key gone
☐ Verify: NEW key present

Gemini Dashboard:
☐ Go to: aistudio.google.com/apikey
☐ Verify: OLD key (AIzaSyDWEg...) gone
☐ Verify: NEW key present

HuggingFace Dashboard:
☐ Go to: huggingface.co/settings/tokens
☐ Verify: OLD token (hf_TjSOJQT...) gone
☐ Verify: NEW token present

Status: _______________
Notes: _______________
```

**MILESTONE 2 ✅**

```
☐ .env.local updated with new keys
☐ Application tested
☐ No errors found
☐ Old keys verified deleted

READY FOR: Phase 3 (Deployment)
```

---

### PHASE 3: Deploy (Tomorrow Afternoon - 50 mins)

**Step 9: Deploy Code**

```
TASK: Push and deploy application
TIME: 15-20 minutes

Push Code:
☐ Command: git push origin feature/Nov_15
☐ Wait for: Push successful

Deployment Platform:
☐ Log in to: [Vercel / Firebase / AWS / ___________]
☐ Set variable: NEXT_PUBLIC_FIREBASE_API_KEY=<NEW>
☐ Set variable: GEMINI_API_KEY=<NEW>
☐ Set variable: NEXT_PUBLIC_GEMINI_API_KEY=<NEW>
☐ Set variable: HUGGINGFACE_TOKEN=<NEW>
☐ Set variable: NEXT_PUBLIC_HUGGINGFACE_TOKEN=<NEW>
☐ Deploy application
☐ Wait for: "Deployment successful"
☐ Verify: App loads at https://yourdomain.com

Status: _______________
Notes: _______________
```

**Step 10: Deploy Firestore Rules**

```
TASK: Deploy updated security rules
TIME: 5-10 minutes

Requirements:
☐ Firebase CLI installed (firebase --version)

Deploy:
☐ Command: firebase deploy --only firestore:rules
☐ Wait for: "Firestore rules published"
☐ Verify: firebase firestore:describe rules

Status: _______________
Notes: _______________
```

**Step 11: Monitor & Verify**

```
TASK: Ensure production is working
TIME: 20-30 minutes

Monitoring:
☐ Check: Firebase Console > Logs
☐ Check: Deployment platform logs
☐ Check: Error tracking service (if enabled)
☐ Wait: 10+ minutes watching for errors

Testing in Production:
☐ Go to: https://yourdomain.com
☐ Test: Login works
☐ Test: Can create resume (if applicable)
☐ Test: Search works (if applicable)
☐ Check: DevTools console clean
☐ Check: No 401/403 errors

Status: _______________
Notes: _______________

If issues found:
☐ Rollback to previous version
☐ Debug issue
☐ Retest locally
☐ Redeploy
```

**MILESTONE 3 ✅**

```
☐ Code deployed to production
☐ Firestore rules deployed
☐ All new keys active
☐ No errors in production
☐ All features tested

SECURITY FIX COMPLETE ✅
```

---

## 🚨 APPENDIX A: If Keys Found in Git History

```
SITUATION: git log showed commits with .env.local
SEVERITY: High - Keys are in git history

TASK: Clean git history
TIME: 15 minutes

Steps:
☐ Install tool: pip install git-filter-repo
☐ Run: git filter-repo --path .env.local --invert-paths
☐ Force push: git push --force origin feature/Nov_15
☐ Verify: git log -p | grep -i "AIzaSy\|hf_" | wc -l
  Expected result: 0

WARNING: This rewrites history. If others work on this branch,
they'll need to re-clone.

Status: _______________
Notes: _______________
```

---

## 📊 FINAL STATUS

### All Tasks Complete?

Phase 1: Assess & Rotate

- ☐ Git history checked
- ☐ Firebase key rotated
- ☐ Gemini key rotated
- ☐ HuggingFace token rotated
- ☐ Old keys verified deleted

Phase 2: Update & Test

- ☐ .env.local updated
- ☐ Application tested
- ☐ No errors found
- ☐ All features working

Phase 3: Deploy

- ☐ Code deployed
- ☐ Firestore rules deployed
- ☐ Environment variables set
- ☐ Production verified working
- ☐ No errors in logs

### Project Status

```
Date Started:    ____________________
Date Completed:  ____________________
Total Time:      ____________________
Issues Found:    ☐ None ☐ Minor ☐ Major
Status:          ☐ Complete ☐ Incomplete
```

### Sign-Off

Developer: ************\_************ Date: **\_\_\_**

Manager: ************\_************ Date: **\_\_\_**

---

## 📚 Documentation Reference

For detailed information, see:

| Need            | Document                       |
| --------------- | ------------------------------ |
| Quick overview  | `QUICK_START_ACTION_ITEMS.md`  |
| Detailed steps  | `IMMEDIATE_ACTION_REQUIRED.md` |
| Key rotation    | `API_KEY_ROTATION_GUIDE.md`    |
| Timeline        | `ACTION_TIMELINE.md`           |
| Vulnerabilities | `SECURITY_AUDIT_REPORT.md`     |
| Code patterns   | `SECURE_CODE_PATTERNS.md`      |

---

## ✅ COMPLETION CONFIRMATION

When all items are checked:

**SECURITY FIX IS COMPLETE**

Your application is now:

- ✅ Authenticated (API checks requests)
- ✅ Authorized (users can only access their data)
- ✅ Secure (no exposed keys)
- ✅ Compliant (follows security best practices)
- ✅ Production-ready

Congratulations on securing your application!

---

**Print this checklist and work through it systematically for best results.**
