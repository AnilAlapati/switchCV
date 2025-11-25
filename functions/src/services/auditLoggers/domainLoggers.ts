// functions/src/services/auditLoggers/domainLoggers.ts
import { BaseAuditLogger } from "./baseLogger";
import { AuditAction, ResourceType } from "./types";

/**
 * Domain-specific audit loggers for different features
 */
export class DomainAuditLoggers extends BaseAuditLogger {
  /**
   * Log user creation
   */
  async logUserCreated(
    userId: string,
    email: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    return this.log({
      userId,
      userEmail: email,
      action: AuditAction.USER_CREATED,
      resourceType: ResourceType.USER,
      resourceId: userId,
      changes: {
        after: { email, ...metadata },
      },
      status: "success",
    });
  }

  /**
   * Log profile access
   */
  async logProfileAccessed(
    userId: string,
    profileId: string,
    accessType: "own" | "recruiter" | "public"
  ): Promise<string> {
    return this.log({
      userId,
      action: AuditAction.PROFILE_ACCESSED,
      resourceType: ResourceType.PROFILE,
      resourceId: profileId,
      details: `Profile accessed as: ${accessType}`,
      status: "success",
    });
  }

  /**
   * Log recruiter request
   */
  async logRecruiterRequest(
    requestId: string,
    recruiterId: string,
    candidateId: string,
    action: AuditAction,
    approved?: boolean
  ): Promise<string> {
    return this.log({
      userId: recruiterId,
      action,
      resourceType: ResourceType.RECRUITER_REQUEST,
      resourceId: requestId,
      details:
        approved !== undefined
          ? `Request ${approved ? "approved" : "denied"}`
          : undefined,
      status: "success",
    });
  }

  /**
   * Log access token generation
   */
  async logAccessToken(
    recruiterId: string,
    candidateId: string,
    tokenId: string,
    action: AuditAction
  ): Promise<string> {
    return this.log({
      userId: recruiterId,
      action,
      resourceType: ResourceType.ACCESS_TOKEN,
      resourceId: tokenId,
      details: `Access token for candidate: ${candidateId}`,
      status: "success",
    });
  }

  /**
   * Log email sent
   */
  async logEmailSent(
    userId: string,
    emailAddress: string,
    template: string,
    success: boolean,
    error?: string
  ): Promise<string> {
    return this.log({
      userId,
      userEmail: emailAddress,
      action: success ? AuditAction.EMAIL_SENT : AuditAction.EMAIL_FAILED,
      resourceType: ResourceType.EMAIL,
      resourceId: emailAddress,
      details: `Template: ${template}${error ? `, Error: ${error}` : ""}`,
      status: success ? "success" : "failure",
    });
  }

  /**
   * Log login attempt
   */
  async logLogin(
    userId: string,
    email: string,
    success: boolean
  ): Promise<string> {
    return this.log({
      userId,
      userEmail: email,
      action: success ? AuditAction.LOGIN_SUCCESS : AuditAction.LOGIN_FAILED,
      resourceType: ResourceType.USER,
      resourceId: userId,
      status: success ? "success" : "failure",
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    userId: string,
    activityType: string,
    details: string
  ): Promise<string> {
    return this.log({
      userId,
      action: AuditAction.SUSPICIOUS_ACTIVITY,
      resourceType: ResourceType.SYSTEM,
      resourceId: userId,
      details: `${activityType}: ${details}`,
      status: "success",
    });
  }
}

export const domainAuditLoggers = new DomainAuditLoggers();
