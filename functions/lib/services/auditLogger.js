"use strict";
/**
 * Audit Logger - Refactored
 * This file re-exports from the modular audit logger implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = exports.auditLogger = exports.ResourceType = exports.AuditAction = void 0;
var auditLoggers_1 = require("./auditLoggers");
Object.defineProperty(exports, "AuditAction", { enumerable: true, get: function () { return auditLoggers_1.AuditAction; } });
Object.defineProperty(exports, "ResourceType", { enumerable: true, get: function () { return auditLoggers_1.ResourceType; } });
Object.defineProperty(exports, "auditLogger", { enumerable: true, get: function () { return auditLoggers_1.auditLogger; } });
Object.defineProperty(exports, "AuditLogger", { enumerable: true, get: function () { return auditLoggers_1.AuditLogger; } });
//# sourceMappingURL=auditLogger.js.map