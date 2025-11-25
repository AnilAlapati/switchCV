"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceAuditLogger = exports.MaintenanceAuditLogger = void 0;
// functions/src/services/auditLoggers/maintenanceLogger.ts
const baseLogger_1 = require("./baseLogger");
const types_1 = require("./types");
/**
 * Handles audit log maintenance and cleanup
 */
class MaintenanceAuditLogger extends baseLogger_1.BaseAuditLogger {
    /**
     * Export audit logs as JSON or CSV
     */
    async exportAuditLogs(userId, format = "json") {
        // Get logs from queryLogger
        const { queryAuditLogger } = await Promise.resolve().then(() => __importStar(require("./queryLogger")));
        const logs = await queryAuditLogger.getUserAuditLogs(userId, 500);
        // Log this export for security
        await this.log({
            userId,
            action: types_1.AuditAction.DATA_EXPORT,
            resourceType: types_1.ResourceType.USER,
            resourceId: userId,
            details: `Exported ${logs.length} audit logs in ${format} format`,
            status: "success",
        });
        if (format === "json") {
            return JSON.stringify(logs, null, 2);
        }
        else {
            // CSV format
            const headers = Object.keys(logs[0] || {});
            const csv = [
                headers.join(","),
                ...logs.map((log) => headers
                    .map((header) => {
                    const value = log[header];
                    if (typeof value === "object") {
                        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                    }
                    return `"${String(value).replace(/"/g, '""')}"`;
                })
                    .join(",")),
            ].join("\n");
            return csv;
        }
    }
    /**
     * Cleanup old audit logs (retention policy: 90 days)
     */
    async cleanupOldLogs(retentionDays = 90) {
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
exports.MaintenanceAuditLogger = MaintenanceAuditLogger;
exports.maintenanceAuditLogger = new MaintenanceAuditLogger();
//# sourceMappingURL=maintenanceLogger.js.map