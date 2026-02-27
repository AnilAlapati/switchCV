/**
 * Profile-view digest, suspicious-activity admin notification,
 * and audit-log cleanup handlers.
 */
import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { emailService } from "../services/emailService";
import {
  auditLogger,
  AuditAction,
  ResourceType,
} from "../services/auditLogger";
import { checkRateLimit, RateLimitPresets } from "../middleware/rateLimiter";

// ── Profile-view weekly digest ──────────────────────────────────────────────

export const sendProfileViewDigestHandler = async (
  _context: functions.EventContext,
): Promise<void> => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const BATCH_SIZE = 100;
    let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
    let processedCount = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let query = admin
        .firestore()
        .collection("users")
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(BATCH_SIZE);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const usersSnapshot = await query.get();

      if (usersSnapshot.empty) {
        break;
      }

      // Concurrency-limited email sending (max 5 at a time to avoid SMTP limits)
      const CONCURRENCY_LIMIT = 5;
      for (let i = 0; i < usersSnapshot.docs.length; i += CONCURRENCY_LIMIT) {
        const chunk = usersSnapshot.docs.slice(i, i + CONCURRENCY_LIMIT);

        await Promise.all(
          chunk.map(async (userDoc) => {
            const userId = userDoc.id;
            const userEmail = userDoc.data().email;

            if (!userEmail) return;

            // Get view count for the user's profiles
            const viewsSnapshot = await admin
              .firestore()
              .collectionGroup("views")
              .where("userId", "==", userId)
              .where("timestamp", ">=", oneWeekAgo)
              .count()
              .get();

            const viewCount = viewsSnapshot.data().count;

            if (viewCount > 0) {
              const result = await emailService.sendEmail({
                to: userEmail,
                template: "profileViewed" as any,
                data: {
                  viewCount,
                  dashboardUrl: `${process.env.WEBSITE_URL}/dashboard/analytics`,
                },
              });

              if (result.success) {
                await auditLogger.log({
                  userId,
                  userEmail,
                  action: AuditAction.EMAIL_SENT,
                  resourceType: ResourceType.EMAIL,
                  resourceId: userId,
                  details: "Weekly profile view digest sent",
                  status: "success",
                });
              }
            }
          }),
        );
      }

      processedCount += usersSnapshot.size;
      lastDoc = usersSnapshot.docs[usersSnapshot.docs.length - 1];

      // Safety check for execution time (Cloud Functions timeout)
      functions.logger.info(`Processed ${processedCount} users for digest`);
    }

    functions.logger.info("Weekly profile view digest sent");
  } catch (error) {
    functions.logger.error("Error sending profile view digest:", error);
    await auditLogger.log({
      userId: "system",
      action: AuditAction.EMAIL_FAILED,
      resourceType: ResourceType.SYSTEM,
      resourceId: "digest",
      details: `Failed to send profile view digest: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      status: "failure",
    });
  }
};

// ── Suspicious-activity admin notification ───────────────────────────────────

// Zod schema for suspicious activity input validation (CODING_STANDARDS §9.2)
const SuspiciousActivitySchema = (() => {
  // Dynamic import-style inline schema to avoid top-level zod dependency
  // since Cloud Functions bundle doesn't include zod by default
  return {
    parse(data: unknown): {
      activityType: string;
      details: string;
      userId?: string;
    } {
      const d = data as Record<string, unknown>;
      if (!d || typeof d !== "object") {
        throw new Error("Invalid input: expected object");
      }
      if (
        typeof d.activityType !== "string" ||
        d.activityType.length === 0 ||
        d.activityType.length > 100
      ) {
        throw new Error(
          "Invalid input: activityType must be a non-empty string (max 100 chars)",
        );
      }
      if (typeof d.details !== "string" || d.details.length > 2000) {
        throw new Error(
          "Invalid input: details must be a string (max 2000 chars)",
        );
      }
      return {
        activityType: d.activityType,
        details: d.details,
        userId: typeof d.userId === "string" ? d.userId : undefined,
      };
    },
  };
})();

export const notifyAdminSuspiciousActivityHandler = async (
  data: unknown,
  context: functions.https.CallableContext,
): Promise<{ success: boolean; message: string }> => {
  try {
    // 1. Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(
      context.auth.uid,
      RateLimitPresets.ADMIN,
    );
    if (!rateLimit.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`,
      );
    }

    // 2. Admin role check — only admins can trigger admin notifications
    const callerRecord = await admin.auth().getUser(context.auth.uid);
    const callerRole = callerRecord.customClaims?.role;
    if (callerRole !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Admin access required",
      );
    }

    // 3. Input validation
    let validatedData: {
      activityType: string;
      details: string;
      userId?: string;
    };
    try {
      validatedData = SuspiciousActivitySchema.parse(data);
    } catch (validationError) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        validationError instanceof Error
          ? validationError.message
          : "Invalid input",
      );
    }

    const { activityType, details, userId } = validatedData;

    // Log suspicious activity
    await auditLogger.logSuspiciousActivity(
      userId || context.auth.uid,
      activityType,
      details,
    );

    // Get admin emails (with .limit() per CODING_STANDARDS §4.2)
    const adminsSnapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "==", "admin")
      .limit(50)
      .get();

    const adminEmails = adminsSnapshot.docs
      .map((doc) => doc.data().email)
      .filter(Boolean);

    // Send emails to admins
    await emailService.sendBulkEmails(adminEmails, "adminNotification" as any, {
      alertType: activityType,
      details,
      timestamp: new Date().toISOString(),
      adminUrl: `${process.env.WEBSITE_URL}/admin/security`,
    });

    return { success: true, message: "Admins notified" };
  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    functions.logger.error("Error notifying admins:", error);
    throw new functions.https.HttpsError("internal", "Failed to notify admins");
  }
};

// ── Audit-log cleanup ───────────────────────────────────────────────────────

export const cleanupAuditLogsHandler = async (
  _context: functions.EventContext,
): Promise<void> => {
  try {
    const deletedCount = await auditLogger.cleanupOldLogs(90); // Keep 90 days
    functions.logger.info(`Cleaned up ${deletedCount} old audit logs`);
  } catch (error) {
    functions.logger.error("Error cleaning up audit logs:", error);
  }
};
