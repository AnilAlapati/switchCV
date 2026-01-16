import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports
import admin, { adminDb } from "@/lib/firebase-admin";
import { tokenGenerator, TokenVerificationResult } from "@/lib/tokenGenerator";
import { SecureAccessToken } from "@/types/profileSearch";
import { handleApiError } from "@/lib/utils/api-helpers";

/**
 * GET /api/recruiters/verify-token?token=XXX&recruiterId=YYY
 * Verify a recruiter's access token for PII fields
 *
 * Returns:
 * - Token validity status
 * - List of accessible fields (if valid)
 * - Time remaining (if valid)
 * - Expiration date
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");
    const tokenId = searchParams.get("tokenId");
    const recruiterId = searchParams.get("recruiterId");
    const ipAddress = searchParams.get("ipAddress");

    if (!token && !tokenId) {
      return handleApiError(
        new Error("Token or tokenId is required"),
        "Token or tokenId is required",
        400
      );
    }

    // If token ID provided, get from Firestore
    let tokenData: SecureAccessToken | null = null;
    if (tokenId) {
      const tokenDoc = await adminDb
        .collection("accessTokens")
        .doc(tokenId)
        .get();
      if (tokenDoc.exists) {
        tokenData = tokenDoc.data() as SecureAccessToken;
      }
    }

    // Verify token signature if token provided
    let verification: TokenVerificationResult = { valid: false };
    if (token) {
      verification = tokenGenerator.verifyToken(token);

      // If token provided with ID, verify they match
      if (tokenId && verification.valid && verification.payload) {
        if (verification.payload.tokenId !== tokenId) {
          return handleApiError(
            new Error("Token mismatch"),
            "Token mismatch",
            400
          );
        }
      }

      // If recruiter ID provided, verify it matches
      if (recruiterId && verification.valid && verification.payload) {
        if (verification.payload.recruiterId !== recruiterId) {
          return handleApiError(
            new Error("Token not issued to this recruiter"),
            "Token not issued to this recruiter",
            403
          );
        }
      }
    }

    // Check if token is revoked
    if (tokenData && tokenData.isRevoked) {
      return NextResponse.json({
        valid: false,
        revoked: true,
        revokedAt: tokenData.revokedAt,
        revokeReason: tokenData.revokeReason,
        message: "Token has been revoked",
      });
    }

    // Check IP whitelist if configured
    if (
      tokenData?.ipAddressWhitelist &&
      tokenData.ipAddressWhitelist.length > 0
    ) {
      if (!ipAddress || !tokenData.ipAddressWhitelist.includes(ipAddress)) {
        return handleApiError(
          new Error("IP address not whitelisted for this token"),
          "IP address not whitelisted for this token",
          403
        );
      }
    }

    // Check expiration
    if (tokenData && verification.valid) {
      const expiresAtNum =
        typeof tokenData.expiresAt === "string"
          ? new Date(tokenData.expiresAt).getTime() / 1000
          : tokenData.expiresAt instanceof Date
          ? tokenData.expiresAt.getTime() / 1000
          : tokenData.expiresAt;

      if (typeof expiresAtNum !== "number") {
        return NextResponse.json({
          valid: false,
          message: "Token expiration missing",
        });
      }

      if (tokenGenerator.isExpired(expiresAtNum)) {
        return NextResponse.json({
          valid: false,
          expired: true,
          expiresAt: tokenData.expiresAt,
          message: "Token has expired",
        });
      }

      // Track usage
      if (tokenId) {
        await adminDb
          .collection("accessTokens")
          .doc(tokenId)
          .update({
            usageCount: (tokenData.usageCount || 0) + 1,
            lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
      }

      const remainingSeconds = tokenGenerator.getRemainingTime(expiresAtNum);
      const payload = verification.payload;
      const expiresAtDate =
        tokenData?.expiresAt ||
        (payload?.expiresAt ? new Date(payload.expiresAt * 1000) : undefined);
      const issuedAtDate =
        tokenData?.issuedAt ||
        (payload?.issuedAt ? new Date(payload.issuedAt * 1000) : undefined);

      return NextResponse.json({
        valid: true,
        verified: true,
        tokenId: tokenId || payload?.tokenId,
        recruiterId: recruiterId || payload?.recruiterId,
        userId: payload?.userId,
        resumeId: payload?.resumeId,
        accessFields: payload?.accessFields || tokenData.accessFields,
        accessType: tokenData?.accessType || "read-only",
        expiresAt: expiresAtDate,
        issuedAt: issuedAtDate,
        duration: tokenData?.duration,
        remainingSeconds,
        readableTimeRemaining:
          tokenGenerator.getReadableTimeRemaining(expiresAtNum),
        usageCount: tokenData?.usageCount || 0,
        message: "Token is valid and accessible",
      });
    }

    return NextResponse.json({
      valid: false,
      message: verification.error || "Token verification failed",
      details: verification,
    });
  } catch (error) {
    logger.error({ err: error }, "❌ Verify token error:");
    return handleApiError(error, "Failed to verify token");
  }
}

/**
 * POST /api/recruiters/verify-token
 * Verify token with body payload (allows for more secure transmission)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, tokenId, recruiterId, ipAddress } = body;

    if (!token && !tokenId) {
      return handleApiError(
        new Error("Token or tokenId is required"),
        "Token or tokenId is required",
        400
      );
    }

    // Reuse GET logic
    const searchParams = new URLSearchParams();
    if (token) searchParams.append("token", token);
    if (tokenId) searchParams.append("tokenId", tokenId);
    if (recruiterId) searchParams.append("recruiterId", recruiterId);
    if (ipAddress) searchParams.append("ipAddress", ipAddress);

    const url = new URL("/api/recruiters/verify-token", request.url);
    url.search = searchParams.toString();

    const nextRequest = new NextRequest(url, { method: "GET" });
    const response = await GET(nextRequest);
    return response;
  } catch (error) {
    logger.error({ err: error }, "❌ Verify token error:");
    return handleApiError(error, "Failed to verify token");
  }
}
