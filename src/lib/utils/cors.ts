/**
 * CORS (Cross-Origin Resource Sharing) Utilities
 *
 * Provides centralized CORS validation and header management for API routes.
 * Implements strict origin validation based on environment configuration.
 *
 * @module lib/utils/cors
 *
 * @example
 * ```typescript
 * // In an API route handler
 * import { validateCorsOrigin, createCorsHeaders } from "@/lib/utils/cors";
 *
 * export async function POST(request: NextRequest) {
 *   const corsValidation = validateCorsOrigin(request);
 *   if (!corsValidation.allowed) {
 *     return new NextResponse("Forbidden", { status: 403 });
 *   }
 *
 *   // Process request...
 *   return NextResponse.json(data, {
 *     headers: createCorsHeaders(request),
 *   });
 * }
 *
 * // Handle OPTIONS preflight
 * export async function OPTIONS(request: NextRequest) {
 *   return handleCorsPreflightRequest(request);
 * }
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Allowed origins based on environment
 */
const getAllowedOrigins = (): string[] => {
  const env = process.env.NODE_ENV || "development";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL || "";

  if (env === "development") {
    return [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001", // Alternative dev port
      baseUrl,
    ].filter(Boolean);
  }

  // Production - strict origin validation
  const productionOrigins = [
    "https://switchcv.com",
    "https://www.switchcv.com",
    "https://switchcv-dev.web.app",
    "https://switchcv-dev.firebaseapp.com",
    "https://switchcv-e5136.web.app",
    "https://switchcv-e5136.firebaseapp.com",
    baseUrl,
  ];

  // Add Vercel preview URLs if present
  if (vercelUrl) {
    productionOrigins.push(`https://${vercelUrl}`);
  }

  // Support for Vercel preview deployments
  const vercelBranchUrl = process.env.VERCEL_BRANCH_URL;
  if (vercelBranchUrl) {
    productionOrigins.push(`https://${vercelBranchUrl}`);
  }

  return productionOrigins.filter(Boolean);
};

/**
 * CORS validation result
 */
export interface CorsValidationResult {
  /** Whether the origin is allowed */
  allowed: boolean;
  /** The validated origin (or null if not allowed) */
  origin: string | null;
  /** Reason for denial (if not allowed) */
  reason?: string;
}

/**
 * Validates the request origin against allowed origins
 *
 * @param request - The incoming Next.js request
 * @returns Validation result with allowed status and origin
 */
export function validateCorsOrigin(request: NextRequest): CorsValidationResult {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // No origin header - likely same-origin request or direct API call
  if (!origin) {
    // Check if it's a same-origin request via referer
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        const requestUrl = new URL(request.url);

        // Same origin via referer
        if (refererUrl.origin === requestUrl.origin) {
          return {
            allowed: true,
            origin: requestUrl.origin,
          };
        }
      } catch {
        // Invalid referer URL
        logger.warn({ referer }, "Invalid referer URL in CORS check");
      }
    }

    // Allow requests without origin header (same-origin or server-to-server)
    // This is common for server-side API calls and same-origin requests
    return {
      allowed: true,
      origin: null,
    };
  }

  const allowedOrigins = getAllowedOrigins();

  // Check if origin is in allowed list
  if (allowedOrigins.includes(origin)) {
    return {
      allowed: true,
      origin,
    };
  }

  // Check for wildcard localhost patterns in development
  if (process.env.NODE_ENV === "development") {
    const localhostPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;
    if (localhostPattern.test(origin)) {
      return {
        allowed: true,
        origin,
      };
    }
  }

  // Origin not allowed
  logger.warn(
    {
      origin,
      allowedOrigins,
      method: request.method,
      path: request.nextUrl.pathname,
    },
    "CORS: Origin not allowed"
  );

  return {
    allowed: false,
    origin: null,
    reason: "Origin not allowed",
  };
}

/**
 * Creates standard CORS headers for the response
 *
 * @param request - The incoming request (to extract origin)
 * @param options - Optional configuration for CORS headers
 * @returns Headers object with CORS headers
 */
export function createCorsHeaders(
  request: NextRequest,
  options?: {
    allowCredentials?: boolean;
    maxAge?: number;
    allowedMethods?: string[];
    allowedHeaders?: string[];
  }
): HeadersInit {
  const corsValidation = validateCorsOrigin(request);

  const headers: HeadersInit = {};

  if (corsValidation.allowed && corsValidation.origin) {
    headers["Access-Control-Allow-Origin"] = corsValidation.origin;
  }

  // Default CORS configuration
  const {
    allowCredentials = true,
    maxAge = 86400, // 24 hours
    allowedMethods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders = [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
  } = options || {};

  if (allowCredentials) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  headers["Access-Control-Allow-Methods"] = allowedMethods.join(", ");
  headers["Access-Control-Allow-Headers"] = allowedHeaders.join(", ");
  headers["Access-Control-Max-Age"] = maxAge.toString();

  return headers;
}

/**
 * Handles CORS preflight OPTIONS requests
 *
 * @param request - The incoming OPTIONS request
 * @returns NextResponse with appropriate CORS headers
 */
export function handleCorsPreflightRequest(request: NextRequest): NextResponse {
  const corsValidation = validateCorsOrigin(request);

  if (!corsValidation.allowed) {
    return new NextResponse(null, {
      status: 403,
      statusText: "Forbidden - Origin not allowed",
    });
  }

  return new NextResponse(null, {
    status: 204,
    headers: createCorsHeaders(request),
  });
}

/**
 * Creates a CORS-enabled error response
 *
 * @param request - The incoming request
 * @param message - Error message
 * @param status - HTTP status code
 * @returns NextResponse with error and CORS headers
 */
export function createCorsErrorResponse(
  request: NextRequest,
  message: string,
  status: number = 403
): NextResponse {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: createCorsHeaders(request),
    }
  );
}

/**
 * Middleware wrapper to add CORS validation to API routes
 *
 * @param handler - The API route handler function
 * @returns Wrapped handler with CORS validation
 */
export function withCors(
  handler: (request: NextRequest) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    // Validate CORS origin
    const corsValidation = validateCorsOrigin(request);

    if (!corsValidation.allowed) {
      logger.warn(
        {
          origin: request.headers.get("origin"),
          path: request.nextUrl.pathname,
          method: request.method,
          reason: corsValidation.reason,
        },
        "CORS validation failed"
      );

      return createCorsErrorResponse(request, "Origin not allowed", 403);
    }

    // Execute the handler
    const response = await handler(request);

    // Add CORS headers to response
    const corsHeaders = createCorsHeaders(request);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (typeof value === "string") {
        response.headers.set(key, value);
      }
    });

    return response;
  };
}
