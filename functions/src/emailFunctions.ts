import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { emailService } from "./services/emailService";
import { auditLogger, AuditAction, ResourceType } from "./services/auditLogger";

// ==================== EMAIL FUNCTIONS ====================

/**
 * Send welcome email to new users
 */
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  try {
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(user.uid)
      .get();
    const userData = userDoc.data();

    const result = await emailService.sendEmail({
      to: user.email || "",
      template: "welcomeEmail" as any,
      data: {
        firstName: userData?.firstName || user.displayName || "User",
        onboardingUrl: `${process.env.WEBSITE_URL}/onboarding`,
      },
    });

    if (result.success) {
      await auditLogger.logEmailSent(
        user.uid,
        user.email || "",
        "welcomeEmail",
        true
      );
    } else {
      await auditLogger.logEmailSent(
        user.uid,
        user.email || "",
        "welcomeEmail",
        false,
        result.error
      );
    }
  } catch (error) {
    console.error("Error sending welcome email:", error);
    await auditLogger.log({
      userId: user.uid,
      action: AuditAction.EMAIL_FAILED,
      resourceType: ResourceType.EMAIL,
      resourceId: user.email || "",
      details: `Welcome email failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      status: "failure",
    });
  }
});

/**
 * Send email when recruiter request is created
 */
export const onRecruiterRequestCreated = functions.firestore
  .document("recruiterRequests/{requestId}")
  .onCreate(async (snap, context) => {
    try {
      const request = snap.data();
      const toUserId = request.toUserId;
      const candidateDoc = await admin
        .firestore()
        .collection("users")
        .doc(toUserId)
        .get();
      const candidateEmail = candidateDoc.data()?.email;

      if (!candidateEmail) {
        throw new Error("Candidate email not found");
      }

      const recruiterDoc = await admin
        .firestore()
        .collection("users")
        .doc(request.fromRecruiter.recruiterId)
        .get();
      const recruiterName = recruiterDoc.data()?.companyName || "A Recruiter";

      const result = await emailService.sendEmail({
        to: candidateEmail,
        template: "recruiterRequest" as any,
        data: {
          companyName: request.fromRecruiter.companyName || recruiterName,
          position: request.position || "Not specified",
          message: request.message || "",
          dashboardUrl: `${process.env.WEBSITE_URL}/dashboard`,
        },
      });

      if (result.success) {
        await auditLogger.logRecruiterRequest(
          context.params.requestId,
          request.fromRecruiter.recruiterId,
          toUserId,
          AuditAction.RECRUITER_REQUEST_CREATED
        );
      }
    } catch (error) {
      console.error("Error sending recruiter request email:", error);
      await auditLogger.log({
        userId: "system",
        action: AuditAction.EMAIL_FAILED,
        resourceType: ResourceType.RECRUITER_REQUEST,
        resourceId: context.params.requestId,
        details: `Failed to send recruiter request email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        status: "failure",
      });
    }
  });

/**
 * Send email when recruiter request is approved
 */
export const onRecruiterRequestApproved = functions.firestore
  .document("recruiterRequests/{requestId}")
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();

      // Only trigger if status changed to approved
      if (before.status !== "approved" && after.status === "approved") {
        const recruiterDoc = await admin
          .firestore()
          .collection("users")
          .doc(after.fromRecruiter.recruiterId)
          .get();
        const recruiterEmail = recruiterDoc.data()?.email;

        if (!recruiterEmail) {
          throw new Error("Recruiter email not found");
        }

        const candidateDoc = await admin
          .firestore()
          .collection("users")
          .doc(after.toUserId)
          .get();
        const candidateName = candidateDoc.data()?.firstName || "Candidate";

        const result = await emailService.sendEmail({
          to: recruiterEmail,
          template: "requestApproved" as any,
          data: {
            candidateName,
            profileUrl: `${process.env.WEBSITE_URL}/profile/${after.toUserId}`,
          },
        });

        if (result.success) {
          await auditLogger.logRecruiterRequest(
            context.params.requestId,
            after.fromRecruiter.recruiterId,
            after.toUserId,
            AuditAction.RECRUITER_REQUEST_APPROVED,
            true
          );
        }
      }

      // Trigger if status changed to denied
      if (before.status !== "denied" && after.status === "denied") {
        const recruiterDoc = await admin
          .firestore()
          .collection("users")
          .doc(after.fromRecruiter.recruiterId)
          .get();
        const recruiterEmail = recruiterDoc.data()?.email;

        if (!recruiterEmail) {
          throw new Error("Recruiter email not found");
        }

        const result = await emailService.sendEmail({
          to: recruiterEmail,
          template: "requestDenied" as any,
          data: {
            dashboardUrl: `${process.env.WEBSITE_URL}/recruiter/dashboard`,
          },
        });

        if (result.success) {
          await auditLogger.logRecruiterRequest(
            context.params.requestId,
            after.fromRecruiter.recruiterId,
            after.toUserId,
            AuditAction.RECRUITER_REQUEST_DENIED,
            false
          );
        }
      }
    } catch (error) {
      console.error("Error sending request status email:", error);
      await auditLogger.log({
        userId: "system",
        action: AuditAction.EMAIL_FAILED,
        resourceType: ResourceType.RECRUITER_REQUEST,
        resourceId: context.params.requestId,
        details: `Failed to send status update email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        status: "failure",
      });
    }
  });

/**
 * Send profile view digest email (weekly)
 */
export const sendProfileViewDigest = functions.pubsub
  .schedule("every monday 09:00")
  .timeZone("America/New_York")
  .onRun(async (context) => {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const usersSnapshot = await admin.firestore().collection("users").get();

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userEmail = userDoc.data().email;

        // Get view count for the user's profiles
        const viewsSnapshot = await admin
          .firestore()
          .collectionGroup("views")
          .where("userId", "==", userId)
          .where("timestamp", ">=", oneWeekAgo)
          .get();

        if (viewsSnapshot.size > 0) {
          const result = await emailService.sendEmail({
            to: userEmail,
            template: "profileViewed" as any,
            data: {
              viewCount: viewsSnapshot.size,
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
      }

      console.log("Weekly profile view digest sent");
    } catch (error) {
      console.error("Error sending profile view digest:", error);
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
  });

/**
 * Send admin notification for suspicious activity
 */
export const notifyAdminSuspiciousActivity = functions.https.onCall(
  async (data, context) => {
    try {
      if (!context.auth) {
        throw new Error("Authentication required");
      }

      const { activityType, details, userId } = data;

      // Log suspicious activity
      await auditLogger.logSuspiciousActivity(
        userId || context.auth.uid,
        activityType,
        details
      );

      // Get admin emails
      const adminsSnapshot = await admin
        .firestore()
        .collection("users")
        .where("role", "==", "admin")
        .get();

      const adminEmails = adminsSnapshot.docs
        .map((doc) => doc.data().email)
        .filter(Boolean);

      // Send emails to admins
      await emailService.sendBulkEmails(
        adminEmails,
        "adminNotification" as any,
        {
          alertType: activityType,
          details,
          timestamp: new Date().toISOString(),
          adminUrl: `${process.env.WEBSITE_URL}/admin/security`,
        }
      );

      return { success: true, message: "Admins notified" };
    } catch (error) {
      console.error("Error notifying admins:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to notify admins"
      );
    }
  }
);

/**
 * Cleanup old audit logs (daily)
 */
export const cleanupAuditLogs = functions.pubsub
  .schedule("every day 02:00")
  .timeZone("America/New_York")
  .onRun(async (context) => {
    try {
      const deletedCount = await auditLogger.cleanupOldLogs(90); // Keep 90 days
      console.log(`Cleaned up ${deletedCount} old audit logs`);
    } catch (error) {
      console.error("Error cleaning up audit logs:", error);
    }
  });
