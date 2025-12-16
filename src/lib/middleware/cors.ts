/**
 * CORS Middleware
 *
 * Handles Cross-Origin Resource Sharing (CORS) headers for API routes.
 * Explicitly sets CORS policies to prevent misconfiguration.
 *
 * @module lib/middleware/cors
 * @example
 * ```typescript
 * import { corsHeaders, withCORS } from '@/lib/middleware/cors';
 *
 * export async function POST(request: NextRequest) {
 *   // Apply CORS headers to response
 *   const response = NextResponse.json({ success: true });
 *   return withCORS(response, request);
 * }
 * ```
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Allowed origins for CORS requests
 * Includes development and production domains
 */
const ALLOWED_ORIGINS =
  process.env.NODE_ENV === "production"
    ? [process.env.NEXT_PUBLIC_APP_URL || "https://switchcv.app"].filter(
        Boolean
      )
    : [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
      ];

/**
 * HTTP methods that require CORS preflight
 */
const PREFLIGHT_METHODS = ["POST", "PUT", "DELETE", "PATCH"];

/**
 * Standard CORS headers
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400", // 24 hours
  "Access-Control-Allow-Credentials": "true",
};

/**
 * Check if origin is allowed
 * @param origin - Origin to check
 * @returns {boolean} True if origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Add CORS headers to response
 * @param response - Next.js response
 * @param request - Next.js request (for origin check)
 * @returns {NextResponse} Response with CORS headers
 */
export function withCORS(
  response: NextResponse,
  request: NextRequest
): NextResponse {
  const origin = request.headers.get("origin");

  if (isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin!);
  }

  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Handle CORS preflight requests
 * @param request - Next.js request
 * @returns {NextResponse} Preflight response or null if not preflight
 */
export function handleCORSPreflight(request: NextRequest): NextResponse | null {
  if (request.method !== "OPTIONS") {
    return null;
  }

  const origin = request.headers.get("origin");
  const response = new NextResponse(null, { status: 204 });

  if (isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin!);
  }

  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Middleware factory for applying CORS to API routes
 * @example
 * ```typescript
 * export const middleware = corsMiddleware();
 *
 * export const config = {
 *   matcher: '/api/:path*',
 * };
 * ```
 */
export function corsMiddleware() {
  return (request: NextRequest) => {
    const preflight = handleCORSPreflight(request);
    if (preflight) {
      return preflight;
    }
    // Continue to next middleware/handler
    return null;
  };
}

/**
 * Verify request origin is allowed
 * @param request - Next.js request
 * @returns {boolean} True if origin is allowed or not present (same-origin)
 */
export function verifyOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  // If no origin header, it's a same-origin request (allowed)
  if (!origin) {
    return true;
  }

  return isOriginAllowed(origin);
}
