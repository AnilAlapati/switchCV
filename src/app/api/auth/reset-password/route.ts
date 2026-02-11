import { NextRequest, NextResponse } from "next/server";
import {
  COLLECTIONS,
  collectionRef,
  serverTimestamp,
  updateAuthUser,
} from "@/lib/dal";
import { handleApiError } from "@/lib/utils/api-helpers";
import { ResetPasswordSchema } from "@/lib/schemas/api";

/**
 * Reset password using token
 * Completes the custom password reset flow
 */
export async function POST(request: NextRequest) {
  try {
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

    // Lookup token
    const snapshot = await collectionRef(COLLECTIONS.PASSWORD_RESET_TOKENS)
      .where("token", "==", token)
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
