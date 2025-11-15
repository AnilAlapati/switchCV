// functions/src/services/userDataService.ts
import * as admin from "firebase-admin";
import { auditLogger, AuditAction, ResourceType } from "./auditLogger";

/**
 * Handles user data management including exports and deletions
 */
export class UserDataService {
  private db: FirebaseFirestore.Firestore;

  constructor(db: FirebaseFirestore.Firestore = admin.firestore()) {
    this.db = db;
  }

  async updateProfile(
    userId: string,
    changes: Record<string, any>
  ): Promise<void> {
    const userRef = this.db.collection("users").doc(userId);
    const before = (await userRef.get()).data();

    await userRef.update({
      ...changes,
      updatedAt: new Date(),
    });

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

  async deleteAccount(userId: string, reason?: string): Promise<void> {
    try {
      await auditLogger.log({
        userId,
        action: AuditAction.USER_DELETED,
        resourceType: ResourceType.USER,
        resourceId: userId,
        details: `Account deleted. Reason: ${reason || "Not provided"}`,
        status: "success",
      });

      const batch = this.db.batch();

      batch.delete(this.db.collection("users").doc(userId));

      const profiles = await this.db
        .collection("profiles")
        .where("userId", "==", userId)
        .get();
      profiles.forEach((doc) => batch.delete(doc.ref));

      const resumes = await this.db
        .collectionGroup("resumes")
        .where("userId", "==", userId)
        .get();
      resumes.forEach((doc) => batch.delete(doc.ref));

      await batch.commit();

      await admin.auth().deleteUser(userId);
    } catch (error) {
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
}

export const userDataService = new UserDataService();
