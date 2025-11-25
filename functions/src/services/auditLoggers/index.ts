// functions/src/services/auditLoggers/index.ts
/**
 * Unified Audit Logger Export
 * Combines all domain-specific and maintenance loggers
 */

import { BaseAuditLogger } from "./baseLogger";
import { queryAuditLogger } from "./queryLogger";
import { maintenanceAuditLogger } from "./maintenanceLogger";
import { domainAuditLoggers } from "./domainLoggers";

export type { AuditLogEntry } from "./types";
export { AuditAction, ResourceType } from "./types";

/**
 * Unified AuditLogger that combines all functionality
 */
export class AuditLogger extends BaseAuditLogger {
  // Query operations
  getUserAuditLogs = queryAuditLogger.getUserAuditLogs.bind(queryAuditLogger);
  getResourceAuditLogs =
    queryAuditLogger.getResourceAuditLogs.bind(queryAuditLogger);
  getAuditLogsByDateRange =
    queryAuditLogger.getAuditLogsByDateRange.bind(queryAuditLogger);

  // Maintenance operations
  exportAuditLogs = maintenanceAuditLogger.exportAuditLogs.bind(
    maintenanceAuditLogger
  );
  cleanupOldLogs = maintenanceAuditLogger.cleanupOldLogs.bind(
    maintenanceAuditLogger
  );

  // Domain operations
  logUserCreated = domainAuditLoggers.logUserCreated.bind(domainAuditLoggers);
  logProfileAccessed =
    domainAuditLoggers.logProfileAccessed.bind(domainAuditLoggers);
  logRecruiterRequest =
    domainAuditLoggers.logRecruiterRequest.bind(domainAuditLoggers);
  logAccessToken = domainAuditLoggers.logAccessToken.bind(domainAuditLoggers);
  logEmailSent = domainAuditLoggers.logEmailSent.bind(domainAuditLoggers);
  logLogin = domainAuditLoggers.logLogin.bind(domainAuditLoggers);
  logSuspiciousActivity =
    domainAuditLoggers.logSuspiciousActivity.bind(domainAuditLoggers);
}

// Export singleton
export const auditLogger = new AuditLogger();
