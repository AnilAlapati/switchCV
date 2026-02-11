import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js Edge Middleware
 *
 * Enforces CSRF validation on state-changing API requests (POST, PUT, DELETE, PATCH).
 * Uses the SameSite cookie + custom header pattern (Origin/Referer check) since
 * the in-memory CSRF token store doesn't work across serverless invocations.
 *
 * This approach is recommended by OWASP for stateless CSRF protection:
 * - Verify Origin header matches expected origins
 * - Verify Referer header as fallback
 * - Combined with SameSite=Strict cookies for session tokens
 */

/**
 * Routes exempt from CSRF protection.
 * These are either public endpoints, webhook handlers, or auth endpoints
 * that don't use cookie-based auth (token-based instead).
 */
const CSRF_EXEMPT_PATHS = [
  "/api/health",
  "/api/health/infra",
  "/api/system-config",
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/verify",
  "/api/auth/reset-password",
  "/api/auth/request-reset",
  "/api/user-approval",
  "/api/csrf-token",
  "/api/webhooks",
];

const PROTECTED_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

/**
 * Check if a request path is exempt from CSRF validation
 */
function isCsrfExemptPath(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.some(
    (exempt) => pathname === exempt || pathname.startsWith(`${exempt}/`),
  );
}

/**
 * Get allowed origins from environment or defaults
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Production origins
  if (process.env.NEXT_PUBLIC_APP_URL) {
    origins.push(process.env.NEXT_PUBLIC_APP_URL);
  }

  // Development origins
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test"
  ) {
    origins.push("http://localhost:3000");
    origins.push("http://localhost:3001");
    origins.push("http://127.0.0.1:3000");
  }

  return origins;
}

/**
 * Validate that the request origin matches allowed origins (OWASP recommended)
 */
function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const allowedOrigins = getAllowedOrigins();

  // If no allowed origins configured, skip validation in development
  if (allowedOrigins.length === 0 && process.env.NODE_ENV === "development") {
    return true;
  }

  // Check Origin header first (most reliable)
  if (origin) {
    return allowedOrigins.some((allowed) => origin === allowed);
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;
      return allowedOrigins.some((allowed) => refererOrigin === allowed);
    } catch {
      return false;
    }
  }

  // No Origin or Referer header — likely a direct API call (curl, Postman).
  // For API-first architectures using Bearer tokens (not cookies), this is acceptable.
  // The authentication layer (getAuthenticatedUserId) handles authorization.
  // We allow these through since:
  // 1. CSRF attacks rely on the browser automatically sending cookies
  // 2. Bearer tokens are not automatically attached by browsers
  // 3. An attacker's malicious page cannot read the user's Bearer token
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return true;
  }

  // No origin, no referer, no bearer token — reject
  return false;
}

export function middleware(request: NextRequest): NextResponse | undefined {
  const { pathname } = request.nextUrl;

  // Only process API routes
  if (!pathname.startsWith("/api/")) {
    return undefined;
  }

  // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
  if (!PROTECTED_METHODS.has(request.method)) {
    return undefined;
  }

  // Skip CSRF for exempt paths
  if (isCsrfExemptPath(pathname)) {
    return undefined;
  }

  // Validate origin
  if (!validateOrigin(request)) {
    return NextResponse.json(
      {
        error: "Request rejected",
        code: "CSRF_ORIGIN_MISMATCH",
      },
      { status: 403 },
    );
  }

  return undefined;
}

/**
 * Matcher config — only run middleware on API routes
 */
export const config = {
  matcher: "/api/:path*",
};
