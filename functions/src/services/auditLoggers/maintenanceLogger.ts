// functions/src/services/auditLoggers/maintenanceLogger.ts
import { BaseAuditLogger } from "./baseLogger";
import { AuditAction, ResourceType } from "./types";

/**
 * Handles audit log maintenance and cleanup
 */
export class MaintenanceAuditLogger extends BaseAuditLogger {
  /**
   * Export audit logs as JSON or CSV
   */
  async exportAuditLogs(
    userId: string,
    format: "json" | "csv" = "json"
  ): Promise<string> {
    // Get logs from queryLogger
    const { queryAuditLogger } = await import("./queryLogger");
    const logs = await queryAuditLogger.getUserAuditLogs(userId, 500);

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

export const maintenanceAuditLogger = new MaintenanceAuditLogger();
