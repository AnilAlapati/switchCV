/* eslint-disable no-console */
import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/services/authService";

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

    const result = await verifyEmailToken(token);

    if (!result.success) {
      console.log(`[VERIFY] Verification failed: ${result.error}`);
      if (result.error === "invalid-token") {
        return NextResponse.redirect(new URL("/auth?error=invalid-token", request.url));
      }
      if (result.error === "expired-token") {
        return NextResponse.redirect(new URL("/auth?error=expired-token", request.url));
      }
      return NextResponse.redirect(new URL("/auth?error=verification-failed", request.url));
    }

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
