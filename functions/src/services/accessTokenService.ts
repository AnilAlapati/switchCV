// functions/src/services/accessTokenService.ts
import * as admin from "firebase-admin";
import { auditLogger, AuditAction } from "./auditLogger";

/**
 * Handles all access token operations
 */
export class AccessTokenService {
  private db: FirebaseFirestore.Firestore;

  constructor(db: FirebaseFirestore.Firestore = admin.firestore()) {
    this.db = db;
  }

  async revoke(tokenId: string, reason?: string): Promise<void> {
    const tokenRef = this.db.collection("accessTokens").doc(tokenId);
    const tokenDoc = await tokenRef.get();
    const tokenData = tokenDoc.data();

    if (!tokenData) {
      throw new Error("Token not found");
    }

    await tokenRef.update({
      status: "revoked",
      revokedAt: new Date(),
      revocationReason: reason,
    });

    await auditLogger.logAccessToken(
      tokenData.recruiterId,
      tokenData.userId,
      tokenId,
      AuditAction.ACCESS_TOKEN_REVOKED
    );
  }

  async verify(tokenId: string, recruiterId: string): Promise<boolean> {
    const tokenDoc = await this.db
      .collection("accessTokens")
      .doc(tokenId)
      .get();
    const token = tokenDoc.data();

    if (!token) {
      return false;
    }

    if (token.status !== "active") {
      return false;
    }

    if (new Date(token.expiresAt) < new Date()) {
      return false;
    }

    // Update token usage
    await tokenDoc.ref.update({
      lastUsedAt: new Date(),
      usageCount: (token.usageCount || 0) + 1,
    });

    return true;
  }

  async recordUsage(tokenId: string): Promise<void> {
    const tokenRef = this.db.collection("accessTokens").doc(tokenId);
    const tokenDoc = await tokenRef.get();
    const token = tokenDoc.data();

    if (!token) {
      throw new Error("Token not found");
    }

    await tokenRef.update({
      lastUsedAt: new Date(),
      usageCount: (token.usageCount || 0) + 1,
    });
  }
}

export const accessTokenService = new AccessTokenService();
