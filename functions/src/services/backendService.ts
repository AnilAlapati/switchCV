import * as admin from "firebase-admin";
import { auditLogger, AuditAction, ResourceType } from "./auditLogger";
import { emailService } from "./emailService";

/**
 * Backend Service Integration
 * Provides helper functions to integrate audit logging with business operations
 */

export class BackendServiceIntegration {
  private db: FirebaseFirestore.Firestore;

  constructor(db: FirebaseFirestore.Firestore = admin.firestore()) {
    this.db = db;
  }

  /**
   * Create recruiter request with audit logging
   */
  async createRecruiterRequest(data: {
    recruiterId: string;
    candidateId: string;
    position: string;
    companyName: string;
    message: string;
  }): Promise<string> {
    const batch = this.db.batch();
    const requestRef = this.db.collection("recruiterRequests").doc();

    // Create request
    batch.set(requestRef, {
      ...data,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await batch.commit();

    // Log the action
    await auditLogger.logRecruiterRequest(
      requestRef.id,
      data.recruiterId,
      data.candidateId,
      AuditAction.RECRUITER_REQUEST_CREATED
    );

    return requestRef.id;
  }

  /**
   * Approve recruiter request with audit logging
   */
  async approveRecruiterRequest(
    requestId: string,
    adminId: string,
    reason?: string
  ): Promise<void> {
    const batch = this.db.batch();
    const requestRef = this.db.collection("recruiterRequests").doc(requestId);
    const requestDoc = await requestRef.get();
    const requestData = requestDoc.data();

    if (!requestData) {
      throw new Error("Request not found");
    }

    // Update request
    batch.update(requestRef, {
      status: "approved",
      approvedAt: new Date(),
      approvedBy: adminId,
      approvalReason: reason,
    });

    // Generate access token
    const tokenRef = this.db.collection("accessTokens").doc();
    batch.set(tokenRef, {
      recruiterId: requestData.fromRecruiter.recruiterId,
      userId: requestData.toUserId,
      requestId,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdAt: new Date(),
      status: "active",
    });

    await batch.commit();

    // Log actions
    await auditLogger.logRecruiterRequest(
      requestId,
      requestData.fromRecruiter.recruiterId,
      requestData.toUserId,
      AuditAction.RECRUITER_REQUEST_APPROVED,
      true
    );

    await auditLogger.logAccessToken(
      requestData.fromRecruiter.recruiterId,
      requestData.toUserId,
      tokenRef.id,
      AuditAction.ACCESS_TOKEN_GENERATED
    );
  }

  /**
   * Deny recruiter request with audit logging
   */
  async denyRecruiterRequest(
    requestId: string,
    adminId: string,
    reason?: string
  ): Promise<void> {
    const requestRef = this.db.collection("recruiterRequests").doc(requestId);
    const requestDoc = await requestRef.get();
    const requestData = requestDoc.data();

    if (!requestData) {
      throw new Error("Request not found");
    }

    // Update request
    await requestRef.update({
      status: "denied",
      deniedAt: new Date(),
      deniedBy: adminId,
      denialReason: reason,
    });

    // Log action
    await auditLogger.logRecruiterRequest(
      requestId,
      requestData.fromRecruiter.recruiterId,
      requestData.toUserId,
      AuditAction.RECRUITER_REQUEST_DENIED,
      false
    );
  }

  /**
   * Revoke access token with audit logging
   */
  async revokeAccessToken(tokenId: string, reason?: string): Promise<void> {
    const tokenRef = this.db.collection("accessTokens").doc(tokenId);
    const tokenDoc = await tokenRef.get();
    const tokenData = tokenDoc.data();

    if (!tokenData) {
      throw new Error("Token not found");
    }

    // Update token
    await tokenRef.update({
      status: "revoked",
      revokedAt: new Date(),
      revocationReason: reason,
    });

    // Log action
    await auditLogger.logAccessToken(
      tokenData.recruiterId,
      tokenData.userId,
      tokenId,
      AuditAction.ACCESS_TOKEN_REVOKED
    );
  }

  /**
   * Update user profile with audit logging
   */
  async updateUserProfile(
    userId: string,
    changes: Record<string, any>
  ): Promise<void> {
    const userRef = this.db.collection("users").doc(userId);
    const before = (await userRef.get()).data();

    await userRef.update({
      ...changes,
      updatedAt: new Date(),
    });

    // Log the change
    await auditLogger.log({
      userId,
      action: AuditAction.USER_UPDATED,
      resourceType: ResourceType.USER,
      resourceId: userId,
      changes: {
        before,
        after: { ...before, ...changes },
      },
      status: "success",
    });
  }

  /**
   * Track profile access (for PII protection)
   */
  async logProfileAccess(
    accessorId: string,
    profileOwnerId: string,
    accessType: "own" | "recruiter" | "public"
  ): Promise<void> {
    // Create access log entry
    const accessLog = {
      accessorId,
      profileOwnerId,
      accessType,
      timestamp: new Date(),
      accessorRole: (
        await this.db.collection("users").doc(accessorId).get()
      ).data()?.role,
    };

    await this.db.collection("profileAccessLogs").add(accessLog);

    // Log in audit trail
    await auditLogger.logProfileAccessed(
      accessorId,
      profileOwnerId,
      accessType
    );
  }

  /**
   * Export user data for GDPR compliance
   */
  async exportUserData(userId: string): Promise<Record<string, any>> {
    const user = await this.db.collection("users").doc(userId).get();
    const profiles = await this.db
      .collection("profiles")
      .where("userId", "==", userId)
      .get();
    const resumes = await this.db
      .collectionGroup("resumes")
      .where("userId", "==", userId)
      .get();
    const requests = await this.db
      .collection("recruiterRequests")
      .where("toUserId", "==", userId)
      .get();
    const accessTokens = await this.db
      .collection("accessTokens")
      .where("userId", "==", userId)
      .get();
    const auditLogs = await auditLogger.getUserAuditLogs(userId, 1000);

    const exportData = {
      userProfile: user.data(),
      profiles: profiles.docs.map((doc) => doc.data()),
      resumes: resumes.docs.map((doc) => doc.data()),
      recruiterRequests: requests.docs.map((doc) => doc.data()),
      accessTokens: accessTokens.docs.map((doc) => doc.data()),
      auditLogs,
      exportedAt: new Date().toISOString(),
    };

    // Log the export
    await auditLogger.log({
      userId,
      action: AuditAction.DATA_EXPORT,
      resourceType: ResourceType.USER,
      resourceId: userId,
      details: "User data export for GDPR compliance",
      status: "success",
    });

    return exportData;
  }

  /**
   * Delete user account with audit trail
   */
  async deleteUserAccount(userId: string, reason?: string): Promise<void> {
    try {
      // Log deletion before data is lost
      await auditLogger.log({
        userId,
        action: AuditAction.USER_DELETED,
        resourceType: ResourceType.USER,
        resourceId: userId,
        details: `Account deleted. Reason: ${reason || "Not provided"}`,
        status: "success",
      });

      // Delete user data (in production, consider soft deletes)
      const batch = this.db.batch();

      // Delete user profile
      batch.delete(this.db.collection("users").doc(userId));

      // Delete profiles
      const profiles = await this.db
        .collection("profiles")
        .where("userId", "==", userId)
        .get();
      profiles.forEach((doc) => batch.delete(doc.ref));

      // Delete resumes
      const resumes = await this.db
        .collectionGroup("resumes")
        .where("userId", "==", userId)
        .get();
      resumes.forEach((doc) => batch.delete(doc.ref));

      await batch.commit();

      // Delete Firebase Auth user
      await admin.auth().deleteUser(userId);
    } catch (error) {
      // Log deletion failure
      await auditLogger.log({
        userId,
        action: AuditAction.USER_DELETED,
        resourceType: ResourceType.USER,
        resourceId: userId,
        details: `Account deletion failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        status: "failure",
      });

      throw error;
    }
  }

  /**
   * Detect and log suspicious activity
   */
  async logSuspiciousActivity(
    userId: string,
    activityType: string,
    details: string
  ): Promise<void> {
    // Log suspicious activity
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

  /**
   * Verify token validity and log access
   */
  async verifyAndLogAccessToken(
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

    // Update token usage
    await tokenDoc.ref.update({
      lastUsedAt: new Date(),
      usageCount: (token.usageCount || 0) + 1,
    });

    return true;
  }
}

// Export singleton
export const backendService = new BackendServiceIntegration();
