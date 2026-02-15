import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { emailService } from "../services/emailService";

const db = admin.firestore();

/**
 * Scheduled function to notify users about expiring resumes
 * Runs daily at 9 AM UTC
 *
 * Logic:
 * 1. Find resumes expiring within the next 24-48 hours
 * 2. Check if notification was already sent
 * 3. Send email notification to users
 * 4. Track sent notifications to prevent duplicates
 */
export async function notifyExpiringResumesHandler(
  context: functions.EventContext,
): Promise<{ notificationsSent: number; errors: number }> {
  functions.logger.info("Starting resume expiry notification job", {
    eventId: context.eventId,
  });

  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  let notificationsSent = 0;
  let errors = 0;

  try {
    // Query resumes that will be deleted within the next 24-48 hours
    const expiringResumesSnapshot = await db
      .collection("resumes")
      .where("deletionScheduledAt", ">=", twentyFourHoursFromNow.toISOString())
      .where("deletionScheduledAt", "<=", fortyEightHoursFromNow.toISOString())
      .limit(200)
      .get();

    functions.logger.info(
      `Found ${expiringResumesSnapshot.size} expiring resumes`,
    );

    const batch = db.batch();
    const notificationPromises: Promise<void>[] = [];

    for (const doc of expiringResumesSnapshot.docs) {
      const resumeData = doc.data();
      const resumeId = doc.id;
      const userId = resumeData.userId;
      const deletionDate = new Date(resumeData.deletionScheduledAt);

      // Check if notification was already sent for this resume
      const notificationCheck = await db
        .collection("resumeNotifications")
        .where("resumeId", "==", resumeId)
        .where("notificationType", "==", "expiry_warning")
        .limit(1)
        .get();

      if (!notificationCheck.empty) {
        functions.logger.info(
          `Notification already sent for resume ${resumeId}`,
        );
        continue;
      }

      // Get user details
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (!userData || !userData.email) {
        functions.logger.warn(`No email found for user ${userId}`);
        continue;
      }

      // Calculate time remaining
      const hoursRemaining = Math.floor(
        (deletionDate.getTime() - now.getTime()) / (1000 * 60 * 60),
      );
      const timeRemaining =
        hoursRemaining < 24 ? `${hoursRemaining} hours` : "24-48 hours";

      // Send email notification
      const sendEmailPromise = (async () => {
        try {
          const result = await emailService.sendEmail({
            to: userData.email,
            template: "resumeExpiryWarning" as any,
            data: {
              userName: userData.displayName || "there",
              resumeTitle: resumeData.title || "Untitled Resume",
              deletionDate: deletionDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              deletionTime: deletionDate.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                timeZoneName: "short",
              }),
              timeRemaining,
              retentionDays: "7",
              upgradeUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://switchcv.com"}/profile/subscription`,
              resumeUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://switchcv.com"}/resumes/${resumeId}`,
            },
          });

          if (result.success) {
            // Track notification
            const notificationRef = db.collection("resumeNotifications").doc();
            batch.set(notificationRef, {
              resumeId,
              userId,
              notificationType: "expiry_warning",
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
              scheduledDeletionAt:
                admin.firestore.Timestamp.fromDate(deletionDate),
              emailStatus: "sent",
              messageId: result.messageId,
            });

            notificationsSent++;
            functions.logger.info(`Notification sent for resume ${resumeId}`);
          } else {
            errors++;
            functions.logger.error(
              `Failed to send notification for resume ${resumeId}`,
              {
                error: result.error,
              },
            );
          }
        } catch (error) {
          errors++;
          functions.logger.error(
            `Error sending notification for resume ${resumeId}`,
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      })();

      notificationPromises.push(sendEmailPromise);
    }

    // Wait for all email sends to complete
    await Promise.all(notificationPromises);

    // Commit batch to track notifications
    if (notificationsSent > 0) {
      await batch.commit();
    }

    functions.logger.info("Resume expiry notification job completed", {
      eventId: context.eventId,
      notificationsSent,
      errors,
    });

    return { notificationsSent, errors };
  } catch (error) {
    functions.logger.error("Resume expiry notification job failed", {
      eventId: context.eventId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
