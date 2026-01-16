import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { handleApiError } from "@/lib/utils/api-helpers";
// eslint-disable-next-line no-restricted-imports
import admin from "firebase-admin";

/**
 * Reset password using token
 * Completes the custom password reset flow
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== "string") {
      return handleApiError(
        new Error("Reset token is required"),
        "Reset token is required",
        400
      );
    }

    if (!newPassword || typeof newPassword !== "string") {
      return handleApiError(
        new Error("New password is required"),
        "New password is required",
        400
      );
    }

    if (newPassword.length < 6) {
      return handleApiError(
        new Error("Password must be at least 6 characters"),
        "Password must be at least 6 characters",
        400
      );
    }

    // Lookup token
    const snapshot = await adminDb
      .collection("passwordResetTokens")
      .where("token", "==", token)
      .where("used", "==", false)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return handleApiError(
        new Error("Invalid or expired reset token"),
        "Invalid or expired reset token",
        400
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
        400
      );
    }

    // Update password in Firebase Auth
    await adminAuth.updateUser(data.userId, {
      password: newPassword,
    });

    // Mark token as used
    await doc.ref.update({
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    return handleApiError(error, "Failed to reset password");
  }
}
