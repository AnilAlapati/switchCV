import { NextRequest, NextResponse } from "next/server";
import {
  COLLECTIONS,
  collectionRef,
  serverTimestamp,
  updateAuthUser,
} from "@/lib/dal";
import { handleApiError } from "@/lib/utils/api-helpers";
import { ResetPasswordSchema } from "@/lib/schemas/api";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { createHash } from "crypto";

/**
 * Reset password using token
 * Completes the custom password reset flow
 */
export async function POST(request: NextRequest) {
  try {
    // Strict rate limit for password reset (5 per 15 min)
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = await checkRateLimit(`reset-password:${ip}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const payload = await request.json();
    const parseResult = ResetPasswordSchema.safeParse(payload);
    if (!parseResult.success) {
      const payloadObj =
        payload && typeof payload === "object"
          ? (payload as Record<string, unknown>)
          : undefined;
      if (
        !payloadObj ||
        payloadObj.token === undefined ||
        payloadObj.token === ""
      ) {
        return handleApiError(
          parseResult.error,
          "Reset token is required",
          400,
        );
      }
      if (
        payloadObj.newPassword === undefined ||
        payloadObj.newPassword === ""
      ) {
        return handleApiError(
          parseResult.error,
          "New password is required",
          400,
        );
      }
      return handleApiError(
        parseResult.error,
        "Password must be at least 8 characters with uppercase, lowercase, and a digit",
        400,
      );
    }
    const { token, newPassword } = parseResult.data;

    // Hash the incoming token and look up by hash
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const snapshot = await collectionRef(COLLECTIONS.PASSWORD_RESET_TOKENS)
      .where("tokenHash", "==", tokenHash)
      .where("used", "==", false)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return handleApiError(
        new Error("Invalid or expired reset token"),
        "Invalid or expired reset token",
        400,
      );
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // Check expiration
    const now = Date.now();
    const expiresAt = data.expiresAt?.toMillis
      ? data.expiresAt.toMillis()
      : new Date(data.expiresAt).getTime();

    if (now > expiresAt) {
      return handleApiError(
        new Error("Reset token has expired"),
        "Reset token has expired",
        400,
      );
    }

    // Update password in Firebase Auth
    await updateAuthUser(data.userId, {
      password: newPassword,
    });

    // Mark token as used
    await doc.ref.update({
      used: true,
      usedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    return handleApiError(error, "Failed to reset password");
  }
}
