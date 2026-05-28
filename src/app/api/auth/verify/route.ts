import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/services/authService";
import { logger } from "@/lib/logger";
import { handleApiError } from "@/lib/utils/api-helpers";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");

  if (!token) {
    const redirectResponse = NextResponse.redirect(
      new URL("/auth?error=missing-token", request.url),
    );
    redirectResponse.headers.set("Cache-Control", "no-store");
    return redirectResponse;
  }

  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const rateLimit = await checkDistributedRateLimit(ip, {
      limit: 5,
      windowMs: 60 * 1000,
      scope: "auth-verify",
    });
    if (!rateLimit.allowed) {
      const r = NextResponse.redirect(
        new URL("/auth?error=rate-limited", request.url),
      );
      r.headers.set("Cache-Control", "no-store");
      return r;
    }

    logger.info(
      { token: token.substring(0, 8) + "..." },
      "Starting email verification",
    );

    const result = await verifyEmailToken(token);

    if (!result.success) {
      handleApiError(result.error, "Email verification failed", 400);
      if (result.error === "invalid-token") {
        const r = NextResponse.redirect(
          new URL("/auth?error=invalid-token", request.url),
        );
        r.headers.set("Cache-Control", "no-store");
        return r;
      }
      if (result.error === "expired-token") {
        const r = NextResponse.redirect(
          new URL("/auth?error=expired-token", request.url),
        );
        r.headers.set("Cache-Control", "no-store");
        return r;
      }
      const r = NextResponse.redirect(
        new URL("/auth?error=verification-failed", request.url),
      );
      r.headers.set("Cache-Control", "no-store");
      return r;
    }

    // 5. Redirect to success
    logger.info("Email verification successful, redirecting");
    const successRedirect = NextResponse.redirect(
      new URL("/auth?verificationSuccess=true", request.url),
    );
    successRedirect.headers.set("Cache-Control", "no-store");
    return successRedirect;
  } catch (error) {
    handleApiError(error, "Email verification error", 500);
    const errRedirect = NextResponse.redirect(
      new URL("/auth?error=verification-failed", request.url),
    );
    errRedirect.headers.set("Cache-Control", "no-store");
    return errRedirect;
  }
}
