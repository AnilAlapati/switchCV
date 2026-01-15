/**
 * Scheduled Cloud Function for Secret Rotation Monitoring
 *
 * Runs daily to check if any secrets are approaching their rotation deadline.
 * Sends email alerts to administrators when secrets need rotation.
 *
 * @see docs/SECRET_ROTATION_IMPLEMENTATION.md
 */

import * as functions from "firebase-functions/v2";
import { SecretManagerService } from "../lib/secretManagerService";
import { logger } from "firebase-functions/v2";
import { getFirestore } from "firebase-admin/firestore";
import * as nodemailer from "nodemailer";

interface SecretMetadata {
  name: string;
  lastRotated: Date;
  rotationPeriod: number;
  nextRotation: Date;
  version: string;
}

/**
 * Email configuration for rotation alerts
 */
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@switchcv.app";
const ALERT_EMAIL = process.env.ALERT_EMAIL || "alerts@switchcv.app";

/**
 * Daily secret rotation check
 * Runs at midnight Eastern Time
 */
export const checkSecretRotation = functions.scheduler.onSchedule(
  {
    schedule: "0 0 * * *", // Daily at midnight
    timeZone: "America/New_York",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    logger.info("Secret rotation check started", {
      timestamp: new Date().toISOString(),
    });

    try {
      const secretManager = SecretManagerService.getInstance();
      const allSecrets = await secretManager.checkRotationStatus();

      // Find secrets expiring within 7 days
      const expiringSevenDays = filterExpiringSoon(allSecrets, 7);

      // Find secrets expiring within 1 day (critical)
      const expiringOneDay = filterExpiringSoon(allSecrets, 1);

      // Find expired secrets
      const expired = allSecrets.filter(
        (s) => s.nextRotation.getTime() < Date.now()
      );

      logger.info("Secret rotation status", {
        total: allSecrets.length,
        expiringSevenDays: expiringSevenDays.length,
        expiringOneDay: expiringOneDay.length,
        expired: expired.length,
      });

      // Send alerts if needed
      if (expired.length > 0) {
        await sendRotationAlert(expired, "CRITICAL");
        await logRotationAlert(expired, "critical");
      }

      if (expiringOneDay.length > 0) {
        await sendRotationAlert(expiringOneDay, "URGENT");
        await logRotationAlert(expiringOneDay, "urgent");
      }

      if (expiringSevenDays.length > 0) {
        await sendRotationAlert(expiringSevenDays, "WARNING");
        await logRotationAlert(expiringSevenDays, "warning");
      }

      // Update monitoring metrics
      await updateRotationMetrics(allSecrets);

      logger.info("Secret rotation check completed successfully");
    } catch (error) {
      logger.error("Secret rotation check failed", { error });
      throw error;
    }
  }
);

/**
 * Filter secrets expiring within specified days
 */
function filterExpiringSoon(
  secrets: SecretMetadata[],
  days: number
): SecretMetadata[] {
  const threshold = Date.now() + days * 24 * 60 * 60 * 1000;
  return secrets.filter(
    (s) =>
      s.nextRotation.getTime() < threshold &&
      s.nextRotation.getTime() > Date.now()
  );
}

/**
 * Send rotation alert email
 */
async function sendRotationAlert(
  secrets: SecretMetadata[],
  severity: "WARNING" | "URGENT" | "CRITICAL"
): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const emailHtml = generateRotationEmail(secrets, severity);

    const mailOptions = {
      from: ALERT_EMAIL,
      to: ADMIN_EMAIL,
      subject: `[${severity}] ${secrets.length} Secret${secrets.length > 1 ? "s" : ""
        } Require${secrets.length === 1 ? "s" : ""} Rotation - SwitchCV`,
      html: emailHtml,
      priority: (severity === "CRITICAL" ? "high" : "normal") as "high" | "normal" | "low",
    };

    await transporter.sendMail(mailOptions);

    logger.info("Rotation alert email sent", {
      severity,
      secretCount: secrets.length,
      to: ADMIN_EMAIL,
    });
  } catch (error) {
    logger.error("Failed to send rotation alert email", { error });
    // Don't throw - we still want to log the alert to Firestore
  }
}

/**
 * Generate HTML email for rotation alerts
 */
function generateRotationEmail(
  secrets: SecretMetadata[],
  severity: "WARNING" | "URGENT" | "CRITICAL"
): string {
  const severityColors = {
    WARNING: "#FFA500",
    URGENT: "#FF6B6B",
    CRITICAL: "#FF0000",
  };

  const severityEmoji = {
    WARNING: "⚠️",
    URGENT: "🔴",
    CRITICAL: "🚨",
  };

  const secretRows = secrets
    .map(
      (s) => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 12px; font-weight: 500;">${s.name}</td>
      <td style="padding: 12px;">${s.lastRotated.toLocaleDateString()}</td>
      <td style="padding: 12px;">${s.nextRotation.toLocaleDateString()}</td>
      <td style="padding: 12px; font-weight: 500; color: ${severityColors[severity]
        };">
        ${Math.ceil(
          (s.nextRotation.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        )} days
      </td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: ${severityColors[severity]
    }; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">
      ${severityEmoji[severity]} Secret Rotation Required
    </h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">
      ${severity} Alert - Action Required
    </p>
  </div>

  <div style="background: #f9f9f9; padding: 20px; border: 1px solid #eee; border-top: none;">
    <p style="font-size: 16px; margin-top: 0;">
      The following secrets require rotation in the SwitchCV production environment:
    </p>

    <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 4px; overflow: hidden;">
      <thead>
        <tr style="background: #f5f5f5; font-weight: 600;">
          <th style="padding: 12px; text-align: left;">Secret Name</th>
          <th style="padding: 12px; text-align: left;">Last Rotated</th>
          <th style="padding: 12px; text-align: left;">Due Date</th>
          <th style="padding: 12px; text-align: left;">Days Remaining</th>
        </tr>
      </thead>
      <tbody>
        ${secretRows}
      </tbody>
    </table>

    <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 16px;">🔧 How to Rotate Secrets</h3>
      <ol style="margin: 0; padding-left: 20px; color: #856404;">
        <li>Generate new secret value (use strong random generator)</li>
        <li>Run: <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">./scripts/rotate-secret.sh SECRET_NAME "NEW_VALUE"</code></li>
        <li>Deploy Cloud Functions: <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">firebase deploy --only functions</code></li>
        <li>Verify in production logs</li>
      </ol>
    </div>

    <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-left: 4px solid #2196F3; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; color: #1565c0; font-size: 16px;">📚 Documentation</h3>
      <p style="margin: 0; color: #1565c0;">
        See <code>docs/SECRET_ROTATION_IMPLEMENTATION.md</code> for detailed rotation procedures.
      </p>
    </div>

    <p style="margin-top: 30px; font-size: 14px; color: #666;">
      This is an automated alert from the SwitchCV Secret Rotation Monitor.<br>
      Sent: ${new Date().toLocaleString()}
    </p>
  </div>

</body>
</html>
  `;
}

/**
 * Log rotation alert to Firestore for audit trail
 */
async function logRotationAlert(
  secrets: SecretMetadata[],
  severity: "warning" | "urgent" | "critical"
): Promise<void> {
  const db = getFirestore();

  try {
    await db.collection("secretRotationAlerts").add({
      secrets: secrets.map((s) => ({
        name: s.name,
        nextRotation: s.nextRotation,
        daysRemaining: Math.ceil(
          (s.nextRotation.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        ),
      })),
      severity,
      alertedAt: new Date(),
      status: "pending",
      environment: process.env.NODE_ENV || "production",
    });

    logger.info("Rotation alert logged to Firestore", {
      severity,
      secretCount: secrets.length,
    });
  } catch (error) {
    logger.error("Failed to log rotation alert to Firestore", { error });
  }
}

/**
 * Update rotation metrics for monitoring dashboard
 */
async function updateRotationMetrics(
  allSecrets: SecretMetadata[]
): Promise<void> {
  const db = getFirestore();

  try {
    const metrics = {
      totalSecrets: allSecrets.length,
      secretsExpiringSoon: allSecrets.filter(
        (s) =>
          s.nextRotation.getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000 &&
          s.nextRotation.getTime() > Date.now()
      ).length,
      secretsExpired: allSecrets.filter(
        (s) => s.nextRotation.getTime() < Date.now()
      ).length,
      oldestRotation: Math.min(
        ...allSecrets.map((s) => s.lastRotated.getTime())
      ),
      newestRotation: Math.max(
        ...allSecrets.map((s) => s.lastRotated.getTime())
      ),
      updatedAt: new Date(),
    };

    await db.collection("systemMetrics").doc("secretRotation").set(metrics);

    logger.info("Rotation metrics updated", metrics);
  } catch (error) {
    logger.error("Failed to update rotation metrics", { error });
  }
}
