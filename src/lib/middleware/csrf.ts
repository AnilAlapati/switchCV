/**
 * CSRF Protection Middleware
 *
 * Implements Cross-Site Request Forgery (CSRF) protection for state-changing
 * operations (POST, PUT, DELETE, PATCH). Uses double-submit cookie pattern
 * with token validation.
 *
 * @module lib/middleware/csrf
 * @example
 * ```typescript
 * import { validateCsrfToken, getCsrfToken } from '@/lib/middleware/csrf';
 *
 * // In a form or fetch request, include the token:
 * const token = getCsrfToken();
 *
 * // In API route, validate before processing:
 * export async function POST(request: NextRequest) {
 *   const { valid, error } = await validateCsrfToken(request);
 *   if (!valid) return error;
 *   // Process request
 * }
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { logger } from "../logger";

/**
 * Session storage for CSRF tokens (in-memory for development)
 * In production, use Redis or similar for distributed systems
 */
const tokenStore = new Map<
  string,
  { token: string; createdAt: number; expiresAt: number }
>();

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * CSRF token configuration
 */
const CSRF_CONFIG = {
  TOKEN_LENGTH: 32,
  COOKIE_NAME: "csrfToken",
  HEADER_NAME: "X-CSRF-Token",
  BODY_FIELD_NAME: "csrfToken",
  EXPIRY_MS: 24 * 60 * 60 * 1000, // 24 hours
  CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // 1 hour
} as const;

/**
 * Methods that require CSRF protection
 */
const PROTECTED_METHODS = ["POST", "PUT", "DELETE", "PATCH"];

/**
 * Generate a cryptographically secure CSRF token
 * @returns {string} CSRF token (64 character hex string)
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(CSRF_CONFIG.TOKEN_LENGTH).toString("hex");
}

/**
 * Create a CSRF token and store it
 * @param sessionId - Session identifier (user ID or session token)
 * @returns {string} CSRF token
 */
export function createCsrfToken(sessionId: string): string {
  const token = generateCsrfToken();
  const now = Date.now();

  tokenStore.set(sessionId, {
    token,
    createdAt: now,
    expiresAt: now + CSRF_CONFIG.EXPIRY_MS,
  });

  return token;
}

/**
 * Verify a CSRF token
 * @param sessionId - Session identifier
 * @param token - Token to verify
 * @returns {boolean} True if token is valid
 */
export function verifyCsrfToken(sessionId: string, token: string): boolean {
  const stored = tokenStore.get(sessionId);

  if (!stored) {
    return false;
  }

  // Check expiration
  if (Date.now() > stored.expiresAt) {
    tokenStore.delete(sessionId);
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  const storedBuffer = Buffer.from(stored.token);
  const tokenBuffer = Buffer.from(token);

  if (storedBuffer.length !== tokenBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, tokenBuffer);
}

/**
 * Get session ID from request (user ID or IP address)
 * @param request - Next.js request
 * @returns {string} Session identifier
 */
function getSessionId(request: NextRequest): string {
  // Prefer authenticated user ID
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split("Bearer ")[1];
  }

  // Fall back to IP address for unauthenticated requests
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Extract CSRF token from request
 * Checks: header > body > cookie
 * @param request - Next.js request
 * @returns {Promise<string | null>} Token if found
 */
async function extractCsrfToken(request: NextRequest): Promise<string | null> {
  // 1. Check header (X-CSRF-Token)
  const headerToken = request.headers.get(CSRF_CONFIG.HEADER_NAME);
  if (headerToken) {
    return headerToken;
  }

  // 2. Check request body (for form submissions)
  try {
    if (request.method !== "GET" && request.method !== "HEAD") {
      const contentType = request.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const body = await request.clone().json();
        if (body && body[CSRF_CONFIG.BODY_FIELD_NAME]) {
          return body[CSRF_CONFIG.BODY_FIELD_NAME];
        }
      }
    }
  } catch {
    // Body parsing failed, continue to cookie check
  }

  // 3. Check cookie (for HTML forms)
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(
      new RegExp(`${CSRF_CONFIG.COOKIE_NAME}=([^;]+)`),
    );
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

/**
 * Validate CSRF token from request
 * @param request - Next.js request
 * @returns {Promise<{valid: boolean; error?: NextResponse}>} Validation result
 */
export async function validateCsrfToken(
  request: NextRequest,
): Promise<{ valid: boolean; error?: NextResponse }> {
  // Skip CSRF validation for safe methods
  if (!PROTECTED_METHODS.includes(request.method)) {
    return { valid: true };
  }

  const sessionId = getSessionId(request);
  const token = await extractCsrfToken(request);

  if (!token) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          error: "CSRF token missing",
          code: "CSRF_TOKEN_MISSING",
        },
        { status: 403 },
      ),
    };
  }

  if (!verifyCsrfToken(sessionId, token)) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          error: "CSRF token invalid or expired",
          code: "CSRF_TOKEN_INVALID",
        },
        { status: 403 },
      ),
    };
  }

  // Token is valid, regenerate for next request
  createCsrfToken(sessionId);

  return { valid: true };
}

/**
 * CSRF middleware for API routes
 * @example
 * ```typescript
 * export const middleware = csrfMiddleware();
 *
 * export const config = {
 *   matcher: '/api/:path*',
 * };
 * ```
 */
export function csrfMiddleware() {
  return async (request: NextRequest) => {
    // Skip for safe methods
    if (!PROTECTED_METHODS.includes(request.method)) {
      return null;
    }

    const { valid, error } = await validateCsrfToken(request);
    if (!valid) {
      return error;
    }

    return null;
  };
}

/**
 * Add CSRF token to response cookie
 * @param response - Next.js response
 * @param sessionId - Session identifier
 * @returns {NextResponse} Response with CSRF token cookie
 */
export function withCsrfToken(
  response: NextResponse,
  sessionId: string,
): NextResponse {
  const token = createCsrfToken(sessionId);

  response.cookies.set({
    name: CSRF_CONFIG.COOKIE_NAME,
    value: encodeURIComponent(token),
    httpOnly: false, // Needs to be readable by client JS
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: CSRF_CONFIG.EXPIRY_MS / 1000, // Convert to seconds
    path: "/",
  });

  return response;
}

/**
 * Periodic cleanup of expired tokens
 * Call this once during application startup
 */
export function startCsrfTokenCleanup(): void {
  if (typeof window !== "undefined") {
    return; // Don't run in browser
  }

  if (cleanupInterval) {
    return;
  }

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, data] of tokenStore.entries()) {
      if (now > data.expiresAt) {
        tokenStore.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.log(`[CSRF] Cleaned up ${cleaned} expired tokens`);
    }
  }, CSRF_CONFIG.CLEANUP_INTERVAL_MS);

  // Don't prevent process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

/**
 * Stop CSRF token cleanup (for testing or HMR)
 */
export function stopCsrfTokenCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Get CSRF token for client-side use
 * This is exported for use in browser components via API
 * @example
 * ```typescript
 * // In API route (GET /api/csrf-token)
 * export async function GET(request: NextRequest) {
 *   const sessionId = getSessionId(request);
 *   const token = createCsrfToken(sessionId);
 *   return NextResponse.json({ token });
 * }
 * ```
 */
export function getCsrfTokenForSession(sessionId: string): string {
  return createCsrfToken(sessionId);
}
