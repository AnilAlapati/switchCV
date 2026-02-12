import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/services/authService";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/utils/api-helpers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/auth?error=missing-token", request.url)
    );
  }

  try {
    logger.info({ token: token.substring(0, 8) + "..." }, "Starting email verification");

    const result = await verifyEmailToken(token);

    if (!result.success) {
      handleApiError(result.error, "Email verification failed", 400);
      if (result.error === "invalid-token") {
        return NextResponse.redirect(new URL("/auth?error=invalid-token", request.url));
      }
      if (result.error === "expired-token") {
        return NextResponse.redirect(new URL("/auth?error=expired-token", request.url));
      }
      return NextResponse.redirect(new URL("/auth?error=verification-failed", request.url));
    }

    // 5. Redirect to success
    logger.info("Email verification successful, redirecting");
    return NextResponse.redirect(
      new URL("/auth?verificationSuccess=true", request.url)
    );
  } catch (error) {
    handleApiError(error, "Email verification error", 500);
    return NextResponse.redirect(
      new URL("/auth?error=verification-failed", request.url)
    );
  }
}
