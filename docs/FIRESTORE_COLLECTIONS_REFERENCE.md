# Firestore Collections Reference

This document catalogs all Firestore collections, their purposes, and structure.

---

## Core User Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `users` | User accounts and profiles | `uid`, `email`, `role` (jobseeker/recruiter), `subscriptionTier` |
| `profiles/{userId}` | Extended user profile data | Subcollection under user |
| `usernames` | Username reservation lookup | `uid` → username mapping |

---

## Resume Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `resumes` | Published resumes (sequential IDs) | `userId`, `isPublic`, `isBeingEdited`, `embedding` |
| `drafts` | Unpublished draft resumes | `userId`, `createdAt` |
| `resumeProfiles` | Legacy resume profiles | `userId` + subcollections |
| `allResumes` | Global recruiter search index | Denormalized resume data |
| `draftIdMapping` | Draft ID uniqueness tracking | Backend only |

> **Note:** Resume IDs are sequential integers starting from 1. The `system/ids` document tracks the next available ID.

---

## Access Control Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `resumes/{id}/accessRequests` | Resume access requests | `fromUserId`, `status`, `timestamp` |
| `resumes/{id}/accessGrants` | Granted access records | `toUserId`, `grantedAt` |
| `recruiterRequests` | Recruiter contact requests | `fromRecruiter.recruiterId`, `toUserId`, `status` |
| `accessTokens` | PII access tokens | `recruiterId`, `userId` |
| `accessTokenAudit` | Token usage audit trail | Backend only |

---

## Notifications

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `notifications` | General user notifications | `recipientId`, `createdAt` |
| `recruiterNotifications` | Recruiter-specific notifications | `recruiterId` |
| `adminNotifications` | Admin review notifications | Admin only |
| `notification_logs` | Notification delivery logs | `notificationId`, `timestamp` |

---

## Analytics & Metrics

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `analytics/{slug}` | Resume view analytics | `userId` + subcollections |
| `analytics/{slug}/events` | Individual view events | `eventType`, `timestamp` |
| `jobSeekerMetrics` | Job seeker aggregated stats | `userId` |
| `recruiterMetrics` | Recruiter aggregated stats | `userId` |
| `recruiterSearchHistory` | Search query history | `recruiterId`, `createdAt` |
| `searchQuotas` | Monthly search quota tracking | `userId`, `month` |

---

## Audit & Logging

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `auditLogs` | Compliance audit trail | `userId`, `resourceType`, `resourceId`, `timestamp` |
| `emailLogs` | Email delivery tracking | `userId` |

---

## System Collections

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `system/ids` | Sequential ID generator | `nextResumeId` |
| `system/billing` | Billing configuration | Backend only |
| `config/system` | System configuration | Backend only |
| `templates` | Resume templates (read-only) | Public assets |

---

## Authentication Tokens

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `verificationTokens` | Email verification tokens | Backend only |
| `passwordResetTokens` | Password reset tokens | Backend only |

---

## Caching

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `semanticCache` | AI response caching | `queryHash`, `embedding`, `createdAt` |

---

## Support

| Collection | Purpose | Key Fields |
|------------|---------|------------|
| `supportFeedback` | User support/feedback submissions | See service code |

---

## Indexes Summary

The following composite indexes are defined in `firestore.indexes.json`:

- **accessRequests**: `fromUserId` + `timestamp`, `fromUserId` + `status`
- **auditLogs**: `resourceType` + `resourceId` + `timestamp`, `userId` + `timestamp`
- **drafts**: `userId` + `createdAt`
- **events**: `eventType` + `timestamp`
- **notification_logs**: `notificationId` + `timestamp`
- **notifications**: `recipientId` + `createdAt`
- **recruiterRequests**: `fromRecruiter.recruiterId` + `status`
- **recruiterSearchHistory**: `recruiterId` + `createdAt`
- **resumes**: `isBeingEdited` + `embedding` + `updatedAt`, `published` + `createdAt`
- **searchQuotas**: `userId` + `month`
- **users**: `role` + `lastLoginAt`

---

## Dev vs Prod Sync Checklist

To verify synchronization between environments:

1. [ ] Compare `system/ids` → `nextResumeId` value
2. [ ] Count documents in `resumes` collection
3. [ ] Verify all indexes are deployed
4. [ ] Check `users` collection structure matches
5. [ ] Verify Firebase extensions are consistent

