# SwitchCV Database Schema

## Overview

SwitchCV uses Google Cloud Firestore as its primary database. The data model is document-oriented.

## Collections

### `users`

Stores user profile information and settings.

- `uid` (string): User ID (PK)
- `email` (string): User email
- `displayName` (string): Display name
- `isRecruiter` (boolean): Role flag
- `subscriptionTier` (string): "basic" | "premium" | "enterprise"
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### `resumes`

Stores published resumes visible to recruiters.

- `resumeId` (number): Numeric ID (PK)
- `userId` (string): Owner ID
- `profile` (object): Full resume content (skills, experience, etc.)
- `embedding` (array<number>): Vector embedding for AI search
- `isBeingEdited` (boolean): Lock flag
- `publishedAt` (timestamp)

### `drafts`

Stores work-in-progress resumes.

- `draftId` (string): Alphanumeric ID (PK)
- `userId` (string): Owner ID
- `profile` (object): Draft content
- `resumeId` (number): Linked published ID (if any)

### `recruiterRequests`

Tracks contact requests from recruiters to candidates.

- `id` (string): Request ID (PK)
- `fromRecruiter` (object): Recruiter details
- `toUserId` (string): Candidate ID
- `status` (string): "pending" | "approved" | "denied"
- `createdAt` (timestamp)

### `analytics`

Stores aggregated analytics data.

- `slug` (string): Profile slug (PK)
- `views` (object): View counts and metadata
- `engagement` (object): Engagement metrics

### `auditLogs`

Stores security and compliance logs.

- `id` (string): Log ID (PK)
- `action` (string): Action type (e.g., "EMAIL_SENT", "PROFILE_VIEW")
- `actor` (string): User ID who performed the action
- `timestamp` (timestamp)

### `searchQuotas`

Tracks AI search usage for recruiters.

- `userId` (string): Recruiter ID (PK)
- `month` (string): YYYY-MM
- `usage` (number): Count of searches used
- `tier` (string): Snapshot of tier at time of usage

## Indexes

See `firestore.indexes.json` for composite index definitions required for complex queries.

## Security Rules

Access is controlled via `firestore.rules`.

- Users can only read/write their own data.
- Recruiters can read published resumes but not drafts.
- Admins have elevated privileges.
