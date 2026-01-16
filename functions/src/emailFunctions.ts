import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { randomUUID } from "crypto";
import { emailService } from "./services/emailService";
import { auditLogger, AuditAction, ResourceType } from "./services/auditLogger";

const defaultVerificationPath =
  process.env.VERIFICATION_PATH ||
  process.env.NEXT_PUBLIC_AUTH_VERIFICATION_PATH ||
  "/auth?mode=verify-email";

const normalizeBase = (value: string): string =>
  value.endsWith("/") ? value.slice(0, -1) : value;

const buildVerificationLink = (): string => {
  const explicitLink =
    process.env.AUTH_VERIFICATION_URL || process.env.EMAIL_VERIFICATION_URL;
  if (explicitLink) {
    return explicitLink;
  }

  const baseUrl = normalizeBase(
    process.env.WEBSITE_URL || "https://switchcv.com"
  );
  const path = defaultVerificationPath.startsWith("/")
    ? defaultVerificationPath
    : `/${defaultVerificationPath}`;
  return `${baseUrl}${path}`;
};

const generateCustomVerificationToken = async (
  userId: string
): Promise<string> => {
  const token = randomUUID();
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + 24 * 60 * 60 * 1000
  ); // 24h

  // Store token
  await admin.firestore().collection("verificationTokens").add({
    userId,
    token,
    expiresAt,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    used: false,
  });

  const baseUrl = normalizeBase(
    process.env.WEBSITE_URL || "https://switchcv.com"
  );
  return `${baseUrl}/api/auth/verify?token=${token}`;
};

// ==================== EMAIL FUNCTIONS ====================

// ==================== HANDLERS ====================

const onUserCreatedHandler = async (user: admin.auth.UserRecord) => {
  try {
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(user.uid)
      .get();
    const userData = userDoc.data();

    // Generate email verification link with improved error handling
    let verificationLink = buildVerificationLink();
    let verificationMethod = "static";

    if (user.email) {
      // Try custom token first (more reliable than Firebase's rate-limited API)
      try {
        verificationLink = await generateCustomVerificationToken(user.uid);
        verificationMethod = "custom_token";
        console.log(`Generated custom verification token for ${user.email}`);
      } catch (customTokenError) {
        console.warn(
          "Custom token generation failed, trying Firebase API:",
          customTokenError
        );

        // Fallback to Firebase's built-in verification link
        try {
          const actionCodeSettings = {
            url: `${
              process.env.WEBSITE_URL || "https://switchcv.com"
            }/dashboard`,
            handleCodeInApp: false,
          };
          verificationLink = await admin
            .auth()
            .generateEmailVerificationLink(user.email, actionCodeSettings);
          verificationMethod = "firebase_with_redirect";
          console.log(`Generated Firebase verification link for ${user.email}`);
        } catch (e) {
          const firebaseError = e as { code?: string; message?: string };

          // Check if it's a rate limit error
          if (firebaseError.message?.includes("TOO_MANY_ATTEMPTS")) {
            console.warn(
              "Firebase rate limit hit, will use custom token on next signup"
            );
            // Keep the static link as fallback
            verificationMethod = "static_fallback";
          } else {
            console.warn("Error generating Firebase verification link:", e);
          }
        }
      }
    }

    const firstName = userData?.firstName || user.displayName || "User";
    const websiteUrl = process.env.WEBSITE_URL || "https://switchcv.com";

    // Use Firebase Trigger Email Extension (same as feedback emails)
    await admin
      .firestore()
      .collection("mail")
      .add({
        to: user.email,
        message: {
          subject: "Welcome to SwitchCV - Verify Your Email",
          html: buildWelcomeEmailHtml(firstName, verificationLink, websiteUrl),
          text: buildWelcomeEmailText(firstName, verificationLink, websiteUrl),
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    await auditLogger.logEmailSent(
      user.uid,
      user.email || "",
      "welcomeEmail",
      true
    );

    console.log(
      `Welcome email sent to ${user.email} with verification method: ${verificationMethod}`
    );
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
};

// Helper functions for email templates
function buildWelcomeEmailHtml(
  firstName: string,
  verificationUrl: string,
  websiteUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #1A2F25; margin-bottom: 24px;">Welcome to SwitchCV!</h1>
    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">Hi ${firstName},</p>
    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
      Thank you for joining SwitchCV. We're excited to help you showcase your skills and connect with opportunities.
    </p>
    <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">Please verify your email address to get started:</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationUrl}" style="background: linear-gradient(135deg, #D4A853 0%, #C4973F 100%); color: #1A2F25; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Verify Email
      </a>
    </div>
    <p style="color: #4a5568; font-size: 14px; line-height: 1.6;"><strong>Here's what you can do next:</strong></p>
    <ul style="color: #4a5568; font-size: 14px; line-height: 1.8;">
      <li>Create your professional profile</li>
      <li>Upload and manage your resumes</li>
      <li>View profile analytics and recruiter interest</li>
      <li>Control access to your information</li>
    </ul>
    <p style="margin-top: 24px;">
      <a href="${websiteUrl}/dashboard" style="color: #D4A853; text-decoration: none;">Go to Dashboard →</a>
    </p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
    <p style="color: #a0aec0; font-size: 12px;">
      If you didn't create an account with SwitchCV, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`;
}

function buildWelcomeEmailText(
  firstName: string,
  verificationUrl: string,
  websiteUrl: string
): string {
  return `Welcome to SwitchCV!

Hi ${firstName},

Thank you for joining SwitchCV. We're excited to help you showcase your skills and connect with opportunities.

Please verify your email address to get started:
${verificationUrl}

Here's what you can do next:
- Create your professional profile
- Upload and manage your resumes
- View profile analytics and recruiter interest
- Control access to your information

Go to Dashboard: ${websiteUrl}/dashboard

If you didn't create an account with SwitchCV, you can safely ignore this email.`;
}

const onRecruiterRequestCreatedHandler = async (
  snap: functions.firestore.QueryDocumentSnapshot,
  context: functions.EventContext
) => {
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
};

const onRecruiterRequestApprovedHandler = async (
  change: functions.Change<functions.firestore.QueryDocumentSnapshot>,
  context: functions.EventContext
) => {
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
};

const sendProfileViewDigestHandler = async (
  context: functions.EventContext
) => {
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

      // Process batch in parallel with concurrency limit
      const promises = usersSnapshot.docs.map(async (userDoc) => {
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
      });

      await Promise.all(promises);

      processedCount += usersSnapshot.size;
      lastDoc = usersSnapshot.docs[usersSnapshot.docs.length - 1];

      // Safety check for execution time (Cloud Functions timeout)
      // If we're running close to timeout (e.g. 60s default), we should probably stop or use Cloud Tasks
      // For now, we just log progress
      console.log(`Processed ${processedCount} users for digest`);
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
};

const notifyAdminSuspiciousActivityHandler = async (
  data: any,
  context: functions.https.CallableContext
) => {
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
    await emailService.sendBulkEmails(adminEmails, "adminNotification" as any, {
      alertType: activityType,
      details,
      timestamp: new Date().toISOString(),
      adminUrl: `${process.env.WEBSITE_URL}/admin/security`,
    });

    return { success: true, message: "Admins notified" };
  } catch (error) {
    console.error("Error notifying admins:", error);
    throw new functions.https.HttpsError("internal", "Failed to notify admins");
  }
};

const cleanupAuditLogsHandler = async (context: functions.EventContext) => {
  try {
    const deletedCount = await auditLogger.cleanupOldLogs(90); // Keep 90 days
    console.log(`Cleaned up ${deletedCount} old audit logs`);
  } catch (error) {
    console.error("Error cleaning up audit logs:", error);
  }
};

const resendVerificationEmailHandler = async (
  data: any,
  context: functions.https.CallableContext
) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const userId = context.auth.uid;
    const user = await admin.auth().getUser(userId);
    const email = user.email;

    if (!email) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "User has no email address"
      );
    }

    if (user.emailVerified) {
      return { success: false, message: "Email already verified" };
    }

    // Get user data for personalization
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
    const userData = userDoc.data();

    // Generate verification link with multiple fallbacks
    let verificationLink = buildVerificationLink(); // Start with manual fallback
    try {
      // Try Firebase's link with redirect
      verificationLink = await admin
        .auth()
        .generateEmailVerificationLink(email, {
          url: `${process.env.WEBSITE_URL || "https://switchcv.com"}/dashboard`,
          handleCodeInApp: false,
        });
    } catch (e1) {
      console.warn(
        "Failed to generate link with redirect, trying simple link:",
        e1
      );
      try {
        // Try Firebase's simple link (no redirect)
        verificationLink = await admin
          .auth()
          .generateEmailVerificationLink(email);
      } catch (e2) {
        // Both Firebase methods failed - use manual fallback
        // This handles rate limiting, domain issues, etc.
        console.warn(
          "Firebase link generation failed, using manual fallback:",
          e2
        );

        try {
          verificationLink = await generateCustomVerificationToken(userId);
          console.log(
            "Generated custom verification token as fallback for resend"
          );
        } catch (e3) {
          console.error("Failed to generate custom token for resend:", e3);
        }
      }
    }

    const firstName = userData?.firstName || user.displayName || "User";
    const websiteUrl = process.env.WEBSITE_URL || "https://switchcv.com";

    // Use Firebase Trigger Email Extension (same as feedback emails)
    await admin
      .firestore()
      .collection("mail")
      .add({
        to: email,
        message: {
          subject: "SwitchCV - Verify Your Email",
          html: buildWelcomeEmailHtml(firstName, verificationLink, websiteUrl),
          text: buildWelcomeEmailText(firstName, verificationLink, websiteUrl),
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    await auditLogger.logEmailSent(userId, email, "verificationResend", true);
    return { success: true };
  } catch (error) {
    console.error("Error resending verification email:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send verification email"
    );
  }
};

export {
  onUserCreatedHandler,
  onRecruiterRequestCreatedHandler,
  onRecruiterRequestApprovedHandler,
  sendProfileViewDigestHandler,
  notifyAdminSuspiciousActivityHandler,
  cleanupAuditLogsHandler,
  resendVerificationEmailHandler,
};

// ==================== EMAIL FUNCTIONS ====================

/**
 * Send welcome email to new users
 */
export const onUserCreated = functions.auth
  .user()
  .onCreate(onUserCreatedHandler);

/**
 * Send email when recruiter request is created
 */
export const onRecruiterRequestCreated = functions.firestore
  .document("recruiterRequests/{requestId}")
  .onCreate(onRecruiterRequestCreatedHandler);

/**
 * Send email when recruiter request is approved
 */
export const onRecruiterRequestApproved = functions.firestore
  .document("recruiterRequests/{requestId}")
  .onUpdate(onRecruiterRequestApprovedHandler);

/**
 * Send profile view digest email (weekly)
 */
export const sendProfileViewDigest = functions.pubsub
  .schedule("every monday 09:00")
  .timeZone("America/New_York")
  .onRun(sendProfileViewDigestHandler);

/**
 * Send admin notification for suspicious activity
 */
export const notifyAdminSuspiciousActivity = functions.https.onCall(
  notifyAdminSuspiciousActivityHandler
);

/**
 * Cleanup old audit logs (daily)
 */
export const cleanupAuditLogs = functions.pubsub
  .schedule("every day 02:00")
  .timeZone("America/New_York")
  .onRun(cleanupAuditLogsHandler);
