import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js Edge Middleware
 *
 * 1. Rate Limiting: In-memory sliding window per IP with path-based tiers
 * 2. CSRF Validation: Origin/Referer check for state-changing requests
 * 3. CSP Headers: Content Security Policy with nonces
 */

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Path-based rate limit tiers.
 * Matched in order — first match wins.
 */
const RATE_LIMIT_TIERS: Array<{
  pattern: RegExp;
  limit: number;
  windowMs: number;
}> = [
  // Auth routes — strict to prevent brute force
  { pattern: /^\/api\/auth\//, limit: 5, windowMs: 60_000 },
  // AI generation routes — expensive, tight limits
  {
    pattern: /^\/api\/(ai|resume\/generate|resume\/enhance)\b/,
    limit: 10,
    windowMs: 60_000,
  },
  // Search routes
  {
    pattern: /^\/api\/(search|recruiter\/search)/,
    limit: 20,
    windowMs: 60_000,
  },
  // Admin routes
  { pattern: /^\/api\/admin\//, limit: 30, windowMs: 60_000 },
  // Default for all other API routes
  { pattern: /^\/api\//, limit: 100, windowMs: 60_000 },
];

/** Paths exempt from rate limiting */
const RATE_LIMIT_EXEMPT = [
  "/api/health",
  "/api/health/infra",
  "/api/system-config",
  "/api/docs",
];

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

/** In-memory store for rate limiting (per-region in edge, acceptable for abuse prevention) */
const rateLimitStore = new Map<string, RateLimitEntry>();

/** Cleanup stale entries every 60 seconds to prevent memory leaks */
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function cleanupRateLimitStore(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of rateLimitStore) {
    // Remove entries whose window has expired with a generous buffer
    if (now - entry.windowStart > 120_000) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Check rate limit for a given IP + path tier.
 * Returns remaining requests or -1 if limit exceeded.
 */
function checkRateLimitMiddleware(
  ip: string,
  pathname: string,
): { allowed: boolean; remaining: number; resetMs: number } {
  cleanupRateLimitStore();

  // Find matching tier
  const tier = RATE_LIMIT_TIERS.find((t) => t.pattern.test(pathname));
  if (!tier) return { allowed: true, remaining: 999, resetMs: 0 };

  const key = `${ip}:${tier.pattern.source}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart >= tier.windowMs) {
    // New window
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: tier.limit - 1,
      resetMs: tier.windowMs,
    };
  }

  entry.count++;
  const remaining = tier.limit - entry.count;
  const resetMs = tier.windowMs - (now - entry.windowStart);

  if (remaining < 0) {
    return { allowed: false, remaining: 0, resetMs };
  }

  return { allowed: true, remaining, resetMs };
}

function isRateLimitExempt(pathname: string): boolean {
  return RATE_LIMIT_EXEMPT.some(
    (exempt) => pathname === exempt || pathname.startsWith(`${exempt}/`),
  );
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================

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

  // ── Correlation ID ──
  // Propagate incoming x-request-id or generate a new one for tracing
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();

  // ── Rate Limiting (all methods, all API routes except exempt) ──
  if (!isRateLimitExempt(pathname)) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateResult = checkRateLimitMiddleware(ip, pathname);

    if (!rateResult.allowed) {
      const retryAfterSec = Math.ceil(rateResult.resetMs / 1000);
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
            "X-RateLimit-Remaining": "0",
            "x-request-id": requestId,
          },
        },
      );
    }
  }

  // ── CSRF Protection (state-changing methods only) ──

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
      {
        status: 403,
        headers: { "x-request-id": requestId },
      },
    );
  }

  // Generate CSP Nonce
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // Define CSP directives
  const isDev = process.env.NODE_ENV === "development";

  // We need 'unsafe-eval' in dev for hot reloading
  // 'unsafe-inline' is replaced by 'nonce-...' for scripts
  // We still need 'unsafe-inline' for styles due to Next.js inline styles and some third-party libs
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""} https: http:;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https: blob:;
    font-src 'self' data:;
    connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://firestore.googleapis.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google-analytics.com https://*.posthog.com https://us.i.posthog.com;
    frame-src 'self' https://*.firebaseapp.com https://*.googleapis.com;
    worker-src 'self' blob:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  // Create response
  const response = NextResponse.next();

  // Set CSP header
  response.headers.set("Content-Security-Policy", cspHeader);

  // Set correlation ID on response and request for downstream handlers/logging
  response.headers.set("x-request-id", requestId);
  request.headers.set("x-request-id", requestId);

  // Set nonce in request headers so server components can access it
  response.headers.set("x-nonce", nonce);
  // Also set it on the request object for downstream middleware/handlers
  request.headers.set("x-nonce", nonce);

  return response;
}

/**
 * Matcher config — only run middleware on API routes
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
