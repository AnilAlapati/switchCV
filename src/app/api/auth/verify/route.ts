import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth?error=missing-token", request.url)
    );
  }

  try {
    console.log("[VERIFY] Starting verification for token:", token);

    // 1. Lookup token
    const snapshot = await adminDb
      .collection("verificationTokens")
      .where("token", "==", token)
      .where("used", "==", false)
      .limit(1)
      .get();

    console.log(
      "[VERIFY] Token query result - empty:",
      snapshot.empty,
      "size:",
      snapshot.size
    );

    if (snapshot.empty) {
      console.log("[VERIFY] Token not found or already used");
      return NextResponse.redirect(
        new URL("/auth?error=invalid-token", request.url)
      );
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    console.log("[VERIFY] Token data:", {
      userId: data.userId,
      used: data.used,
    });

    // 2. Check expiration
    const now = Date.now();
    // Handle both Firestore Timestamp and plain text/number if schema varies
    const expiresAt = data.expiresAt?.toMillis
      ? data.expiresAt.toMillis()
      : new Date(data.expiresAt).getTime();

    if (now > expiresAt) {
      console.log("[VERIFY] Token expired");
      return NextResponse.redirect(
        new URL("/auth?error=expired-token", request.url)
      );
    }

    // 3. Mark user as verified
    console.log("[VERIFY] Updating user emailVerified status...");
    await adminAuth.updateUser(data.userId, {
      emailVerified: true,
    });
    console.log("[VERIFY] User updated successfully");

    // 4. Mark token as used
    console.log("[VERIFY] Marking token as used...");
    await doc.ref.update({
      used: true,
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log("[VERIFY] Token marked as used");

    // 5. Redirect to success
    console.log("[VERIFY] Verification successful, redirecting...");
    return NextResponse.redirect(
      new URL("/auth?verificationSuccess=true", request.url)
    );
  } catch (error) {
    console.error("[VERIFY] Verification error:", error);
    return NextResponse.redirect(
      new URL("/auth?error=verification-failed", request.url)
    );
  }
}
