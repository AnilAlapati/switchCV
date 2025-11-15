"use strict";
// functions/src/services/auditLoggers/types.ts
/**
 * Audit log types and enums
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResourceType = exports.AuditAction = void 0;
var AuditAction;
(function (AuditAction) {
    // User actions
    AuditAction["USER_CREATED"] = "USER_CREATED";
    AuditAction["USER_UPDATED"] = "USER_UPDATED";
    AuditAction["USER_DELETED"] = "USER_DELETED";
    AuditAction["USER_ROLE_CHANGED"] = "USER_ROLE_CHANGED";
    // Authentication
    AuditAction["LOGIN_SUCCESS"] = "LOGIN_SUCCESS";
    AuditAction["LOGIN_FAILED"] = "LOGIN_FAILED";
    AuditAction["LOGOUT"] = "LOGOUT";
    AuditAction["PASSWORD_CHANGED"] = "PASSWORD_CHANGED";
    AuditAction["PASSWORD_RESET"] = "PASSWORD_RESET";
    // Profile access
    AuditAction["PROFILE_ACCESSED"] = "PROFILE_ACCESSED";
    AuditAction["PROFILE_SHARED"] = "PROFILE_SHARED";
    AuditAction["PROFILE_PUBLISHED"] = "PROFILE_PUBLISHED";
    AuditAction["PROFILE_UNPUBLISHED"] = "PROFILE_UNPUBLISHED";
    // Recruiter access
    AuditAction["RECRUITER_REQUEST_CREATED"] = "RECRUITER_REQUEST_CREATED";
    AuditAction["RECRUITER_REQUEST_APPROVED"] = "RECRUITER_REQUEST_APPROVED";
    AuditAction["RECRUITER_REQUEST_DENIED"] = "RECRUITER_REQUEST_DENIED";
    AuditAction["ACCESS_TOKEN_GENERATED"] = "ACCESS_TOKEN_GENERATED";
    AuditAction["ACCESS_TOKEN_REVOKED"] = "ACCESS_TOKEN_REVOKED";
    // Email actions
    AuditAction["EMAIL_SENT"] = "EMAIL_SENT";
    AuditAction["EMAIL_FAILED"] = "EMAIL_FAILED";
    AuditAction["EMAIL_BOUNCED"] = "EMAIL_BOUNCED";
    // Admin actions
    AuditAction["ADMIN_ACTION"] = "ADMIN_ACTION";
    AuditAction["DATA_EXPORT"] = "DATA_EXPORT";
    AuditAction["BULK_UPDATE"] = "BULK_UPDATE";
    // Security
    AuditAction["SUSPICIOUS_ACTIVITY"] = "SUSPICIOUS_ACTIVITY";
    AuditAction["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var ResourceType;
(function (ResourceType) {
    ResourceType["USER"] = "USER";
    ResourceType["PROFILE"] = "PROFILE";
    ResourceType["RESUME"] = "RESUME";
    ResourceType["RECRUITER_REQUEST"] = "RECRUITER_REQUEST";
    ResourceType["ACCESS_TOKEN"] = "ACCESS_TOKEN";
    ResourceType["EMAIL"] = "EMAIL";
    ResourceType["SYSTEM"] = "SYSTEM";
})(ResourceType || (exports.ResourceType = ResourceType = {}));
//# sourceMappingURL=types.js.map