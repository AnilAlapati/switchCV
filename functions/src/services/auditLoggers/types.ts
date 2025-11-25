// functions/src/services/auditLoggers/types.ts
/**
 * Audit log types and enums
 */

export interface AuditLogEntry {
  id?: string;
  timestamp: Date;
  userId: string;
  userEmail?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  status: "success" | "failure";
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

export enum AuditAction {
  // User actions
  USER_CREATED = "USER_CREATED",
  USER_UPDATED = "USER_UPDATED",
  USER_DELETED = "USER_DELETED",
  USER_ROLE_CHANGED = "USER_ROLE_CHANGED",

  // Authentication
  LOGIN_SUCCESS = "LOGIN_SUCCESS",
  LOGIN_FAILED = "LOGIN_FAILED",
  LOGOUT = "LOGOUT",
  PASSWORD_CHANGED = "PASSWORD_CHANGED",
  PASSWORD_RESET = "PASSWORD_RESET",

  // Profile access
  PROFILE_ACCESSED = "PROFILE_ACCESSED",
  PROFILE_SHARED = "PROFILE_SHARED",
  PROFILE_PUBLISHED = "PROFILE_PUBLISHED",
  PROFILE_UNPUBLISHED = "PROFILE_UNPUBLISHED",

  // Recruiter access
  RECRUITER_REQUEST_CREATED = "RECRUITER_REQUEST_CREATED",
  RECRUITER_REQUEST_APPROVED = "RECRUITER_REQUEST_APPROVED",
  RECRUITER_REQUEST_DENIED = "RECRUITER_REQUEST_DENIED",
  ACCESS_TOKEN_GENERATED = "ACCESS_TOKEN_GENERATED",
  ACCESS_TOKEN_REVOKED = "ACCESS_TOKEN_REVOKED",

  // Email actions
  EMAIL_SENT = "EMAIL_SENT",
  EMAIL_FAILED = "EMAIL_FAILED",
  EMAIL_BOUNCED = "EMAIL_BOUNCED",

  // Admin actions
  ADMIN_ACTION = "ADMIN_ACTION",
  DATA_EXPORT = "DATA_EXPORT",
  BULK_UPDATE = "BULK_UPDATE",

  // Security
  SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
}

export enum ResourceType {
  USER = "USER",
  PROFILE = "PROFILE",
  RESUME = "RESUME",
  RECRUITER_REQUEST = "RECRUITER_REQUEST",
  ACCESS_TOKEN = "ACCESS_TOKEN",
  EMAIL = "EMAIL",
  SYSTEM = "SYSTEM",
}
