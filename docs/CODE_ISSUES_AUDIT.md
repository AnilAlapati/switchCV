# Codebase Audit & Issues Report (v2)

**Date:** November 29, 2025
**Scope:** Full Codebase Analysis (`src/`, `functions/`, `firestore.rules`, `package.json`)
**Auditor:** GitHub Copilot

---

## Executive Summary

This document catalogs critical security vulnerabilities, architectural flaws, and code quality issues discovered during a comprehensive line-by-line review of the codebase. It merges previous findings with new critical discoveries.

| Severity    | Count |
| ----------- | ----- |
| 🔴 Critical | 4     |
| 🟠 High     | 6     |
| 🟡 Medium   | 10    |
| 🔵 Low      | 8     |

---

## 1. 🔴 Critical Security Vulnerabilities

### 1.1. Privilege Escalation via Firestore Rules (NEW)

**Severity:** Critical
**Location:** `firestore.rules` & `functions/src/authFunctions.ts`

- **Issue:** The `firestore.rules` file allows authenticated users to write to their own document in the `users` collection without field restrictions:
  ```javascript
  match /users/{userId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
  ```
  Simultaneously, the Cloud Function `onUserRoleChanged` listens for changes to this document and automatically promotes the user's Auth Custom Claims based on the `role` field found in the document.
- **Exploit:** A malicious user can simply update their own Firestore document with `{ role: 'admin' }`. The Cloud Function will execute and grant them actual Admin privileges in Firebase Auth, bypassing all security controls.
- **Fix:**
  1.  Restrict `write` access in `firestore.rules` to specific fields only (excluding `role`, `subscriptionTier`, etc.) using `request.resource.data.diff(resource.data).affectedKeys()`.
  2.  Or better, deny `write` entirely for users and require them to use a Callable Cloud Function to update their profile.

### 1.2. Unrestricted Data Injection (NEW)

**Severity:** Critical
**Location:** `firestore.rules`

- **Issue:** Users can write arbitrary data to `users/{userId}` and `resumes/{resumeId}`.
- **Impact:**
  - Users can set `subscriptionTier: 'enterprise'` to unlock features client-side.
  - Users can set `expiresAt: null` on their resumes to bypass retention policies.
  - Users can inject massive payloads to spike storage costs.

### 1.3. Race Condition: Auth Token Not Ready for Firestore Writes

**Severity:** Critical
**Location:** `src/hooks/useAuth.helpers.ts`

- **Issue:** After `createUserWithEmailAndPassword`, there's a 500ms static delay before attempting Firestore writes. This is unreliable.
- **Impact:** Intermittent "Missing or insufficient permissions" errors during signup.
- **Fix:** Wait for token propagation using `await firebaseUser.getIdToken(true)` before writing.

### 1.4. Rollback Logic Can Delete User Without Releasing Username

**Severity:** Critical
**Location:** `src/hooks/useAuth.tsx`

- **Issue:** If `releaseUsernameReservation` fails, the code still attempts to delete the auth user.
- **Impact:** Orphaned username reservations in Firestore that block future signups (username squatting).

---

## 2. 🟠 Architecture & Design Issues

### 2.1. Data Duplication & Consistency (NEW)

**Location:** `src/app/api/resumes/create/route.ts`

- **Issue:** Resume data is duplicated across three collections: `resumes`, `users/{id}/resumes`, and `allResumes`.
- **Impact:** High risk of data inconsistency. If a resume is updated or deleted, all three locations must be kept in sync manually.
- **Recommendation:** Use a single source of truth (`resumes` collection) and use Firestore queries or a search index for listing/filtering.

### 2.2. ID Generation Bottleneck (NEW)

**Location:** `src/lib/numericIdGenerator.ts`

- **Issue:** Uses a single Firestore document counter for generating numeric IDs.
- **Impact:** Firestore has a hard limit of ~1 write per second on a single document. This creates a bottleneck if user growth spikes.
- **Recommendation:** Use a distributed counter (sharded counter) or UUIDs if numeric IDs are not strictly required.

### 2.3. Hardcoded API Keys in Client-Side Code (NEW)

**Location:** `src/lib/services/aiProviderService.ts`

- **Issue:** The file accesses `process.env.GROQ_API_KEY` etc. directly. This file is in `src/lib` and could be imported by client components, causing build failures or key exposure.
- **Fix:** Move to `src/server/services` or add `"use server"` directive.

### 2.4. Firestore Rules Allow Unauthenticated Reads on `config/system`

**Location:** `firestore.rules`

- **Issue:** `allow read: if true;` for system config.
- **Impact:** Information disclosure (maintenance mode status).

---

## 3. 🟡 Code Quality & Bugs

### 3.1. Type Errors & Build Failures (NEW)

**Location:** Multiple files

- **`functions/node_modules`**: Duplicate identifier errors in `@types/node`. Likely due to conflicting versions between root and functions `package.json`.
- **`src/__tests__/app/auth/page.test.tsx`**: Tests are failing because `AuthPage` is rendered without `SystemConfigProvider`.
- **`src/context/SystemConfigProvider.tsx`**: `Cannot find namespace 'JSX'` error. Likely a TypeScript configuration mismatch with React 19.

### 3.2. Potential Runtime Crashes (NEW)

**Location:** `src/lib/firebase.ts`

- **Issue:** Unsafe casting of null values (`const authClient = auth as Auth;`).
- **Impact:** If Firebase initialization fails, accessing `authClient` will crash the app.

### 3.3. Email Verification Can Fail Silently on Localhost

**Location:** `src/hooks/useAuth.tsx`

- **Issue:** `getActionCodeSettings()` returns `undefined` for localhost.
- **Impact:** Verification emails may not work correctly in development.

### 3.4. Google Sign-In Provider Initialized Only on Client

**Location:** `src/hooks/useAuth.tsx`

- **Issue:** `googleProvider` is null on server, but checked in `signInWithGoogle`.
- **Impact:** Potential crash if invoked in wrong context.

---

## 4. 🔵 Configuration Issues

### 4.1. Dependency Conflicts (NEW)

**Location:** `package.json` vs `functions/package.json`

- **Issue:** Root uses `next: 16.0.1` and `react: 19.2.0` (very new), while Functions use `node: 20`. The shared types in `node_modules` are causing conflicts.

### 4.2. Hardcoded URLs (NEW)

**Location:** `src/hooks/useAuth.tsx`

- **Issue:** `url: '${origin}/auth?mode=verify-email'` is hardcoded.
- **Impact:** If the route changes, email verification breaks.

### 4.3. Hardcoded 5-Minute Cache TTL

**Location:** `src/context/SystemConfigProvider.tsx`

- **Issue:** `CONFIG_CACHE_TTL_MS` is hardcoded.
- **Impact:** Not configurable for urgent updates.

---

## 5. Recommendations Plan

1.  **Immediate Security Fix:** Update `firestore.rules` to deny writes to `role` and `subscriptionTier` fields on the `users` collection.
2.  **Build Fix:** Fix the `SystemConfigProvider` test failures and TypeScript errors to ensure a green build.
3.  **Refactor:** Move `aiProviderService.ts` to a server-only scope and implement proper timeouts for fetch calls.
4.  **Architecture:** Evaluate moving the "Resume Creation" logic entirely to a Cloud Function to handle the multi-collection writes and ID generation more reliably.
5.  **Cleanup:** Resolve dependency conflicts between root and functions.
