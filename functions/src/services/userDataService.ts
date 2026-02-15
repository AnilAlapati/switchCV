// functions/src/services/userDataService.ts
import * as admin from "firebase-admin";
import { auditLogger, AuditAction, ResourceType } from "./auditLogger";
import * as functions from "firebase-functions";

/** Maximum operations per Firestore batch */
const BATCH_LIMIT = 500;

/**
 * Helper to delete all documents in a query using batched writes.
 * Handles Firestore's 500-operations-per-batch limit.
 */
async function deleteQueryResults(
  db: FirebaseFirestore.Firestore,
  query: FirebaseFirestore.Query,
  label: string,
): Promise<number> {
  const snapshot = await query.limit(BATCH_LIMIT).get();
  if (snapshot.empty) return 0;

  let deleted = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    batchCount++;
    deleted++;

    if (batchCount >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  if (deleted > 0) {
    functions.logger.info(`GDPR delete: removed ${deleted} docs from ${label}`);
  }
  return deleted;
}

/**
 * Helper to anonymize documents (replace userId with "DELETED_USER")
 * instead of deleting — used for audit trails and compliance logs.
 */
async function anonymizeQueryResults(
  db: FirebaseFirestore.Firestore,
  query: FirebaseFirestore.Query,
  userId: string,
  label: string,
): Promise<number> {
  const snapshot = await query.limit(BATCH_LIMIT).get();
  if (snapshot.empty) return 0;

  let anonymized = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    batch.update(doc.ref, {
      userId: "DELETED_USER",
      email: "REDACTED",
      name: "REDACTED",
      anonymizedAt: new Date().toISOString(),
      _originalUserId: admin.firestore.FieldValue.delete(),
    });
    batchCount++;
    anonymized++;

    if (batchCount >= BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  if (anonymized > 0) {
    functions.logger.info(
      `GDPR anonymize: processed ${anonymized} docs from ${label} for user ${userId}`,
    );
  }
  return anonymized;
}

/**
 * Delete documents from a collection across multiple field mappings.
 * This is useful during schema transitions where identity fields changed.
 */
async function deleteCollectionByUserMappings(
  db: FirebaseFirestore.Firestore,
  collectionName: string,
  userId: string,
  fieldMappings: Array<{ field: string; label: string }>,
): Promise<number> {
  let totalDeleted = 0;

  for (const mapping of fieldMappings) {
    totalDeleted += await deleteQueryResults(
      db,
      db.collection(collectionName).where(mapping.field, "==", userId),
      `${collectionName} (${mapping.label})`,
    );
  }

  return totalDeleted;
}

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
    changes: Record<string, any>,
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
      .limit(500)
      .get();
    const resumes = await this.db
      .collectionGroup("resumes")
      .where("userId", "==", userId)
      .limit(500)
      .get();
    const requests = await this.db
      .collection("recruiterRequests")
      .where("toUserId", "==", userId)
      .limit(500)
      .get();
    const accessTokens = await this.db
      .collection("accessTokens")
      .where("userId", "==", userId)
      .limit(500)
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

      // ── Phase 1: Delete primary user data ──
      // User document and subcollections
      await deleteQueryResults(
        this.db,
        this.db.collection("users").doc(userId).collection("surveys"),
        "users/{userId}/surveys",
      );
      await deleteQueryResults(
        this.db,
        this.db.collection("users").doc(userId).collection("billing"),
        "users/{userId}/billing",
      );
      await this.db.collection("users").doc(userId).delete();

      // ── Phase 2: Delete profiles and resumes ──
      await deleteQueryResults(
        this.db,
        this.db.collection("profiles").where("userId", "==", userId),
        "profiles",
      );
      await deleteQueryResults(
        this.db,
        this.db.collectionGroup("resumes").where("userId", "==", userId),
        "resumes (collectionGroup)",
      );
      // Legacy collection
      const legacyProfiles = await this.db
        .collection("resumeProfiles")
        .where("userId", "==", userId)
        .limit(BATCH_LIMIT)
        .get();
      for (const doc of legacyProfiles.docs) {
        // Delete subcollections first
        await deleteQueryResults(
          this.db,
          doc.ref.collection("accessRequests"),
          `resumeProfiles/${doc.id}/accessRequests`,
        );
        await deleteQueryResults(
          this.db,
          doc.ref.collection("accessGrants"),
          `resumeProfiles/${doc.id}/accessGrants`,
        );
      }
      await deleteQueryResults(
        this.db,
        this.db.collection("resumeProfiles").where("userId", "==", userId),
        "resumeProfiles",
      );
      await deleteQueryResults(
        this.db,
        this.db.collection("allResumes").where("userId", "==", userId),
        "allResumes",
      );

      // ── Phase 3: Delete recruiter-related data ──
      await deleteCollectionByUserMappings(
        this.db,
        "recruiterRequests",
        userId,
        [
          {
            field: "fromRecruiter.recruiterId",
            label: "as recruiter (normalized)",
          },
          { field: "recruiterId", label: "as recruiter (legacy)" },
          { field: "toUserId", label: "as candidate (normalized)" },
          { field: "userId", label: "as candidate (legacy)" },
          { field: "candidateId", label: "as candidate (legacy-v2)" },
        ],
      );
      await deleteCollectionByUserMappings(
        this.db,
        "recruiterNotifications",
        userId,
        [
          { field: "recruiterId", label: "recipient (normalized)" },
          { field: "toUserId", label: "candidate recipient (normalized)" },
          { field: "userId", label: "recipient (legacy)" },
        ],
      );
      await deleteCollectionByUserMappings(
        this.db,
        "recruiterSearchHistory",
        userId,
        [
          { field: "recruiterId", label: "owner (normalized)" },
          { field: "userId", label: "owner (legacy)" },
        ],
      );
      await deleteCollectionByUserMappings(
        this.db,
        "recruiterInterviews",
        userId,
        [
          { field: "createdBy", label: "owner (normalized)" },
          { field: "recruiterId", label: "owner (legacy)" },
          { field: "userId", label: "owner (legacy-v2)" },
        ],
      );
      await deleteCollectionByUserMappings(
        this.db,
        "recruiterPipelines",
        userId,
        [
          { field: "recruiterId", label: "owner (normalized)" },
          { field: "userId", label: "owner (legacy)" },
        ],
      );
      await deleteCollectionByUserMappings(
        this.db,
        "recruiterCandidates",
        userId,
        [
          { field: "createdBy", label: "owner (normalized)" },
          { field: "recruiterId", label: "owner (legacy)" },
          { field: "userId", label: "owner (legacy-v2)" },
        ],
      );
      await deleteCollectionByUserMappings(
        this.db,
        "recruiterBulkActions",
        userId,
        [
          { field: "createdBy", label: "owner (normalized)" },
          { field: "recruiterId", label: "owner (legacy)" },
          { field: "userId", label: "owner (legacy-v2)" },
        ],
      );

      // ── Phase 4: Delete tokens, contacts, and misc user data ──
      await deleteQueryResults(
        this.db,
        this.db.collection("accessTokens").where("userId", "==", userId),
        "accessTokens",
      );
      await deleteQueryResults(
        this.db,
        this.db.collection("contactRequests").where("userId", "==", userId),
        "contactRequests",
      );
      await deleteQueryResults(
        this.db,
        this.db
          .collection("contactRequests")
          .where("targetUserId", "==", userId),
        "contactRequests (as target)",
      );
      await deleteQueryResults(
        this.db,
        this.db.collection("notifications").where("userId", "==", userId),
        "notifications",
      );
      await deleteQueryResults(
        this.db,
        this.db.collection("drafts").where("userId", "==", userId),
        "drafts",
      );
      await deleteQueryResults(
        this.db,
        this.db.collection("draftIdMapping").where("userId", "==", userId),
        "draftIdMapping",
      );
      await deleteQueryResults(
        this.db,
        this.db.collection("searchQuotas").where("userId", "==", userId),
        "searchQuotas",
      );
      await deleteQueryResults(
        this.db,
        this.db
          .collection("userApprovalRequests")
          .where("userId", "==", userId),
        "userApprovalRequests",
      );
      await deleteQueryResults(
        this.db,
        this.db.collection("verificationTokens").where("userId", "==", userId),
        "verificationTokens",
      );
      await deleteQueryResults(
        this.db,
        this.db.collection("passwordResetTokens").where("userId", "==", userId),
        "passwordResetTokens",
      );
      await deleteQueryResults(
        this.db,
        this.db.collection("jobSeekerMetrics").where("userId", "==", userId),
        "jobSeekerMetrics",
      );
      await deleteQueryResults(
        this.db,
        this.db.collection("profileAccessLogs").where("userId", "==", userId),
        "profileAccessLogs",
      );

      // Username mapping cleanup
      await deleteQueryResults(
        this.db,
        this.db.collection("usernames").where("userId", "==", userId),
        "usernames",
      );

      // ── Phase 5: Delete AI-related usage data ──
      await deleteQueryResults(
        this.db,
        this.db.collection("aiUsageLogs").where("userId", "==", userId),
        "aiUsageLogs",
      );
      await deleteQueryResults(
        this.db,
        this.db.collection("billing").doc(userId).collection("monthly"),
        "billing/{userId}/monthly",
      );

      // ── Phase 6: Anonymize audit/compliance logs (RETAIN for legal compliance) ──
      await anonymizeQueryResults(
        this.db,
        this.db.collection("auditLogs").where("userId", "==", userId),
        userId,
        "auditLogs",
      );
      await anonymizeQueryResults(
        this.db,
        this.db.collection("aiAuditLogs").where("userId", "==", userId),
        userId,
        "aiAuditLogs",
      );
      await anonymizeQueryResults(
        this.db,
        this.db.collection("emailLogs").where("userId", "==", userId),
        userId,
        "emailLogs",
      );

      // ── Phase 7: Delete Firebase Auth user ──
      await admin.auth().deleteUser(userId);

      functions.logger.info(
        `GDPR: Account deletion completed for user ${userId}`,
      );
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
