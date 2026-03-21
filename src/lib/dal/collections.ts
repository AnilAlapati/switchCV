/**
 * src/lib/dal/collections.ts
 *
 * Single source of truth for Firestore collection names.
 */

export const COLLECTIONS = {
  USERS: "users",
  PROFILES: "profiles",
  USERNAMES: "usernames",
  SYSTEM: "system",
  CONFIG: "config",

  RESUMES: "resumes",
  RESUME_PROFILES: "resumeProfiles",
  DRAFTS: "drafts",
  ALL_RESUMES: "allResumes",

  RECRUITER_REQUESTS: "recruiterRequests",
  RECRUITER_NOTIFICATIONS: "recruiterNotifications",
  RECRUITER_INTERVIEWS: "recruiterInterviews",
  RECRUITER_PIPELINES: "recruiterPipelines",
  RECRUITER_CANDIDATES: "recruiterCandidates",
  RECRUITER_BULK_ACTIONS: "recruiterBulkActions",
  RECRUITER_METRICS: "recruiterMetrics",
  NOTIFICATIONS: "notifications",
  ACCESS_TOKENS: "accessTokens",
  ADMIN_NOTIFICATIONS: "adminNotifications",

  PASSWORD_RESET_TOKENS: "passwordResetTokens",
  AUDIT_LOGS: "auditLogs",
  PROFILE_ACCESS_LOGS: "profileAccessLogs",

  AI_USAGE_LOGS: "aiUsageLogs",
  AI_AUDIT_LOGS: "aiAuditLogs",
  SEARCH_QUOTAS: "searchQuotas",

  MAIL: "mail",

  MONITORING: "monitoring",

  SEED_GENERATION_LOGS: "seedGenerationLogs",

  CONVERSATION_SESSIONS: "conversationSessions",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
