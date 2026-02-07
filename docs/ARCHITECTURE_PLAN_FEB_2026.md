# SwitchCV Architecture Plan — February 2026

**Goal**: Fix all 67 remaining HIGH issues to reach 0/0/0 audit score  
**Timeline**: 7 days (Feb 7–13), ~2-3 hours/day  
**Constraint**: Parallelizable by AI agents, zero rework, reusable across future projects  
**Branch**: `feature/feb_06` → merge to `develop` on completion

---

## Table of Contents

1. [Problem Breakdown](#1-problem-breakdown)
2. [Architecture: Data Access Layer (DAL)](#2-architecture-data-access-layer-dal)
3. [Architecture: Zod Schema System](#3-architecture-zod-schema-system)
4. [Day-by-Day Execution Plan](#4-day-by-day-execution-plan)
5. [Agent Prompt Templates](#5-agent-prompt-templates)
6. [Verification Protocol](#6-verification-protocol)
7. [Reusable Framework (For All Future Projects)](#7-reusable-framework-for-all-future-projects)

---

## 1. Problem Breakdown

### 67 Issues = 2 Root Causes

| Category | Count | Root Cause | Fix Strategy |
|----------|-------|------------|-------------|
| `ESLINT_DISABLE_BYPASS` | 34 | No Data Access Layer — routes import `firebase-admin` directly | Create `src/lib/dal/` |
| `VALIDATION_MISSING` | 32 | No centralized schemas — routes parse `request.json()` raw | Create `src/lib/schemas/api/` |
| `PROVIDER_NO_MEMO` | 1 | False positive (already memoized at call site) | Skip |

### Why These Are Coupled

The 34 eslint-disable files and the 32 validation-missing routes **overlap significantly** — 20+ routes need BOTH fixes. The order matters:

```
Day 1-2: Build the DAL (infrastructure) + Schema system (infrastructure)
Day 3-5: Migrate routes (consume both DAL + schemas)
Day 6:   Verify, test, clean up
Day 7:   Final audit, merge
```

---

## 2. Architecture: Data Access Layer (DAL)

### The Problem Today

```
44 API routes → import { adminDb } from "@/lib/firebase-admin"
             → adminDb.collection("users").doc(id).get()
             → eslint-disable-next-line no-restricted-imports
```

Every route bypasses the `no-restricted-imports` ESLint rule because there's no alternative. The rule says "don't import firebase-admin in API routes" but provides no legal alternative.

### The Solution: `src/lib/dal/`

Create a thin Data Access Layer that:
1. Is the **only** file that imports `firebase-admin` (with a single legitimate eslint-disable)
2. Exports typed, validated functions that routes call instead
3. Enforces `.limit()` on all queries (prevents unbounded reads)
4. Centralizes collection names (no more hardcoded strings)

### File Structure

```
src/lib/dal/
├── index.ts              # Re-exports everything (public API)
├── client.ts             # Firestore client singleton (THE one eslint-disable)
├── collections.ts        # Collection name constants + typed references
├── base-repository.ts    # Generic CRUD operations (getDoc, query, create, update, delete)
├── auth.ts               # Auth operations (verifyIdToken, getUser, updateUser)
│
├── repositories/
│   ├── user.repository.ts         # Users, usernames, settings
│   ├── resume.repository.ts       # Resumes, resumeProfiles, drafts
│   ├── recruiter.repository.ts    # Recruiter requests, tokens, notifications
│   ├── admin.repository.ts        # System config, migrations, audit logs
│   ├── analytics.repository.ts    # Analytics events, usage logs
│   └── search.repository.ts       # Search queries, AI search
│
└── types.ts              # DAL-specific types (QueryOptions, PaginatedResult, etc.)
```

### Core Design: `client.ts`

```typescript
// src/lib/dal/client.ts
// This is the ONLY file in src/ that may import firebase-admin.
// All API routes MUST use the DAL instead of direct firebase-admin imports.
// eslint-disable-next-line no-restricted-imports
import { adminDb, adminAuth, admin } from "@/lib/firebase-admin";

// Re-export Firestore primitives that repositories need
export const db = adminDb;
export const auth = adminAuth;
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;

// Types
export type Firestore = FirebaseFirestore.Firestore;
export type DocumentReference = FirebaseFirestore.DocumentReference;
export type CollectionReference = FirebaseFirestore.CollectionReference;
export type Query = FirebaseFirestore.Query;
export type DocumentSnapshot = FirebaseFirestore.DocumentSnapshot;
export type QuerySnapshot = FirebaseFirestore.QuerySnapshot;
export type WriteBatch = FirebaseFirestore.WriteBatch;
export type Transaction = FirebaseFirestore.Transaction;
```

### Core Design: `collections.ts`

```typescript
// src/lib/dal/collections.ts
// Single source of truth for all collection names.
// No route should ever hardcode a collection string.

export const COLLECTIONS = {
  // Core
  USERS: "users",
  USERNAMES: "usernames",
  SYSTEM: "system",
  
  // Resumes
  RESUMES: "resumes",            // Current resumes
  RESUME_PROFILES: "resumeProfiles", // Legacy resumes
  DRAFTS: "drafts",
  ALL_RESUMES: "allResumes",
  
  // Recruiter
  RECRUITER_REQUESTS: "recruiterRequests",
  RECRUITER_NOTIFICATIONS: "recruiterNotifications",
  RECRUITER_INTERVIEWS: "recruiterInterviews",
  RECRUITER_PIPELINES: "recruiterPipelines",
  RECRUITER_CANDIDATES: "recruiterCandidates",
  RECRUITER_BULK_ACTIONS: "recruiterBulkActions",
  RECRUITER_METRICS: "recruiterMetrics",
  ACCESS_TOKENS: "accessTokens",
  ADMIN_NOTIFICATIONS: "adminNotifications",
  
  // Auth & Security
  PASSWORD_RESET_TOKENS: "passwordResetTokens",
  AUDIT_LOGS: "auditLogs",
  PROFILE_ACCESS_LOGS: "profileAccessLogs",
  
  // AI & Search
  AI_USAGE_LOGS: "aiUsageLogs",
  AI_AUDIT_LOGS: "aiAuditLogs",
  SEARCH_QUOTAS: "searchQuotas",
  
  // Email
  MAIL: "mail",
  
  // Monitoring
  MONITORING: "monitoring",
  
  // Seed
  SEED_GENERATION_LOGS: "seedGenerationLogs",
} as const;

export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];
```

### Core Design: `base-repository.ts`

```typescript
// src/lib/dal/base-repository.ts
import { db, FieldValue, Timestamp } from "./client";
import type { CollectionName } from "./collections";
import { logger } from "@/lib/logger";

export interface QueryOptions {
  where?: Array<{
    field: string;
    op: FirebaseFirestore.WhereFilterOp;
    value: unknown;
  }>;
  orderBy?: { field: string; direction?: "asc" | "desc" };
  limit?: number;           // Required — defaults to 100 to prevent unbounded reads
  startAfter?: unknown;     // For cursor-based pagination
  offset?: number;          // For offset-based pagination
}

export interface PaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  cursor?: string;          // Last document ID for cursor pagination
  total?: number;           // Only included if explicitly requested
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

/** Get a single document by ID */
export async function getDoc<T>(
  collection: CollectionName,
  docId: string
): Promise<T | null> {
  const snap = await db.collection(collection).doc(docId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as T;
}

/** Query documents with mandatory limit */
export async function queryDocs<T>(
  collection: CollectionName,
  options: QueryOptions = {}
): Promise<PaginatedResult<T>> {
  let query: FirebaseFirestore.Query = db.collection(collection);

  // Apply filters
  for (const w of options.where ?? []) {
    query = query.where(w.field, w.op, w.value);
  }

  // Apply ordering
  if (options.orderBy) {
    query = query.orderBy(options.orderBy.field, options.orderBy.direction ?? "asc");
  }

  // ENFORCE limit (never unbounded)
  const limit = Math.min(options.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  query = query.limit(limit + 1); // Fetch 1 extra to detect hasMore

  // Apply pagination
  if (options.startAfter) {
    query = query.startAfter(options.startAfter);
  }
  if (options.offset) {
    query = query.offset(options.offset);
  }

  const snap = await query.get();
  const docs = snap.docs.slice(0, limit).map(d => ({ id: d.id, ...d.data() } as T));
  const hasMore = snap.docs.length > limit;
  const cursor = docs.length > 0 ? docs[docs.length - 1]?.id : undefined;

  return { data: docs, hasMore, cursor };
}

/** Create a document (auto-ID or specified ID) */
export async function createDoc<T extends Record<string, unknown>>(
  collection: CollectionName,
  data: T,
  docId?: string
): Promise<string> {
  const withTimestamps = {
    ...data,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (docId) {
    await db.collection(collection).doc(docId).set(withTimestamps);
    return docId;
  }

  const ref = await db.collection(collection).add(withTimestamps);
  return ref.id;
}

/** Update a document (merge by default) */
export async function updateDoc<T extends Record<string, unknown>>(
  collection: CollectionName,
  docId: string,
  data: T
): Promise<void> {
  await db.collection(collection).doc(docId).set(
    { ...data, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
}

/** Delete a document */
export async function deleteDoc(
  collection: CollectionName,
  docId: string
): Promise<void> {
  await db.collection(collection).doc(docId).delete();
}

/** Get a subcollection document */
export async function getSubDoc<T>(
  parentCollection: CollectionName,
  parentId: string,
  subCollection: string,
  docId: string
): Promise<T | null> {
  const snap = await db
    .collection(parentCollection)
    .doc(parentId)
    .collection(subCollection)
    .doc(docId)
    .get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as T;
}

/** Batch write (for multi-document operations) */
export function createBatch(): FirebaseFirestore.WriteBatch {
  return db.batch();
}

/** Transaction (for read-then-write atomicity) */
export async function runTransaction<T>(
  fn: (transaction: FirebaseFirestore.Transaction) => Promise<T>
): Promise<T> {
  return db.runTransaction(fn);
}

/** Server timestamp helper */
export function serverTimestamp(): FirebaseFirestore.FieldValue {
  return FieldValue.serverTimestamp();
}

/** Increment helper */
export function increment(n: number = 1): FirebaseFirestore.FieldValue {
  return FieldValue.increment(n);
}

/** Array union helper */
export function arrayUnion(...elements: unknown[]): FirebaseFirestore.FieldValue {
  return FieldValue.arrayUnion(...elements);
}

/** Array remove helper */
export function arrayRemove(...elements: unknown[]): FirebaseFirestore.FieldValue {
  return FieldValue.arrayRemove(...elements);
}

/** Timestamp from Date */
export function timestampFromDate(date: Date): FirebaseFirestore.Timestamp {
  return Timestamp.fromDate(date);
}

/** Delete field sentinel */
export function deleteField(): FirebaseFirestore.FieldValue {
  return FieldValue.delete();
}

/** Raw collection reference (for complex queries the base functions can't express) */
export function collectionRef(collection: CollectionName): FirebaseFirestore.CollectionReference {
  return db.collection(collection);
}

/** Collection group query (for subcollection queries across all parents) */
export function collectionGroupRef(collectionId: string): FirebaseFirestore.Query {
  return db.collectionGroup(collectionId);
}
```

### Core Design: `auth.ts`

```typescript
// src/lib/dal/auth.ts
import { auth } from "./client";

/** Verify a Firebase ID token and return the decoded claims */
export async function verifyIdToken(token: string) {
  return auth.verifyIdToken(token);
}

/** Get a user record by UID */
export async function getAuthUser(uid: string) {
  return auth.getUser(uid);
}

/** Update custom claims on a user */
export async function setCustomClaims(uid: string, claims: Record<string, unknown>) {
  return auth.setCustomUserClaims(uid, claims);
}

/** Generate a password reset link */
export async function generatePasswordResetLink(email: string) {
  return auth.generatePasswordResetLink(email);
}

/** Update a user's password */
export async function updateAuthUser(uid: string, properties: { password?: string; disabled?: boolean }) {
  return auth.updateUser(uid, properties);
}
```

### Core Design: `index.ts`

```typescript
// src/lib/dal/index.ts
// Public API — this is what API routes import

// Base operations
export {
  getDoc,
  queryDocs,
  createDoc,
  updateDoc,
  deleteDoc,
  getSubDoc,
  createBatch,
  runTransaction,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  timestampFromDate,
  deleteField,
  collectionRef,
  collectionGroupRef,
} from "./base-repository";

export type { QueryOptions, PaginatedResult } from "./base-repository";

// Collection constants
export { COLLECTIONS } from "./collections";
export type { CollectionName } from "./collections";

// Auth operations
export {
  verifyIdToken,
  getAuthUser,
  setCustomClaims,
  generatePasswordResetLink,
  updateAuthUser,
} from "./auth";

// Domain repositories (added as they're built)
// export { UserRepository } from "./repositories/user.repository";
// export { ResumeRepository } from "./repositories/resume.repository";
// etc.
```

### ESLint Rule Update

Update `eslint.config.mjs` to:
- **Allow** `firebase-admin` imports ONLY in `src/lib/dal/client.ts` and `src/lib/firebase-admin.ts`
- **Block** `firebase-admin` imports everywhere else (error, not warning)
- Remove the `no-restricted-imports` rule (which applied to the import statement) in favor of `no-restricted-syntax` targeting the import path

This means the 34 eslint-disable comments become **violations** that TypeScript catches — routes that still import firebase-admin directly will fail lint without needing eslint-disable.

### Migration Pattern (Per Route)

Before:
```typescript
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;
  
  const userDoc = await adminDb.collection("users").doc(userId!).get();
  const user = userDoc.exists ? userDoc.data() : null;
  // ...
}
```

After:
```typescript
import { getDoc, COLLECTIONS } from "@/lib/dal";

export async function GET(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;
  
  const user = await getDoc(COLLECTIONS.USERS, userId!);
  // ...
}
```

**Key**: Routes no longer import firebase-admin. The eslint-disable comment is removed. The ESLint rule is satisfied.

---

## 3. Architecture: Zod Schema System

### The Problem Today

32 routes parse `request.json()` and use the raw result without Zod validation:
```typescript
const { resumeId, userId } = await request.json();
if (!resumeId) return NextResponse.json({ error: "Missing resumeId" }, { status: 400 });
```

### The Solution: `src/lib/schemas/api/`

```
src/lib/schemas/
├── resume.ts              # (EXISTING) Resume creation/update schemas
├── ai-response.ts         # (EXISTING) AI response validation schemas
├── draft.ts               # (EXISTING) Draft update schema
│
├── api/                   # NEW — One schema file per API domain
│   ├── index.ts           # Re-exports all API schemas
│   ├── admin.schemas.ts   # Admin API input schemas
│   ├── auth.schemas.ts    # Auth API input schemas
│   ├── analytics.schemas.ts
│   ├── interview.schemas.ts
│   ├── jobseeker.schemas.ts
│   ├── profiles.schemas.ts
│   ├── recruiter.schemas.ts
│   ├── recruiters.schemas.ts    # (recruiters/ domain — contact workflow)
│   ├── resume.schemas.ts        # Resume API input schemas
│   ├── search.schemas.ts
│   ├── skills.schemas.ts
│   ├── user.schemas.ts
│   └── shared.schemas.ts        # Reusable pieces (duration, pagination, etc.)
```

### Shared Schemas (`shared.schemas.ts`)

```typescript
import { z } from "zod";

/** Duration selection — used by profiles/approve, profiles/request, profiles/respond */
export const DurationSchema = z.enum(["1hour", "1day", "1week", "forever"]);
export const AdminDurationSchema = z.enum(["1hour", "1day", "1week", "30days"]);

/** Pagination input */
export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
  cursor: z.string().optional(),
});

/** Conversation history item — used by resume chat, resume generate */
export const ConversationMessageSchema = z.object({
  id: z.string().optional(),
  content: z.string(),
  isUser: z.boolean(),
  timestamp: z.string().optional(),
});
export const ConversationHistorySchema = z.array(ConversationMessageSchema).default([]);

/** Common ID fields */
export const ResumeIdSchema = z.union([z.string().min(1), z.number()]);
export const UserIdSchema = z.string().min(1);
export const RequestIdSchema = z.string().min(1);
```

### Complexity Distribution

| Complexity | Count | Schema Strategy |
|-----------|-------|----------------|
| **Trivial** (1 field) | 3 | Inline `z.object({ field: z.string() })` |
| **Simple** (2-3 flat fields) | 10 | Single schema per handler |
| **Medium** (4-5 fields, nested) | 7 | Schema file with shared imports |
| **Complex** (nested objects) | 7 | Schema file with sub-schemas |
| **Very Complex** (discriminated unions) | 5 | Discriminated union with per-action schemas |

### Schema Application Pattern

```typescript
// In the route file
import { SomeInputSchema } from "@/lib/schemas/api";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  try {
    const parseResult = SomeInputSchema.safeParse(await request.json());
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }
    const data = parseResult.data; // Type-safe ✅
    // ... use data ...
  } catch (err) {
    return handleApiError(err, "Operation failed");
  }
}
```

---

## 4. Day-by-Day Execution Plan

### Day 1 (Friday Feb 7): Foundation — DAL Core

**Goal**: Build `src/lib/dal/` and prove it works on 2 simple routes.

| # | Task | Time | Agent-Parallelizable |
|---|------|------|---------------------|
| 1 | Create `src/lib/dal/client.ts` | 10 min | No (foundation) |
| 2 | Create `src/lib/dal/collections.ts` | 10 min | No (foundation) |
| 3 | Create `src/lib/dal/base-repository.ts` | 20 min | No (foundation) |
| 4 | Create `src/lib/dal/auth.ts` | 10 min | No (foundation) |
| 5 | Create `src/lib/dal/types.ts` | 5 min | No (foundation) |
| 6 | Create `src/lib/dal/index.ts` | 5 min | No (foundation) |
| 7 | Update ESLint to allow firebase-admin ONLY in `dal/client.ts` | 10 min | No |
| 8 | Migrate `health/route.ts` (simplest) — prove DAL works | 15 min | No |
| 9 | Migrate `system-config/route.ts` — prove DAL works | 15 min | No |
| 10 | Run TypeScript check + lint + audit | 10 min | No |

**Commit**: `feat(dal): create data access layer foundation`

### Day 2 (Saturday Feb 8): Foundation — Schema System + Simple Migrations

**Goal**: Build shared schemas and migrate the 13 simplest routes (trivial + simple schemas).
**Status (Updated Feb 7, 2026)**: ✅ Completed
**Verification snapshot**: Route audit improved from `HIGH (41)` to `HIGH (26)` after Day 02 completion.

| # | Task | Time | Agent-Parallelizable |
|---|------|------|---------------------|
| 1 | Create `src/lib/schemas/api/shared.schemas.ts` | 15 min | No (foundation) |
| 2 | Create `src/lib/schemas/api/index.ts` | 5 min | No (foundation) |
| 3 | Create `src/lib/schemas/api/auth.schemas.ts` | 5 min | ✅ Yes |
| 4 | Create `src/lib/schemas/api/admin.schemas.ts` | 5 min | ✅ Yes |
| 5 | Create `src/lib/schemas/api/user.schemas.ts` | 10 min | ✅ Yes |
| 6 | Create `src/lib/schemas/api/search.schemas.ts` | 5 min | ✅ Yes |
| — | **Migrate trivial routes (1 field):** | | |
| 7 | `auth/request-password-reset` → DAL + Zod | 10 min | ✅ Yes |
| 8 | `resume/delete` → DAL + Zod | 10 min | ✅ Yes |
| 9 | `user/role` → DAL + Zod | 10 min | ✅ Yes |
| — | **Migrate simple routes (2-3 fields):** | | |
| 10 | `auth/reset-password` → DAL + Zod | 10 min | ✅ Yes |
| 11 | `admin/migrate-numeric-ids` → DAL + Zod | 10 min | ✅ Yes |
| 12 | `admin/user-approval` → DAL + Zod | 10 min | ✅ Yes |
| 13 | `analytics/dashboard` → DAL + Zod | 10 min | ✅ Yes |
| 14 | `recruiter/request-access` → DAL + Zod | 10 min | ✅ Yes |
| 15 | `search/ai` → DAL + Zod | 10 min | ✅ Yes |
| 16 | `resume/map-id` → DAL + Zod | 10 min | ✅ Yes |
| 17 | Run TypeScript check + lint + audit | 10 min | No |

**Commit**: `feat(schemas): add API schemas + migrate 10 simple routes`

### Day 3 (Sunday Feb 9): Medium Complexity Routes

**Goal**: Migrate 12 medium-complexity routes (profiles, recruiters, resume).
**Status (Updated Feb 7, 2026)**: ✅ Completed

| # | Task | Time | Agent-Parallelizable |
|---|------|------|---------------------|
| 1 | Create `src/lib/schemas/api/profiles.schemas.ts` | 15 min | ✅ Yes |
| 2 | Create `src/lib/schemas/api/recruiters.schemas.ts` | 15 min | ✅ Yes |
| 3 | Create `src/lib/schemas/api/resume.schemas.ts` | 10 min | ✅ Yes |
| 4 | Create `src/lib/schemas/api/analytics.schemas.ts` | 5 min | ✅ Yes |
| — | **Migrate profiles domain:** | | |
| 5 | `profiles/approve-access` → DAL + Zod | 15 min | ✅ Yes |
| 6 | `profiles/request-access` → DAL + Zod | 15 min | ✅ Yes |
| 7 | `profiles/respond-access` → DAL + Zod | 15 min | ✅ Yes |
| 8 | `profiles/analytics` → DAL + Zod | 10 min | ✅ Yes |
| — | **Migrate recruiters domain:** | | |
| 9 | `recruiters/approve-contact` → DAL + Zod | 15 min | ✅ Yes |
| 10 | `recruiters/deny-contact` → DAL + Zod | 15 min | ✅ Yes |
| 11 | `recruiters/verify-token` → DAL + Zod | 10 min | ✅ Yes |
| — | **Migrate resume domain:** | | |
| 12 | `resume/compare` → DAL + Zod | 15 min | ✅ Yes |
| 13 | `resume/generate` → DAL + Zod | 10 min | ✅ Yes |
| 14 | `user/settings` → DAL + Zod | 15 min | ✅ Yes |
| 15 | `user/profile` → DAL + Zod | 15 min | ✅ Yes |
| 16 | Run TypeScript check + lint + audit | 10 min | No |

**Commit**: `feat: migrate profiles, recruiters, resume routes to DAL + Zod`

### Day 4 (Monday Feb 10): Complex Routes

**Goal**: Migrate 10 complex routes (recruiter domain, search, chat).
**Status (Updated Feb 7, 2026)**: ✅ Completed

| # | Task | Time | Agent-Parallelizable |
|---|------|------|---------------------|
| 1 | Create `src/lib/schemas/api/recruiter.schemas.ts` | 20 min | No (discriminated unions) |
| 2 | Create `src/lib/schemas/api/skills.schemas.ts` | 15 min | ✅ Yes |
| 3 | Create `src/lib/schemas/api/interview.schemas.ts` | 10 min | ✅ Yes |
| — | **Migrate recruiter domain:** | | |
| 4 | `recruiter/bulk-actions` → DAL + Zod | 20 min | ✅ Yes |
| 5 | `recruiter/candidates` → DAL + Zod | 20 min | ✅ Yes |
| 6 | `recruiter/interviews` → DAL + Zod | 20 min | ✅ Yes |
| 7 | `recruiter/pipeline` → DAL + Zod | 20 min | ✅ Yes |
| — | **Migrate other complex routes:** | | |
| 8 | `profiles/search` → DAL + Zod | 20 min | ✅ Yes |
| 9 | `recruiters/request-contact` → DAL + Zod | 15 min | ✅ Yes |
| 10 | `resumes/[id]/chat` → DAL + Zod | 15 min | ✅ Yes |
| 11 | `resumes/create` → DAL + Zod | 15 min | ✅ Yes |
| 12 | Run TypeScript check + lint + audit | 10 min | No |

**Commit**: `feat: migrate complex recruiter + search routes to DAL + Zod`

### Day 5 (Tuesday Feb 11): Remaining Routes + Helper Files

**Goal**: Migrate remaining routes + 2 helper files + `skills`.
**Status (Updated Feb 7, 2026)**: ✅ Completed
**Verification snapshot**: Route audit now reports `✅ ALL CHECKS PASSED — No issues found`.

| # | Task | Time | Agent-Parallelizable |
|---|------|------|---------------------|
| — | **Remaining routes:** | | |
| 1 | `skills/route.ts` → DAL + Zod | 20 min | ✅ Yes |
| 2 | `interview/assistant` → DAL + Zod | 15 min | ✅ Yes |
| 3 | `jobseeker/profile` → DAL + Zod (⚠️ CRITICAL: add `.strict()`) | 20 min | ✅ Yes |
| 4 | `ai/generate/route.ts` → DAL | 10 min | ✅ Yes |
| 5 | `seed/generate/route.ts` → DAL | 10 min | ✅ Yes |
| — | **Non-route helper files with eslint-disable:** | | |
| 6 | `recruiter/search-resumes/access-status.ts` → DAL | 15 min | ✅ Yes |
| 7 | `recruiter/search-resumes/search-service.ts` → DAL | 15 min | ✅ Yes |
| — | **Remaining DAL-only routes (no body to validate):** | | |
| 8 | `jobseeker/access-requests/route.ts` → DAL | 10 min | ✅ Yes |
| 9 | `recruiter/debug-resumes/route.ts` → DAL | 10 min | ✅ Yes |
| 10 | `admin/init-system/route.ts` → DAL | 10 min | ✅ Yes |
| 11 | `admin/migrate-resume-ids/route.ts` → DAL | 10 min | ✅ Yes |
| 12 | `user/update-role/route.ts` → DAL | 10 min | ✅ Yes |
| 13 | `user/username/check/route.ts` → DAL | 10 min | ✅ Yes |
| 14 | `health/infra/route.ts` → DAL | 15 min | ✅ Yes |
| 15 | Run TypeScript check + lint + audit | 10 min | No |

**Commit**: `feat: complete DAL migration for all remaining routes`

### Day 6 (Wednesday Feb 12): Verification + Test Fixes

**Goal**: Full verification, fix any test regressions, clean up.
**Status (Updated Feb 7, 2026)**: ✅ Completed
**Verification snapshot (Updated Feb 7, 2026)**:
- `node scripts/audit-api-routes.js` → `✅ ALL CHECKS PASSED — No issues found`
- `npx eslint src/app/api --ext .ts,.tsx` → `0 errors` (warnings only)
- `npm run lint` → `0 errors` (warnings only)
- `npx tsc --noEmit` → `0 errors`
- `CI=true npm test -- --watch=false --watchman=false` → `400 passed suites`, `2 skipped`, `0 failed` (`4194 passed tests`, `67 skipped`)

| # | Task | Time | Agent-Parallelizable |
|---|------|------|---------------------|
| 1 | Run full `npm test` — fix any regressions | 60 min | No |
| 2 | Run `npx tsc --noEmit` — fix any type errors | 20 min | No |
| 3 | Run `npm run lint` — verify 0 errors | 10 min | No |
| 4 | Run `node scripts/audit-api-routes.js` — verify 0 critical, 0 high | 5 min | No |
| 5 | Remove all remaining `eslint-disable no-restricted-imports` comments | 15 min | No |
| 6 | Verify no route directly imports `firebase-admin` | 5 min | No |
| 7 | Review DashboardMetricsContext false positive — close or fix | 10 min | No |
| 8 | Commit everything | 5 min | No |

**Commit**: `chore: verification pass — fix test regressions, remove all eslint-disable`

### Day 7 (Thursday Feb 13): Final Audit + Merge

**Goal**: Final audit, documentation, merge to develop.
**Status (Updated Feb 7, 2026)**: 🟡 In progress (final audit + tests + docs completed; PR created; CI stabilization + merge + prod maintenance toggle pending).
**Verification snapshot (Updated Feb 7, 2026)**:
- `node scripts/audit-api-routes.js` → `✅ ALL CHECKS PASSED — No issues found`
- `CI=true npm test -- --watch=false --watchman=false` → `400 passed suites`, `2 skipped`, `0 failed` (`4194 passed tests`, `67 skipped`)
- `README.md` updated with DAL architecture and API route standards
- `docs/LESSONS_LEARNED.md` updated with DAL migration outcomes and verification evidence
- PR created: `feature/feb_06` → `develop` ([#46](https://github.com/AnilAlapati/switchCV/pull/46))
- `Security Headers Check` workflow bug identified and fixed (`.github/workflows/security-scan.yml`)
- `Dependency Review` check removed from workflow because it is unsupported on this repo plan (no GitHub Advanced Security on private repo)
- Latest remote PR check snapshot (still from previous run, before local workflow updates are pushed): `Dependency Review` fail, `NPM Dependency Audit` fail, `Security Headers Check` fail, `build` fail, `security/snyk` fail.

**PR #46 Blockers (Prioritized, Updated Feb 7, 2026)**:
1. **P0 (External unblocker)**: Disable `security/snyk (anilalapati)` PR check in Snyk/GitHub App settings (current failure: private test quota exceeded). Manual path: Snyk org settings → GitHub integration → turn off PR checks for `AnilAlapati/switchCV` (or disconnect repo). This is not controlled by repository workflow YAML.
2. **P1 (Repo sync)**: Push local CI workflow updates so PR checks use the fixed config (`Security Headers` quote fix + removal of unsupported `Dependency Review` step).
3. **P1 (Security gate)**: Resolve `npm audit` high vulnerabilities still failing `NPM Dependency Audit` (last CI snapshot reported 11 total vulnerabilities, including 2 high in production audit).
4. **P1 (CI verification)**: Re-run CI on latest commit after sync to refresh check results.
5. **P2 (CI hygiene)**: Reconcile `build` check mismatch (remote run failed with lint errors; local `npm run lint` currently shows `0 errors`, warnings only).

| # | Task | Time | Agent-Parallelizable |
|---|------|------|---------------------|
| 1 | Run full audit one final time | 5 min | No |
| 2 | Run full test suite | 15 min | No |
| 3 | Update README.md with DAL documentation | 15 min | No |
| 4 | Update `docs/LESSONS_LEARNED.md` with outcomes | 10 min | No |
| 5 | Create PR: `feature/feb_06` → `develop` | 5 min | No |
| 6 | Merge and disable maintenance mode on prod | 10 min | No |

**Commit**: `docs: update documentation with DAL architecture`  
**Merge**: `feature/feb_06` → `develop`

---

## 5. Agent Prompt Templates

### Template A: "Migrate a Route to DAL + Zod"

Use this when asking an AI agent to migrate a specific route file.

```markdown
## Task: Migrate [ROUTE_PATH] to DAL + Zod

**Rules (NON-NEGOTIABLE):**
1. Follow ALL rules in .github/copilot-instructions.md
2. Do NOT add any `eslint-disable` comments
3. Do NOT import from `firebase-admin` or `@/lib/firebase-admin` — use `@/lib/dal` instead
4. If the route reads a request body, validate with Zod from `@/lib/schemas/api`
5. If a Zod schema doesn't exist yet for this route, create it in the appropriate schema file
6. Return 400 for validation errors (not 500)
7. Use `handleApiError()` for all error responses

**Context:**
- DAL is in `src/lib/dal/` — import { getDoc, queryDocs, createDoc, updateDoc, deleteDoc, COLLECTIONS } from "@/lib/dal"
- Auth helpers are in `src/lib/dal/auth.ts` — import { verifyIdToken } from "@/lib/dal"
- Schemas are in `src/lib/schemas/api/` — check if one already exists before creating
- Collections enum is in `src/lib/dal/collections.ts` — use COLLECTIONS.X, never hardcode strings

**Steps:**
1. Read the current route file completely
2. Identify all firebase-admin imports and Firestore operations
3. Replace each with the equivalent DAL function:
   - `adminDb.collection("X").doc(id).get()` → `getDoc(COLLECTIONS.X, id)`
   - `adminDb.collection("X").where(...)` → `queryDocs(COLLECTIONS.X, { where: [...] })`
   - `adminDb.collection("X").doc(id).set(data)` → `createDoc(COLLECTIONS.X, data, id)`
   - `adminDb.collection("X").doc(id).update(data)` → `updateDoc(COLLECTIONS.X, id, data)`
   - `admin.firestore.FieldValue.serverTimestamp()` → `serverTimestamp()` from `@/lib/dal`
   - `admin.firestore.FieldValue.increment(n)` → `increment(n)` from `@/lib/dal`
4. Remove the `eslint-disable` comment
5. Remove the `import { adminDb } from "@/lib/firebase-admin"` line
6. If the route has a request body: add Zod validation (see schema rules below)
7. Verify TypeScript compiles: `npx tsc --noEmit [FILE_PATH]`

**Schema rules:**
- Check `src/lib/schemas/api/` for an existing schema first
- If creating new: put it in the matching domain file (e.g., `recruiter.schemas.ts`)
- Use shared schemas from `shared.schemas.ts` where possible (DurationSchema, PaginationSchema, etc.)
- Use `safeParse()` not `parse()` — return 400 on failure with `error.flatten()`

**Verification:**
- `npx tsc --noEmit` passes
- `npx eslint [FILE_PATH]` passes with 0 errors
- File does NOT contain `firebase-admin` or `eslint-disable`
```

### Template B: "Create a Schema File"

```markdown
## Task: Create Zod schemas for [DOMAIN] API routes

**Location:** `src/lib/schemas/api/[domain].schemas.ts`

**Routes to cover:**
- [List the specific routes and their HTTP methods]

**Rules:**
1. Import shared schemas from `./shared.schemas` where applicable
2. Export each schema with a descriptive name: `[Action][Domain]Schema`
   - Example: `CreateCandidateSchema`, `SearchProfilesSchema`
3. Use `z.discriminatedUnion("action", [...])` for routes with action-based dispatch
4. Add JSDoc comments explaining what each schema validates
5. Use `.strict()` on schemas where the body is spread to Firestore (prevents field injection)
6. Mark optional fields with `.optional()` or `.default(value)`
7. Add string constraints: `.min(1)` for required strings, `.max(N)` for user input, `.email()` for emails

**Template:**
```typescript
import { z } from "zod";
import { DurationSchema, PaginationSchema } from "./shared.schemas";

/** Validates input for POST /api/[domain]/[endpoint] */
export const ActionNameSchema = z.object({
  field: z.string().min(1),
  optionalField: z.string().optional(),
});
export type ActionNameInput = z.infer<typeof ActionNameSchema>;
```

**Verification:**
- File compiles with `npx tsc --noEmit`
- Export the schema from `src/lib/schemas/api/index.ts`
```

### Template C: "Verify Migration"

```markdown
## Task: Verify that all migrations are correct

Run these checks and report results:

1. `grep -r "firebase-admin" src/app/api/ --include="*.ts" -l`
   → Should return ZERO files (all imports should be through DAL)

2. `grep -r "eslint-disable.*no-restricted-imports" src/app/api/ --include="*.ts" -l`
   → Should return ZERO files (all bypasses removed)

3. `grep -r "eslint-disable.*no-restricted-syntax" src/app/api/ --include="*.ts" -l`
   → Should return ZERO files

4. `npx tsc --noEmit`
   → Should have 0 errors

5. `npx eslint src/app/api/ --ext .ts`
   → Should have 0 errors (warnings OK)

6. `node scripts/audit-api-routes.js`
   → Should show: Critical: 0, High: 0, Medium: 0

7. `npm test -- --bail --silent`
   → All tests pass

For any failure: identify the file, explain the issue, fix it.
```

---

## 6. Verification Protocol

### Per-Route Verification (After Each Migration)

```bash
# 1. TypeScript compiles
npx tsc --noEmit --pretty 2>&1 | head -20

# 2. ESLint passes on the file
npx eslint src/app/api/[path]/route.ts

# 3. No firebase-admin import
grep "firebase-admin" src/app/api/[path]/route.ts
# (should return nothing)

# 4. No eslint-disable
grep "eslint-disable" src/app/api/[path]/route.ts
# (should return nothing)
```

### Daily Verification (End of Each Day)

```bash
# Full audit
node scripts/audit-api-routes.js

# Full TypeScript check
npx tsc --noEmit

# Full lint
npm run lint

# Quick test (affected domain)
npm test -- --testPathPattern="[domain]" --bail
```

### Final Verification (Day 6-7)

```bash
# Everything
npm test
npx tsc --noEmit
npm run lint
node scripts/audit-api-routes.js

# Manual grep checks
grep -r "firebase-admin" src/app/api/ --include="*.ts" -l
grep -r "eslint-disable" src/app/api/ --include="*.ts" -l
```

### Expected Final Audit Output

```
╔══════════════════════════════════════════╗
║     SwitchCV API Route Audit Report      ║
╚══════════════════════════════════════════╝

Scanning 75 API route files...
Scanning 222 component files...
Scanning 43 provider/hook files...

──────────────────────────────────────────
   Critical: 0  High: 0  Medium: 0  Info: 0
──────────────────────────────────────────

✅ All checks passed!
```

---

## 7. Reusable Framework (For All Future Projects)

### The "Vibe-Coding Quality Framework"

Everything built during this sprint is reusable. Here's how to carry it to ANY future project:

### Layer 1: Audit Script (Copy + Adapt)

**File**: `scripts/audit-api-routes.js`

This script is parameterizable. For a new project:
1. Copy the script
2. Update the `PUBLIC_ROUTES` allowlist
3. Update check patterns for your framework (e.g., Express instead of Next.js)
4. Wire into pre-commit hook

**What it checks** (framework-agnostic concepts):
- ✅ Auth present on protected routes
- ✅ Input validation present
- ✅ No error detail leakage
- ✅ No lint bypass comments
- ✅ Provider memoization
- ✅ No `window.alert()`
- ✅ No unbounded database queries

### Layer 2: Data Access Layer (Pattern, Not Code)

**The pattern** (works with any ORM/database):

```
Route → DAL → Database
       ↑
       Only this layer touches the DB SDK
       Only this layer has the eslint-disable
```

For a new project:
1. Create `src/lib/dal/` with `client.ts` (one file touches the DB)
2. Create `base-repository.ts` with generic CRUD
3. Create `collections.ts` (or `tables.ts` for SQL)
4. ESLint rule: block raw DB imports outside `dal/`

### Layer 3: Schema-First API Design

**The pattern**:
1. Define Zod schemas BEFORE writing routes
2. `safeParse()` at the top of every handler
3. Return 400 with `error.flatten()` on failure
4. Export TypeScript types from schemas: `type X = z.infer<typeof XSchema>`

### Layer 4: Enforcement Pipeline

```
                 Instruction File
                      ↓
              (Can be ignored by AI)
                      ↓
                 ESLint Rules
                      ↓
              (Can be eslint-disabled)
                      ↓
              Mechanical Audit Script  ← REAL GATE
                      ↓
              (Cannot be bypassed)
                      ↓
              Pre-commit Hook          ← BLOCKS BAD CODE
                      ↓
              CI/CD Pipeline           ← BLOCKS BAD MERGES
```

**For any new project, set up ALL 4 layers on Day 1.** Don't wait until you have 80 violations to catch up.

### Layer 5: Knowledge Documents

| Document | Purpose | When to Create |
|----------|---------|---------------|
| `LESSONS_LEARNED.md` | Root cause analysis | After any incident |
| `SAFE_AI_REQUESTS.md` | AI agent prompt guide | Day 1 of project |
| `copilot-instructions.md` | AI agent rules | Day 1 of project |
| `ARCHITECTURE_PLAN.md` | This document | Before any refactor sprint |

### Quick-Start for New Projects

```bash
# Day 1 of any new project:
mkdir -p scripts src/lib/dal src/lib/schemas/api .github

# 1. Copy audit script (adapt checks for your framework)
cp templates/audit-script.js scripts/audit-routes.js

# 2. Copy pre-commit hook
cp templates/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

# 3. Copy copilot instructions
cp templates/copilot-instructions.md .github/copilot-instructions.md

# 4. Create DAL skeleton
# (framework-specific, but the pattern is always the same)

# 5. Create shared Zod schemas
# (project-specific, but always start with pagination + ID schemas)

# 6. Run first audit — should show 0/0/0
node scripts/audit-routes.js
```

---

## Appendix A: Complete Route × Issue Matrix

| Route | ESLINT_DISABLE | VALIDATION_MISSING | Day |
|-------|:-:|:-:|:-:|
| `admin/init-system` | ✅ | — | 5 |
| `admin/migrate-numeric-ids` | — | ✅ | 2 |
| `admin/migrate-resume-ids` | ✅ | — | 5 |
| `admin/user-approval` | — | ✅ | 2 |
| `ai/generate` | ✅ | — | 5 |
| `analytics/dashboard` | ✅ | ✅ | 2 |
| `auth/request-password-reset` | ✅✅ | ✅ | 2 |
| `auth/reset-password` | ✅✅ | ✅ | 2 |
| `health/infra` | ✅ | — | 5 |
| `health/route` | ✅ | — | 1 |
| `interview/assistant` | — | ✅ | 5 |
| `jobseeker/access-requests` | ✅ | — | 5 |
| `jobseeker/profile` | ✅ | ✅ | 5 |
| `profiles/analytics` | ✅ | ✅ | 3 |
| `profiles/approve-access` | — | ✅ | 3 |
| `profiles/request-access` | — | ✅ | 3 |
| `profiles/respond-access` | — | ✅ | 3 |
| `profiles/search` | ✅✅ | ✅ | 4 |
| `recruiter/bulk-actions` | ✅ | ✅ | 4 |
| `recruiter/candidates` | ✅ | ✅ | 4 |
| `recruiter/debug-resumes` | ✅ | — | 5 |
| `recruiter/interviews` | ✅ | ✅ | 4 |
| `recruiter/pipeline` | ✅ | ✅ | 4 |
| `recruiter/request-access` | ✅ | ✅ | 2 |
| `recruiter/search-resumes` | ✅ | — | 5 |
| `recruiters/approve-contact` | ✅ | ✅ | 3 |
| `recruiters/deny-contact` | ✅ | ✅ | 3 |
| `recruiters/request-contact` | ✅ | ✅ | 4 |
| `recruiters/verify-token` | ✅ | ✅ | 3 |
| `resume/compare` | — | ✅ | 3 |
| `resume/delete` | ✅ | ✅ | 2 |
| `resume/generate` | — | ✅ | 3 |
| `resume/map-id` | — | ✅ | 2 |
| `resumes/[id]/chat` | ✅ | ✅ | 4 |
| `resumes/create` | ✅ | ✅ | 4 |
| `search/ai` | — | ✅ | 2 |
| `seed/generate` | ✅ | — | 5 |
| `skills` | — | ✅ | 5 |
| `system-config` | ✅ | — | 1 |
| `user/profile` | — | ✅ | 3 |
| `user/role` | — | ✅ | 2 |
| `user/settings` | ✅ | ✅ | 3 |
| `user/update-role` | ✅ | — | 5 |
| `user/username/check` | ✅ | — | 5 |
| **helper: access-status.ts** | ✅ | — | 5 |
| **helper: search-service.ts** | ✅ | — | 5 |

**Total unique files**: 46 (44 routes + 2 helpers)  
**Scheduled across**: 5 working days  
**Day 6-7**: Verification only

---

## Appendix B: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Test regressions from DAL migration | HIGH | Medium | Run tests per-domain after each batch |
| Complex queries not expressible via base DAL | Medium | Low | `collectionRef()` escape hatch preserves full Firestore API |
| Agent creates schemas that don't match actual data | Medium | High | Template includes "read the route first" instruction |
| Agent adds eslint-disable to DAL | Low | HIGH | Audit script CHECK 8 catches this + pre-commit blocks |
| Some routes need raw `admin` access (e.g., health check introspection) | Low | Low | DAL exports `collectionRef()` for escape hatch |

---

## Appendix C: Success Metrics

| Metric | Before | Target | How to Verify |
|--------|--------|--------|-------------|
| Audit Critical | 0 | 0 | `node scripts/audit-api-routes.js` |
| Audit High | 67 | 0 | `node scripts/audit-api-routes.js` |
| Audit Medium | 0 | 0 | `node scripts/audit-api-routes.js` |
| `eslint-disable` in `src/app/api/` | 34 | 0 | `grep -r "eslint-disable" src/app/api/ -l \| wc -l` |
| Direct firebase-admin imports in routes | 33 | 0 | `grep -r "firebase-admin" src/app/api/ -l \| wc -l` |
| Routes with Zod validation | ~40 | 75 (all) | Audit VALIDATION_MISSING count |
| TypeScript errors | 0 | 0 | `npx tsc --noEmit` |
| Test pass rate | ~99% | ≥99% | `npm test` |

---

**Created**: Feb 7, 2026  
**Author**: AI-assisted architecture (Claude Opus 4.6)  
**Status**: In progress (Days 02-06 completed; Day 07 audit/tests/docs completed on Feb 7, 2026; PR #46 opened and awaiting CI/security checks before merge + production maintenance toggle)
