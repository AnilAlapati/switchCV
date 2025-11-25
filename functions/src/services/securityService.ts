// functions/src/services/securityService.ts
import * as admin from "firebase-admin";
import { auditLogger } from "./auditLogger";
import { emailService } from "./emailService";

/**
 * Handles security monitoring and suspicious activity detection
 */
export class SecurityService {
  private db: FirebaseFirestore.Firestore;

  constructor(db: FirebaseFirestore.Firestore = admin.firestore()) {
    this.db = db;
  }

  async logSuspiciousActivity(
    userId: string,
    activityType: string,
    details: string
  ): Promise<void> {
    await auditLogger.logSuspiciousActivity(userId, activityType, details);

    // Send alert to admins
    const admins = await this.db
      .collection("users")
      .where("role", "==", "admin")
      .get();

    const adminEmails = admins.docs
      .map((doc) => doc.data().email)
      .filter(Boolean);

    if (adminEmails.length > 0) {
      await emailService.sendBulkEmails(
        adminEmails,
        "adminNotification" as any,
        {
          alertType: activityType,
          details,
          userId,
          timestamp: new Date().toISOString(),
          adminUrl: `${process.env.WEBSITE_URL}/admin/security`,
        }
      );
    }
  }

  async validateTokenAccess(
    tokenId: string,
    recruiterId: string
  ): Promise<boolean> {
    const tokenDoc = await this.db
      .collection("accessTokens")
      .doc(tokenId)
      .get();
    const token = tokenDoc.data();

    if (!token) {
      await this.logSuspiciousActivity(
        recruiterId,
        "INVALID_TOKEN_ACCESS",
        `Attempted to use invalid token: ${tokenId}`
      );
      return false;
    }

    if (token.status !== "active") {
      await this.logSuspiciousActivity(
        recruiterId,
        "INACTIVE_TOKEN_ACCESS",
        `Attempted to use inactive token: ${tokenId}`
      );
      return false;
    }

    if (new Date(token.expiresAt) < new Date()) {
      await this.logSuspiciousActivity(
        recruiterId,
        "EXPIRED_TOKEN_ACCESS",
        `Attempted to use expired token: ${tokenId}`
      );
      return false;
    }

    return true;
  }
}

export const securityService = new SecurityService();
