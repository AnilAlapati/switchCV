"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryAuditLogger = exports.QueryAuditLogger = void 0;
// functions/src/services/auditLoggers/queryLogger.ts
const baseLogger_1 = require("./baseLogger");
/**
 * Handles audit log queries and retrieval
 */
class QueryAuditLogger extends baseLogger_1.BaseAuditLogger {
    /**
     * Get audit logs for a user
     */
    async getUserAuditLogs(userId, limit = 100) {
        const snapshot = await this.db
            .collection(this.collectionName)
            .where("userId", "==", userId)
            .orderBy("timestamp", "desc")
            .limit(limit)
            .get();
        return snapshot.docs.map((doc) => {
            var _a;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { timestamp: ((_a = doc.data().timestamp) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date() }));
        });
    }
    /**
     * Get audit logs for a resource
     */
    async getResourceAuditLogs(resourceId, resourceType, limit = 100) {
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
        return snapshot.docs.map((doc) => {
            var _a;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { timestamp: ((_a = doc.data().timestamp) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date() }));
        });
    }
    /**
     * Get audit logs for a date range
     */
    async getAuditLogsByDateRange(startDate, endDate, action) {
        let query = this.db
            .collection(this.collectionName)
            .where("timestamp", ">=", startDate)
            .where("timestamp", "<=", endDate);
        if (action) {
            query = query.where("action", "==", action);
        }
        const snapshot = await query.orderBy("timestamp", "desc").get();
        return snapshot.docs.map((doc) => {
            var _a;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { timestamp: ((_a = doc.data().timestamp) === null || _a === void 0 ? void 0 : _a.toDate()) || new Date() }));
        });
    }
}
exports.QueryAuditLogger = QueryAuditLogger;
exports.queryAuditLogger = new QueryAuditLogger();
//# sourceMappingURL=queryLogger.js.map