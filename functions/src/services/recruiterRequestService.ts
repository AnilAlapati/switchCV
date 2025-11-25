// functions/src/services/recruiterRequestService.ts
import * as admin from "firebase-admin";
import { auditLogger, AuditAction } from "./auditLogger";

/**
 * Handles all recruiter request operations
 */
export class RecruiterRequestService {
  private db: FirebaseFirestore.Firestore;

  constructor(db: FirebaseFirestore.Firestore = admin.firestore()) {
    this.db = db;
  }

  async create(data: {
    recruiterId: string;
    candidateId: string;
    position: string;
    companyName: string;
    message: string;
  }): Promise<string> {
    const batch = this.db.batch();
    const requestRef = this.db.collection("recruiterRequests").doc();

    batch.set(requestRef, {
      ...data,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await batch.commit();

    await auditLogger.logRecruiterRequest(
      requestRef.id,
      data.recruiterId,
      data.candidateId,
      AuditAction.RECRUITER_REQUEST_CREATED
    );

    return requestRef.id;
  }

  async approve(
    requestId: string,
    adminId: string,
    reason?: string
  ): Promise<string> {
    const batch = this.db.batch();
    const requestRef = this.db.collection("recruiterRequests").doc(requestId);
    const requestDoc = await requestRef.get();
    const requestData = requestDoc.data();

    if (!requestData) {
      throw new Error("Request not found");
    }

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
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      status: "active",
    });

    await batch.commit();

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

    return tokenRef.id;
  }

  async deny(
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

    await requestRef.update({
      status: "denied",
      deniedAt: new Date(),
      deniedBy: adminId,
      denialReason: reason,
    });

    await auditLogger.logRecruiterRequest(
      requestId,
      requestData.fromRecruiter.recruiterId,
      requestData.toUserId,
      AuditAction.RECRUITER_REQUEST_DENIED,
      false
    );
  }
}

export const recruiterRequestService = new RecruiterRequestService();
