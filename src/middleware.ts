import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js Edge Middleware
 *
 * 1. Rate Limiting: In-memory fixed-window per IP with path-based tiers
 *    ⚠️  Note: This is a fixed-window algorithm (not true sliding window).
 *    A burst of up to 2× the limit is possible at window boundaries.
 *    The in-memory store is per-isolate in Edge Runtime — not shared across
 *    instances. For critical auth brute-force protection, add a distributed
 *    store (e.g., Upstash Redis) as a secondary check.
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
    pattern:
      /^\/api\/(ai|resume\/generate|resume\/enhance|resume\/upload-and-extract)\b/,
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
  "/api/health", // Has its own 30s result cache — no quota risk
  "/api/health/infra", // Same: internal infra health check
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
  // No matching tier — path is not rate-limited (should not happen for /api/* due to catch-all)
  const UNLIMITED = Number.MAX_SAFE_INTEGER;
  if (!tier) return { allowed: true, remaining: UNLIMITED, resetMs: 0 };

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
 * Check if a request path is exempt from CSRF validation.
 * Uses exact match only to prevent future endpoints from silently
 * inheriting CSRF exemption via prefix matching.
 */
function isCsrfExemptPath(pathname: string): boolean {
  return CSRF_EXEMPT_PATHS.includes(pathname);
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
  //
  // Security: We require a minimum token length to prevent trivial bypass
  // with "Bearer fake". Real Firebase ID tokens are 800+ chars (JWT format).
  const authHeader = request.headers.get("authorization");
  const MIN_BEARER_TOKEN_LENGTH = 20;
  if (
    authHeader?.startsWith("Bearer ") &&
    authHeader.length > "Bearer ".length + MIN_BEARER_TOKEN_LENGTH
  ) {
    return true;
  }

  // No origin, no referer, no valid bearer token — reject
  return false;
}

function createSecurityContext(
  request: NextRequest,
  requestId: string,
): {
  nonce: string;
  cspHeader: string;
  requestHeaders: Headers;
} {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob: https://www.google.com https://via.placeholder.com https://lh3.googleusercontent.com https://firebasestorage.googleapis.com https://ssl.gstatic.com https://accounts.google.com;
    font-src 'self' data:;
    connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.cloudfunctions.net https://firestore.googleapis.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com https://www.google-analytics.com https://*.posthog.com https://us.i.posthog.com;
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

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-nonce", nonce);

  return { nonce, cspHeader, requestHeaders };
}

function applySecurityHeaders(
  response: NextResponse,
  requestId: string,
  _nonce: string,
  cspHeader: string,
): NextResponse {
  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("x-request-id", requestId);
  // Security: Do NOT set x-nonce on the response — the nonce is already embedded
  // in the CSP header and forwarded to route handlers via request headers.
  // Exposing it in response headers would allow attackers who can read headers
  // to inject scripts matching the nonce.
  response.headers.delete("x-powered-by");
  return response;
}

export function middleware(request: NextRequest): NextResponse | undefined {
  const { pathname } = request.nextUrl;

  // ── Firebase Auth Handler Bypass ──
  // The /__/auth/* route is a Next.js rewrite proxy for the Firebase auth handler
  // (see next.config.ts rewrites). That page is Firebase-hosted HTML that loads
  // scripts/images from Google CDN origins not allowed by our strict CSP.
  // Applying our CSP to this proxy response breaks signInWithPopup.
  if (pathname.startsWith("/__/auth/")) {
    return NextResponse.next();
  }

  // ── Correlation ID ──
  // Propagate incoming x-request-id or generate a new one for tracing
  const requestId = request.headers.get("x-request-id") || crypto.randomUUID();
  const { nonce, cspHeader, requestHeaders } = createSecurityContext(
    request,
    requestId,
  );

  if (pathname.startsWith("/api/")) {
    // ── Rate Limiting (all methods, all API routes except exempt) ──
    if (!isRateLimitExempt(pathname)) {
      // Extract client IP with validation.
      // x-forwarded-for can be spoofed if the CDN/load balancer doesn't strip it.
      // We validate the format to reject obviously malicious values.
      const rawForwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      const rawRealIp = request.headers.get("x-real-ip");
      const isValidIpFormat = (ip: string | undefined | null): ip is string =>
        !!ip && /^[\d.:a-fA-F]{3,45}$/.test(ip) && ip.length <= 45;

      // Use validated IP, or generate a per-request unique key to avoid
      // all unknown-IP requests sharing a single rate-limit bucket.
      const ip = isValidIpFormat(rawForwardedFor)
        ? rawForwardedFor
        : isValidIpFormat(rawRealIp)
          ? rawRealIp
          : `anon-${crypto.randomUUID().slice(0, 8)}`;

      const rateResult = checkRateLimitMiddleware(ip, pathname);

      if (!rateResult.allowed) {
        const retryAfterSec = Math.ceil(rateResult.resetMs / 1000);
        return applySecurityHeaders(
          NextResponse.json(
            { error: "Too many requests", code: "RATE_LIMIT_EXCEEDED" },
            {
              status: 429,
              headers: {
                "Retry-After": String(retryAfterSec),
                "X-RateLimit-Remaining": "0",
                "x-request-id": requestId,
              },
            },
          ),
          requestId,
          nonce,
          cspHeader,
        );
      }
    }

    // ── CSRF Protection (state-changing methods only) ──

    // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
    if (PROTECTED_METHODS.has(request.method) && !isCsrfExemptPath(pathname)) {
      // Validate origin
      if (!validateOrigin(request)) {
        return applySecurityHeaders(
          NextResponse.json(
            {
              error: "Request rejected",
              code: "CSRF_ORIGIN_MISMATCH",
            },
            {
              status: 403,
              headers: { "x-request-id": requestId },
            },
          ),
          requestId,
          nonce,
          cspHeader,
        );
      }
    }
  }

  return applySecurityHeaders(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    requestId,
    nonce,
    cspHeader,
  );
}

/**
 * Matcher config — run middleware on application routes while skipping static assets
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
