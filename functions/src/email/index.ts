/**
 * Barrel re-export for email sub-modules.
 *
 * Each sub-module contains a focused set of handlers:
 *   - shared.ts: utilities (links, tokens, approval config)
 *   - templates.ts: HTML / text email template builders
 *   - onUserCreated.ts: auth.user().onCreate handler
 *   - recruiterEmails.ts: recruiter request handlers
 *   - digestAndAdmin.ts: digest, suspicious-activity, cleanup
 *   - resendVerification.ts: resend-verification callable
 */

export { onUserCreatedHandler } from "./onUserCreated";
export {
  onRecruiterRequestCreatedHandler,
  onRecruiterRequestApprovedHandler,
} from "./recruiterEmails";
export {
  sendProfileViewDigestHandler,
  notifyAdminSuspiciousActivityHandler,
  cleanupAuditLogsHandler,
} from "./digestAndAdmin";
export { resendVerificationEmailHandler } from "./resendVerification";
