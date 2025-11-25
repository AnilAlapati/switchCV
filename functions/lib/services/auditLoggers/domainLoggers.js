"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.domainAuditLoggers = exports.DomainAuditLoggers = void 0;
// functions/src/services/auditLoggers/domainLoggers.ts
const baseLogger_1 = require("./baseLogger");
const types_1 = require("./types");
/**
 * Domain-specific audit loggers for different features
 */
class DomainAuditLoggers extends baseLogger_1.BaseAuditLogger {
    /**
     * Log user creation
     */
    async logUserCreated(userId, email, metadata) {
        return this.log({
            userId,
            userEmail: email,
            action: types_1.AuditAction.USER_CREATED,
            resourceType: types_1.ResourceType.USER,
            resourceId: userId,
            changes: {
                after: Object.assign({ email }, metadata),
            },
            status: "success",
        });
    }
    /**
     * Log profile access
     */
    async logProfileAccessed(userId, profileId, accessType) {
        return this.log({
            userId,
            action: types_1.AuditAction.PROFILE_ACCESSED,
            resourceType: types_1.ResourceType.PROFILE,
            resourceId: profileId,
            details: `Profile accessed as: ${accessType}`,
            status: "success",
        });
    }
    /**
     * Log recruiter request
     */
    async logRecruiterRequest(requestId, recruiterId, candidateId, action, approved) {
        return this.log({
            userId: recruiterId,
            action,
            resourceType: types_1.ResourceType.RECRUITER_REQUEST,
            resourceId: requestId,
            details: approved !== undefined
                ? `Request ${approved ? "approved" : "denied"}`
                : undefined,
            status: "success",
        });
    }
    /**
     * Log access token generation
     */
    async logAccessToken(recruiterId, candidateId, tokenId, action) {
        return this.log({
            userId: recruiterId,
            action,
            resourceType: types_1.ResourceType.ACCESS_TOKEN,
            resourceId: tokenId,
            details: `Access token for candidate: ${candidateId}`,
            status: "success",
        });
    }
    /**
     * Log email sent
     */
    async logEmailSent(userId, emailAddress, template, success, error) {
        return this.log({
            userId,
            userEmail: emailAddress,
            action: success ? types_1.AuditAction.EMAIL_SENT : types_1.AuditAction.EMAIL_FAILED,
            resourceType: types_1.ResourceType.EMAIL,
            resourceId: emailAddress,
            details: `Template: ${template}${error ? `, Error: ${error}` : ""}`,
            status: success ? "success" : "failure",
        });
    }
    /**
     * Log login attempt
     */
    async logLogin(userId, email, success) {
        return this.log({
            userId,
            userEmail: email,
            action: success ? types_1.AuditAction.LOGIN_SUCCESS : types_1.AuditAction.LOGIN_FAILED,
            resourceType: types_1.ResourceType.USER,
            resourceId: userId,
            status: success ? "success" : "failure",
        });
    }
    /**
     * Log suspicious activity
     */
    async logSuspiciousActivity(userId, activityType, details) {
        return this.log({
            userId,
            action: types_1.AuditAction.SUSPICIOUS_ACTIVITY,
            resourceType: types_1.ResourceType.SYSTEM,
            resourceId: userId,
            details: `${activityType}: ${details}`,
            status: "success",
        });
    }
}
exports.DomainAuditLoggers = DomainAuditLoggers;
exports.domainAuditLoggers = new DomainAuditLoggers();
//# sourceMappingURL=domainLoggers.js.map