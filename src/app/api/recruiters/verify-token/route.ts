import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { tokenGenerator, TokenVerificationResult } from "@/lib/tokenGenerator";
import { SecureAccessToken } from "@/types/profileSearch";

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
      return NextResponse.json(
        {
          valid: false,
          error: "Token or tokenId is required",
        },
        { status: 400 }
      );
    }

    // If token ID provided, get from Firestore
    let tokenData: SecureAccessToken | null = null;
    if (tokenId) {
      const tokenRef = doc(db, "accessTokens", tokenId);
      const tokenDoc = await getDoc(tokenRef);
      if (tokenDoc.exists()) {
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
          return NextResponse.json(
            {
              valid: false,
              error: "Token mismatch",
            },
            { status: 400 }
          );
        }
      }

      // If recruiter ID provided, verify it matches
      if (recruiterId && verification.valid && verification.payload) {
        if (verification.payload.recruiterId !== recruiterId) {
          return NextResponse.json(
            {
              valid: false,
              error: "Token not issued to this recruiter",
            },
            { status: 403 }
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
        error: "Token has been revoked",
      });
    }

    // Check IP whitelist if configured
    if (
      tokenData?.ipAddressWhitelist &&
      tokenData.ipAddressWhitelist.length > 0
    ) {
      if (!ipAddress || !tokenData.ipAddressWhitelist.includes(ipAddress)) {
        return NextResponse.json(
          {
            valid: false,
            error: "IP address not whitelisted for this token",
            currentIp: ipAddress,
          },
          { status: 403 }
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

      if (tokenGenerator.isExpired(expiresAtNum as number)) {
        return NextResponse.json({
          valid: false,
          expired: true,
          expiresAt: tokenData.expiresAt,
          error: "Token has expired",
        });
      }

      // Track usage
      if (tokenId) {
        const tokenRef = doc(db, "accessTokens", tokenId);
        await updateDoc(tokenRef, {
          usageCount: (tokenData.usageCount || 0) + 1,
          lastUsedAt: serverTimestamp(),
        });
      }

      const remainingSeconds = tokenGenerator.getRemainingTime(
        expiresAtNum as number
      );

      return NextResponse.json({
        valid: true,
        verified: true,
        tokenId: tokenId || verification.payload?.tokenId,
        recruiterId: recruiterId || verification.payload?.recruiterId,
        userId: verification.payload?.userId,
        resumeId: verification.payload?.resumeId,
        accessFields:
          verification.payload?.accessFields || tokenData.accessFields,
        accessType: tokenData?.accessType || "read-only",
        expiresAt:
          tokenData?.expiresAt ||
          new Date(verification.payload?.expiresAt! * 1000),
        issuedAt:
          tokenData?.issuedAt ||
          new Date(verification.payload?.issuedAt! * 1000),
        duration: tokenData?.duration,
        remainingSeconds,
        readableTimeRemaining: tokenGenerator.getReadableTimeRemaining(
          expiresAtNum as number
        ),
        usageCount: tokenData?.usageCount || 0,
        message: "Token is valid and accessible",
      });
    }

    return NextResponse.json({
      valid: false,
      error: verification.error || "Token verification failed",
      details: verification,
    });
  } catch (error) {
    console.error("❌ Verify token error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "Failed to verify token",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
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
      return NextResponse.json(
        {
          valid: false,
          error: "Token or tokenId is required",
        },
        { status: 400 }
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
    console.error("❌ Verify token error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "Failed to verify token",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
