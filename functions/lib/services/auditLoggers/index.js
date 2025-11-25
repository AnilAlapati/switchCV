"use strict";
// functions/src/services/auditLoggers/index.ts
/**
 * Unified Audit Logger Export
 * Combines all domain-specific and maintenance loggers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogger = exports.AuditLogger = exports.ResourceType = exports.AuditAction = void 0;
const baseLogger_1 = require("./baseLogger");
const queryLogger_1 = require("./queryLogger");
const maintenanceLogger_1 = require("./maintenanceLogger");
const domainLoggers_1 = require("./domainLoggers");
var types_1 = require("./types");
Object.defineProperty(exports, "AuditAction", { enumerable: true, get: function () { return types_1.AuditAction; } });
Object.defineProperty(exports, "ResourceType", { enumerable: true, get: function () { return types_1.ResourceType; } });
/**
 * Unified AuditLogger that combines all functionality
 */
class AuditLogger extends baseLogger_1.BaseAuditLogger {
    constructor() {
        super(...arguments);
        // Query operations
        this.getUserAuditLogs = queryLogger_1.queryAuditLogger.getUserAuditLogs.bind(queryLogger_1.queryAuditLogger);
        this.getResourceAuditLogs = queryLogger_1.queryAuditLogger.getResourceAuditLogs.bind(queryLogger_1.queryAuditLogger);
        this.getAuditLogsByDateRange = queryLogger_1.queryAuditLogger.getAuditLogsByDateRange.bind(queryLogger_1.queryAuditLogger);
        // Maintenance operations
        this.exportAuditLogs = maintenanceLogger_1.maintenanceAuditLogger.exportAuditLogs.bind(maintenanceLogger_1.maintenanceAuditLogger);
        this.cleanupOldLogs = maintenanceLogger_1.maintenanceAuditLogger.cleanupOldLogs.bind(maintenanceLogger_1.maintenanceAuditLogger);
        // Domain operations
        this.logUserCreated = domainLoggers_1.domainAuditLoggers.logUserCreated.bind(domainLoggers_1.domainAuditLoggers);
        this.logProfileAccessed = domainLoggers_1.domainAuditLoggers.logProfileAccessed.bind(domainLoggers_1.domainAuditLoggers);
        this.logRecruiterRequest = domainLoggers_1.domainAuditLoggers.logRecruiterRequest.bind(domainLoggers_1.domainAuditLoggers);
        this.logAccessToken = domainLoggers_1.domainAuditLoggers.logAccessToken.bind(domainLoggers_1.domainAuditLoggers);
        this.logEmailSent = domainLoggers_1.domainAuditLoggers.logEmailSent.bind(domainLoggers_1.domainAuditLoggers);
        this.logLogin = domainLoggers_1.domainAuditLoggers.logLogin.bind(domainLoggers_1.domainAuditLoggers);
        this.logSuspiciousActivity = domainLoggers_1.domainAuditLoggers.logSuspiciousActivity.bind(domainLoggers_1.domainAuditLoggers);
    }
}
exports.AuditLogger = AuditLogger;
// Export singleton
exports.auditLogger = new AuditLogger();
//# sourceMappingURL=index.js.map