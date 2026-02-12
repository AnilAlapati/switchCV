# Role Change Fix — Permanent Documentation

**Date:** February 12, 2026  
**Status:** Fixed (3rd recurrence)  
**Severity:** HIGH — User-facing bug, role appears unchanged after toggle

---

## The Bug

When a user changes their account type (jobseeker ↔ recruiter) on `/profile/settings`, the UI shows "Account type updated!" but the role **does not actually change**. On page refresh, the old role is still displayed.

## Why It Keeps Recurring

This bug has occurred **3 times** because of a fundamental architectural split in the codebase:

### Two Endpoints, One Job

| Endpoint                     | What It Updates                                | Used By                          |
| ---------------------------- | ---------------------------------------------- | -------------------------------- |
| `PUT /api/user/settings`     | Firestore only (`role` + `isRecruiter` fields) | `/profile/settings` page         |
| `POST /api/user/update-role` | Firestore **AND** Firebase Auth custom claims  | Legacy `UserProfileSettings.tsx` |

**The problem:** Changing `role` in Firestore is necessary but **not sufficient**. The user's auth token (JWT) carries `role` as a custom claim. If custom claims aren't updated, every server-side `getAuthenticatedUserId()` call still sees the **old** role. The client also caches this token for up to 1 hour.

### Why It Appears Fixed But Isn't

1. The UI optimistically updates → user sees "success"
2. Firestore is updated → if you check Firestore in the console, the data looks correct
3. But the auth token still says the old role → server-side checks reject the new role
4. `useUserSettings` re-fetches from `/api/user/settings` which reads Firestore (correct) but SWR may race with the optimistic update
5. On page refresh, auth middleware reads the **token** (stale) not Firestore

### Why Developers Keep Reintroducing It

The `/api/user/settings` endpoint is the "obvious" choice for saving settings. It handles display name, company name, notifications, privacy — AND it accepts `isRecruiter`. A developer naturally puts all settings updates through one endpoint. But role changes need **more** than just a Firestore write.

---

## The Fix (Applied Feb 12, 2026)

### Layer 1: Frontend — Use the correct endpoint

**File:** `src/app/profile/settings/page.tsx` → `handleRecruiterToggle()`

Changed from:

```
PUT /api/user/settings { userId, isRecruiter, companyName }
```

To:

```
POST /api/user/update-role { uid, newRole, companyName }
```

Plus:

- `await user.getIdToken(true)` — forces token refresh to pick up new custom claims
- `window.location.reload()` after 1.5s — ensures all components re-render with new role

### Layer 2: Backend — Defense in depth

**File:** `src/app/api/user/settings/route.ts` → `PUT` handler

Even though the frontend now uses `/api/user/update-role`, the settings endpoint **also** updates custom claims when `isRecruiter` changes. This prevents the bug from recurring if any other code path calls this endpoint.

### Layer 3: Tests

**File:** `src/app/api/user/settings/route.test.ts`

Added 3 new tests:

- `should NOT call setCustomClaims when isRecruiter is not provided` — partial settings updates don't touch claims
- `should update custom claims when switching to jobseeker` — verifies claims set on role change
- `should still succeed if custom claims update fails` — graceful degradation

---

## How to Prevent This From Recurring Again

### Rule: ALL role changes MUST go through `/api/user/update-role`

The `/api/user/settings` endpoint should **never** be the primary path for role changes. Its custom claims update is a safety net, not the intended flow.

### Checklist for Any Future Settings/Role Work

- [ ] Does the code change `isRecruiter` or `role`? → Use `/api/user/update-role`
- [ ] After a role change, does the client call `user.getIdToken(true)`? → Required
- [ ] After a role change, does the page reload? → Required (or at minimum, all SWR caches must be invalidated)
- [ ] Is `setCustomClaims()` called in the backend? → Required

### Architecture Diagram

```
User clicks "Recruiter" toggle
  ↓
Frontend: POST /api/user/update-role
  ↓
Backend: Update Firestore (role + isRecruiter + roleUpdatedAt)
  ↓
Backend: setCustomClaims(uid, { role: newRole })  ← THIS IS THE CRITICAL STEP
  ↓
Frontend: user.getIdToken(true)  ← Forces token refresh
  ↓
Frontend: window.location.reload()  ← Re-renders everything with new role
```

### What NOT to Do

```
❌ PUT /api/user/settings with { isRecruiter: true }  ← Don't use for role changes
❌ Only update Firestore without custom claims         ← Token will be stale
❌ Skip token refresh after role change                ← Client sees old role
❌ Use optimistic update without page reload           ← Race conditions
```

---

## Files Modified in This Fix

| File                                      | Change                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| `src/app/profile/settings/page.tsx`       | `handleRecruiterToggle` → uses `/api/user/update-role`, adds token refresh + reload   |
| `src/app/api/user/settings/route.ts`      | PUT handler → adds `setCustomClaims()` as defense-in-depth when `isRecruiter` changes |
| `src/app/api/user/settings/route.test.ts` | Added 3 tests for custom claims behavior on role update                               |
| `docs/ROLE_CHANGE_FIX.md`                 | This document                                                                         |

## Related Files (Do Not Modify Without Reading This Doc)

- `src/app/api/user/update-role/route.ts` — The canonical role change endpoint
- `src/components/dashboard/UserProfileSettings.tsx` — Legacy component (already correct)
- `src/hooks/useUserSettings.ts` — SWR hook for settings
- `src/lib/services/userService.ts` — Has `userRoleCache` with 5-min TTL
- `src/lib/dal/auth.ts` — `setCustomClaims()` wrapper
- `docs/archive/ROLE_SELECTION_FIX.md` — Previous fix documentation (same root cause)
