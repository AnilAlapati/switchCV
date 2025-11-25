// functions/src/services/profileAccessService.ts
import * as admin from "firebase-admin";
import { auditLogger } from "./auditLogger";

/**
 * Handles profile access logging and PII protection
 */
export class ProfileAccessService {
  private db: FirebaseFirestore.Firestore;

  constructor(db: FirebaseFirestore.Firestore = admin.firestore()) {
    this.db = db;
  }

  async logProfileAccess(
    accessorId: string,
    profileOwnerId: string,
    accessType: "own" | "recruiter" | "public"
  ): Promise<void> {
    const accessorDoc = await this.db.collection("users").doc(accessorId).get();

    const accessLog = {
      accessorId,
      profileOwnerId,
      accessType,
      timestamp: new Date(),
      accessorRole: accessorDoc.data()?.role,
    };

    await this.db.collection("profileAccessLogs").add(accessLog);

    await auditLogger.logProfileAccessed(
      accessorId,
      profileOwnerId,
      accessType
    );
  }
}

export const profileAccessService = new ProfileAccessService();
