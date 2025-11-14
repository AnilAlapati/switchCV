import * as admin from "firebase-admin";

/**
 * Audit Log Service
 * Tracks all sensitive operations for compliance and security
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

export class AuditLogger {
  private db: FirebaseFirestore.Firestore;
  private collectionName = "auditLogs";

  constructor(db: FirebaseFirestore.Firestore = admin.firestore()) {
    this.db = db;
  }

  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, "id" | "timestamp">): Promise<string> {
    try {
      const auditEntry: AuditLogEntry = {
        ...entry,
        timestamp: new Date(),
      };

      const docRef = await this.db
        .collection(this.collectionName)
        .add(auditEntry);
      console.log(
        `[AUDIT LOG] ${entry.action} for ${entry.resourceType} ${entry.resourceId}`
      );

      return docRef.id;
    } catch (error) {
      console.error("Failed to write audit log:", error);
      throw error;
    }
  }

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

  /**
   * Get audit logs for a user
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    const snapshot = await this.db
      .collection(this.collectionName)
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        } as AuditLogEntry)
    );
  }

  /**
   * Get audit logs for a resource
   */
  async getResourceAuditLogs(
    resourceId: string,
    resourceType?: ResourceType,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    let query = this.db
      .collection(this.collectionName)
      .where("resourceId", "==", resourceId);

    if (resourceType) {
      query = query.where("resourceType", "==", resourceType);
    }

    const snapshot = await query
      .orderBy("timestamp", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        } as AuditLogEntry)
    );
  }

  /**
   * Get audit logs for a date range
   */
  async getAuditLogsByDateRange(
    startDate: Date,
    endDate: Date,
    action?: AuditAction
  ): Promise<AuditLogEntry[]> {
    let query = this.db
      .collection(this.collectionName)
      .where("timestamp", ">=", startDate)
      .where("timestamp", "<=", endDate);

    if (action) {
      query = query.where("action", "==", action);
    }

    const snapshot = await query.orderBy("timestamp", "desc").get();

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        } as AuditLogEntry)
    );
  }

  /**
   * Export audit logs as JSON
   */
  async exportAuditLogs(
    userId: string,
    format: "json" | "csv" = "json"
  ): Promise<string> {
    const logs = await this.getUserAuditLogs(userId, 500);

    // Log this export for security
    await this.log({
      userId,
      action: AuditAction.DATA_EXPORT,
      resourceType: ResourceType.USER,
      resourceId: userId,
      details: `Exported ${logs.length} audit logs in ${format} format`,
      status: "success",
    });

    if (format === "json") {
      return JSON.stringify(logs, null, 2);
    } else {
      // CSV format
      const headers = Object.keys(logs[0] || {});
      const csv = [
        headers.join(","),
        ...logs.map((log) =>
          headers
            .map((header) => {
              const value = (log as any)[header];
              if (typeof value === "object") {
                return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
              }
              return `"${String(value).replace(/"/g, '""')}"`;
            })
            .join(",")
        ),
      ].join("\n");
      return csv;
    }
  }

  /**
   * Cleanup old audit logs (retention policy: 90 days)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const snapshot = await this.db
      .collection(this.collectionName)
      .where("timestamp", "<", cutoffDate)
      .limit(100) // Delete in batches to avoid hitting limits
      .get();

    const batch = this.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
  }
}

// Export singleton
export const auditLogger = new AuditLogger();
