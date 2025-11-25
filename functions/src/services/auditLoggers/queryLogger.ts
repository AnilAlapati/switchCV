// functions/src/services/auditLoggers/queryLogger.ts
import { BaseAuditLogger } from "./baseLogger";
import type { AuditLogEntry, AuditAction, ResourceType } from "./types";

/**
 * Handles audit log queries and retrieval
 */
export class QueryAuditLogger extends BaseAuditLogger {
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
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = this.db
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
}

export const queryAuditLogger = new QueryAuditLogger();
