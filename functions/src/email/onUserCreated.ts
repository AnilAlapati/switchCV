/**
 * Handler for Firebase Auth onCreate — sends welcome / approval emails.
 */
import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import {
  auditLogger,
  AuditAction,
  ResourceType,
} from "../services/auditLogger";
import { config } from "../config";
import {
  getUserApprovalConfig,
  shouldAutoApprove,
  generateApprovalToken,
  buildVerificationLink,
  generateCustomVerificationToken,
} from "./shared";
import {
  buildAdminApprovalEmailHtml,
  buildAdminApprovalEmailText,
  buildWelcomeEmailHtml,
  buildWelcomeEmailText,
  buildPendingApprovalEmailHtml,
  buildPendingApprovalEmailText,
} from "./templates";

export const onUserCreatedHandler = async (
  user: admin.auth.UserRecord,
): Promise<void> => {
  try {
    // Wait briefly for frontend to create user doc (race condition)
    let userDoc: admin.firestore.DocumentSnapshot | null = null;
    const userRef = admin.firestore().collection("users").doc(user.uid);

    for (let i = 0; i < 3; i++) {
      userDoc = await userRef.get();
      if (userDoc.exists) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const userData = userDoc?.exists ? userDoc.data() : undefined;

    // Check if manual user approval is enabled
    const approvalConfig = await getUserApprovalConfig();
    const websiteUrl = config.get("app").websiteUrl;

    // Check for auto-approve domains
    const isAutoApproved = user.email
      ? shouldAutoApprove(user.email, approvalConfig.autoApproveDomains)
      : false;

    if (approvalConfig.enabled && !isAutoApproved) {
      // Manual approval mode: Send approval request to admin instead of verification email to user
      functions.logger.info(
        `User approval enabled - sending approval request to admin for ${user.email}`,
      );

      // Create approval request document first to get the ID
      const approvalRequestRef = admin
        .firestore()
        .collection("userApprovalRequests")
        .doc();

      const requestId = approvalRequestRef.id;

      // Generate secure tokens for approve/decline actions
      const approveToken = generateApprovalToken("approve", requestId);
      const declineToken = generateApprovalToken("decline", requestId);

      // Store the approval request with token hashes
      await approvalRequestRef.set({
        userId: user.uid,
        email: user.email || null,
        firstName: userData?.firstName || user.displayName || null,
        username: userData?.username || null,
        status: "pending",
        approveTokenHash: approveToken.hash,
        approveTokenExpiresAt: approveToken.expiresAt,
        declineTokenHash: declineToken.hash,
        declineTokenExpiresAt: declineToken.expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        processedAt: null,
        processedBy: null,
      });

      // Update user document with approval status
      await admin.firestore().collection("users").doc(user.uid).update({
        approvalStatus: "pending",
        approvalRequestId: requestId,
      });

      // Generate approval/decline URLs with secure tokens
      const approveUrl = `${websiteUrl}/api/user-approval/approve?token=${approveToken.token}`;
      const declineUrl = `${websiteUrl}/api/user-approval/decline?token=${declineToken.token}`;

      // Log the admin email address being used so it can be diagnosed from Cloud Logging
      functions.logger.info(
        `[UserApproval] Sending admin notification to "${approvalConfig.adminEmail}" for new user ${user.email} (uid=${user.uid})`,
      );

      // Send approval request email to admin
      const adminMailRef = await admin
        .firestore()
        .collection("mail")
        .add({
          to: approvalConfig.adminEmail,
          message: {
            subject: `New User Registration Approval - ${user.email}`,
            html: buildAdminApprovalEmailHtml(
              user,
              userData,
              approveUrl,
              declineUrl,
              websiteUrl,
            ),
            text: buildAdminApprovalEmailText(
              user,
              userData,
              approveUrl,
              declineUrl,
              websiteUrl,
            ),
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      functions.logger.info(
        `[UserApproval] Admin mail document created: ${adminMailRef.id}`,
      );

      // Send "pending approval" notification to user
      const firstName = userData?.firstName || user.displayName || "User";
      await admin
        .firestore()
        .collection("mail")
        .add({
          to: user.email,
          message: {
            subject: "SwitchCV - Registration Received",
            html: buildPendingApprovalEmailHtml(firstName, websiteUrl),
            text: buildPendingApprovalEmailText(firstName, websiteUrl),
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      await auditLogger.log({
        userId: user.uid,
        action: AuditAction.EMAIL_SENT,
        resourceType: ResourceType.EMAIL,
        resourceId: user.email || "",
        details: `User approval request sent to admin (${approvalConfig.adminEmail})`,
        status: "success",
      });

      functions.logger.info(
        `[UserApproval] Approval request sent to ${approvalConfig.adminEmail} for user ${user.email}`,
      );
      return;
    }

    // Auto-approved or approval disabled: Send verification email directly
    if (isAutoApproved) {
      functions.logger.info(
        `User ${user.email} auto-approved due to domain whitelist`,
      );
      await admin.firestore().collection("users").doc(user.uid).update({
        approvalStatus: "approved",
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        approvalNote: "Auto-approved: domain whitelist",
      });
    }

    // Generate email verification link with improved error handling
    let verificationLink = buildVerificationLink();
    let verificationMethod = "static";

    if (user.email) {
      // Try custom token first (more reliable than Firebase's rate-limited API)
      try {
        verificationLink = await generateCustomVerificationToken(user.uid);
        verificationMethod = "custom_token";
        functions.logger.info(
          `Generated custom verification token for ${user.email}`,
        );
      } catch (customTokenError) {
        functions.logger.warn(
          "Custom token generation failed, trying Firebase API:",
          customTokenError,
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
          functions.logger.info(
            `Generated Firebase verification link for ${user.email}`,
          );
        } catch (e) {
          const firebaseError = e as { code?: string; message?: string };

          // Check if it's a rate limit error
          if (firebaseError.message?.includes("TOO_MANY_ATTEMPTS")) {
            functions.logger.warn(
              "Firebase rate limit hit, will use custom token on next signup",
            );
            // Keep the static link as fallback
            verificationMethod = "static_fallback";
          } else {
            functions.logger.warn(
              "Error generating Firebase verification link:",
              e,
            );
          }
        }
      }
    }

    const firstName = userData?.firstName || user.displayName || "User";

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
      true,
    );

    functions.logger.info(
      `Welcome email sent to ${user.email} with verification method: ${verificationMethod}`,
    );
  } catch (error) {
    functions.logger.error("Error sending welcome email:", error);
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
