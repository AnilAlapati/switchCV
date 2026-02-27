/**
 * emailFunctions.ts - Barrel re-export
 *
 * All implementation has been moved to functions/src/email/*.ts:
 *   - email/shared.ts          - utilities (links, tokens, approval config)
 *   - email/templates.ts       - HTML / text email template builders
 *   - email/onUserCreated.ts   - auth.user().onCreate handler
 *   - email/recruiterEmails.ts - recruiter-request handlers
 *   - email/digestAndAdmin.ts  - digest, suspicious-activity, cleanup
 *   - email/resendVerification.ts - resend-verification callable
 *
 * This file exists so that dynamic imports in index.ts
 * (await import("./emailFunctions")) continue to resolve unchanged.
 */

export {
  onUserCreatedHandler,
  onRecruiterRequestCreatedHandler,
  onRecruiterRequestApprovedHandler,
  sendProfileViewDigestHandler,
  notifyAdminSuspiciousActivityHandler,
  cleanupAuditLogsHandler,
  resendVerificationEmailHandler,
} from "./email";
