/**
 * Handler for resending verification emails via Firebase callable.
 */
import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { auditLogger } from "../services/auditLogger";
import { checkRateLimit, RateLimitPresets } from "../middleware/rateLimiter";
import {
  buildVerificationLink,
  generateCustomVerificationToken,
} from "./shared";
import { buildWelcomeEmailHtml, buildWelcomeEmailText } from "./templates";

export const resendVerificationEmailHandler = async (
  _data: any,
  context: functions.https.CallableContext,
): Promise<{ success: boolean; message?: string }> => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required",
      );
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(
      context.auth.uid,
      RateLimitPresets.EMAIL_RESEND,
    );
    if (!rateLimit.allowed) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `Rate limit exceeded. Try again in ${rateLimit.retryAfter} seconds.`,
      );
    }

    const userId = context.auth.uid;
    const user = await admin.auth().getUser(userId);
    const email = user.email;

    if (!email) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "User has no email address",
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
      functions.logger.warn(
        "Failed to generate link with redirect, trying simple link:",
        e1,
      );
      try {
        // Try Firebase's simple link (no redirect)
        verificationLink = await admin
          .auth()
          .generateEmailVerificationLink(email);
      } catch (e2) {
        // Both Firebase methods failed - use manual fallback
        functions.logger.warn(
          "Firebase link generation failed, using manual fallback:",
          e2,
        );

        try {
          verificationLink = await generateCustomVerificationToken(userId);
          functions.logger.info(
            "Generated custom verification token as fallback for resend",
          );
        } catch (e3) {
          functions.logger.error(
            "Failed to generate custom token for resend:",
            e3,
          );
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
    functions.logger.error("Error resending verification email:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send verification email",
    );
  }
};
