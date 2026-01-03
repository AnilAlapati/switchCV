import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { handleApiError } from "@/lib/utils/api-helpers";
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
      return NextResponse.json(
        { error: "Reset token is required" },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "New password is required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
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
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
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
      return NextResponse.json(
        { error: "Reset token has expired" },
        { status: 400 }
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
