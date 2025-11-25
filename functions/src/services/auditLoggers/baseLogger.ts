// functions/src/services/auditLoggers/baseLogger.ts
import * as admin from "firebase-admin";
import type { AuditLogEntry } from "./types";

/**
 * Base audit logger for core logging operations
 */
export class BaseAuditLogger {
  protected db: FirebaseFirestore.Firestore;
  protected collectionName = "auditLogs";

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
}
