// functions/src/services/auditLoggers/baseLogger.ts
import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import type { AuditLogEntry } from "./types";

/**
 * Base audit logger for core logging operations
 */
export class BaseAuditLogger {
  private _db?: FirebaseFirestore.Firestore;
  protected collectionName = "auditLogs";

  constructor(db?: FirebaseFirestore.Firestore) {
    this._db = db;
  }

  protected get db(): FirebaseFirestore.Firestore {
    if (!this._db) {
      if (!admin.apps.length) {
        admin.initializeApp();
      }
      this._db = admin.firestore();
    }
    return this._db;
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
      functions.logger.info(
        `[AUDIT LOG] ${entry.action} for ${entry.resourceType} ${entry.resourceId}`
      );

      return docRef.id;
    } catch (error) {
      functions.logger.error("Failed to write audit log:", error);
      throw error;
    }
  }
}
