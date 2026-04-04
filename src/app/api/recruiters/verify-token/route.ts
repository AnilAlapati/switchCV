import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { COLLECTIONS, collectionRef, serverTimestamp } from "@/lib/dal";
import { tokenGenerator, TokenVerificationResult } from "@/lib/tokenGenerator";
import { SecureAccessToken } from "@/types/profileSearch";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { VerifyRecruiterTokenSchema } from "@/lib/schemas/api";

export const dynamic = "force-dynamic";

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
  // SECURITY: Require authentication to verify tokens
  const { userId: authUserId, error: authError } =
    await getAuthenticatedUserId(request);
  if (authError || !authUserId)
    return authError || handleApiError(null, "Unauthorized", 401);

  try {
    const searchParams = request.nextUrl.searchParams;
    const parseResult = VerifyRecruiterTokenSchema.safeParse({
      token: searchParams.get("token") || undefined,
      tokenId: searchParams.get("tokenId") || undefined,
      recruiterId: searchParams.get("recruiterId") || undefined,
    });
    if (!parseResult.success) {
      return handleApiError(
        new Error("Token or tokenId is required"),
        "Token or tokenId is required",
        400,
      );
    }
    const { token, tokenId, recruiterId } = parseResult.data;

    // SECURITY: Use trusted server IP, not client-supplied param
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = forwardedFor?.split(",")[0]?.trim() || "unknown";

    // If token ID provided, get from Firestore
    let tokenData: SecureAccessToken | null = null;
    if (tokenId) {
      const tokenDoc = await collectionRef(COLLECTIONS.ACCESS_TOKENS)
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
            400,
          );
        }
      }

      // If recruiter ID provided, verify it matches
      if (recruiterId && verification.valid && verification.payload) {
        if (verification.payload.recruiterId !== recruiterId) {
          return handleApiError(
            new Error("Token not issued to this recruiter"),
            "Token not issued to this recruiter",
            403,
          );
        }
      }
    }

    const resolvedTokenId = tokenId || verification.payload?.tokenId;

    // For token-only flow, attempt token lookup using payload tokenId
    if (!tokenData && resolvedTokenId) {
      const tokenDoc = await collectionRef(COLLECTIONS.ACCESS_TOKENS)
        .doc(resolvedTokenId)
        .get();
      if (tokenDoc.exists) {
        tokenData = tokenDoc.data() as SecureAccessToken;
      }
    }

    if (!token && tokenData) {
      // tokenId-only flow: allow verification based on stored token record
      verification = { valid: true };
    }

    // SECURITY: Verify the authenticated user owns this token
    const tokenRecruiterId =
      verification.payload?.recruiterId || tokenData?.recruiterId;
    if (tokenRecruiterId && authUserId !== tokenRecruiterId) {
      return handleApiError(
        new Error("Forbidden: Token does not belong to authenticated user"),
        "Forbidden: Token does not belong to authenticated user",
        403,
      );
    }

    // Optional recruiter check should work for both token and tokenId-only flows
    if (recruiterId && tokenRecruiterId && recruiterId !== tokenRecruiterId) {
      return handleApiError(
        new Error("Token not issued to this recruiter"),
        "Token not issued to this recruiter",
        403,
      );
    }

    // Check if token is revoked
    if (tokenData && tokenData.isRevoked) {
      return NextResponse.json(
        {
          valid: false,
          revoked: true,
          revokedAt: tokenData.revokedAt,
          revokeReason: tokenData.revokeReason,
          message: "Token has been revoked",
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    if (
      tokenData?.ipAddressWhitelist &&
      tokenData.ipAddressWhitelist.length > 0
    ) {
      if (
        realIp === "unknown" ||
        !tokenData.ipAddressWhitelist.includes(realIp)
      ) {
        return handleApiError(
          new Error("IP address not whitelisted for this token"),
          "IP address not whitelisted for this token",
          403,
        );
      }
    }

    // Check expiration
    if (verification.valid) {
      const payloadExpiresAt = verification.payload?.expiresAt;
      const expiresAtNum = tokenData
        ? typeof tokenData.expiresAt === "string"
          ? new Date(tokenData.expiresAt).getTime() / 1000
          : tokenData.expiresAt instanceof Date
            ? tokenData.expiresAt.getTime() / 1000
            : (tokenData.expiresAt as any)?.toDate // Handle Firestore Timestamp
              ? (tokenData.expiresAt as any).toDate().getTime() / 1000
              : tokenData.expiresAt
        : payloadExpiresAt;

      if (typeof expiresAtNum !== "number") {
        return NextResponse.json(
          { valid: false, message: "Token expiration missing" },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      }

      if (tokenGenerator.isExpired(expiresAtNum)) {
        return NextResponse.json(
          {
            valid: false,
            expired: true,
            expiresAt:
              tokenData?.expiresAt ||
              (payloadExpiresAt
                ? new Date(payloadExpiresAt * 1000)
                : undefined),
            message: "Token has expired",
          },
          { headers: { "Cache-Control": "private, no-store" } },
        );
      }

      // Track usage
      if (resolvedTokenId && tokenData) {
        await collectionRef(COLLECTIONS.ACCESS_TOKENS)
          .doc(resolvedTokenId)
          .update({
            usageCount: (tokenData.usageCount || 0) + 1,
            lastUsedAt: serverTimestamp(),
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

      return NextResponse.json(
        {
          valid: true,
          verified: true,
          tokenId: resolvedTokenId || payload?.tokenId,
          recruiterId:
            recruiterId || payload?.recruiterId || tokenData?.recruiterId,
          userId: payload?.userId || tokenData?.userId,
          resumeId: payload?.resumeId || tokenData?.resumeId,
          accessFields: payload?.accessFields || tokenData?.accessFields || [],
          accessType: tokenData?.accessType || "read-only",
          expiresAt: expiresAtDate,
          issuedAt: issuedAtDate,
          duration: tokenData?.duration,
          remainingSeconds,
          readableTimeRemaining:
            tokenGenerator.getReadableTimeRemaining(expiresAtNum),
          usageCount: tokenData?.usageCount || 0,
          message: "Token is valid and accessible",
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }

    return NextResponse.json(
      {
        valid: false,
        message: verification.error || "Token verification failed",
        details: verification,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
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
  // SECURITY: Require authentication to verify tokens
  const { userId: authUserId, error: authError } =
    await getAuthenticatedUserId(request);
  if (authError || !authUserId)
    return authError || handleApiError(null, "Unauthorized", 401);

  try {
    const parseResult = VerifyRecruiterTokenSchema.safeParse(
      await request.json(),
    );
    if (!parseResult.success) {
      return handleApiError(
        new Error("Token or tokenId is required"),
        "Token or tokenId is required",
        400,
      );
    }
    const { token, tokenId, recruiterId } = parseResult.data;

    // Reuse GET logic via direct call with modified request
    const url = new URL("/api/recruiters/verify-token", request.url);
    const searchParams = url.searchParams;
    if (token) searchParams.set("token", token);
    if (tokenId) searchParams.set("tokenId", tokenId);
    if (recruiterId) searchParams.set("recruiterId", recruiterId);

    // Ensure headers (including X-Forwarded-For) are passed through
    const headers = new Headers(request.headers);

    const nextRequest = new NextRequest(url, {
      method: "GET",
      headers,
    });
    return await GET(nextRequest);
  } catch (error) {
    logger.error({ err: error }, "❌ Verify token error:");
    return handleApiError(error, "Failed to verify token");
  }
}
