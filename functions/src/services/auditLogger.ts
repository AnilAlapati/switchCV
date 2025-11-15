/**
 * Audit Logger - Refactored
 * This file re-exports from the modular audit logger implementation
 */

export type { AuditLogEntry } from "./auditLoggers";
export {
  AuditAction,
  ResourceType,
  auditLogger,
  AuditLogger,
} from "./auditLoggers";
