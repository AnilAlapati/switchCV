/**
 * Request Logging Middleware
 *
 * Logs all API requests without exposing sensitive PII
 *
 * @module lib/middleware/request-logging
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "../logger";

interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  queryParams?: Record<string, string>;
  error?: string;
}

/**
 * Extract client IP address from request
 *
 * Checks multiple headers for forwarded IP addresses
 */
function getClientIp(request: NextRequest): string {
  // Check headers in order of reliability
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP in the chain (original client)
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback - this will be localhost in development
  return request.ip || "unknown";
}

/**
 * Extract user ID from request if authenticated
 *
 * Looks for user ID in multiple places without exposing auth tokens
 */
function getUserId(request: NextRequest): string | undefined {
  // Check for user ID in custom header (set by auth middleware)
  const userId = request.headers.get("x-user-id");
  return userId || undefined;
}

/**
 * Extract and sanitize query parameters
 *
 * Removes sensitive query params like API keys, tokens, passwords
 */
function getSafeQueryParams(request: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  const url = new URL(request.url);

  const sensitiveKeys = [
    "password",
    "token",
    "key",
    "secret",
    "apikey",
    "api_key",
    "auth",
    "authorization",
    "csrf",
    "session",
  ];

  for (const [key, value] of url.searchParams) {
    if (!sensitiveKeys.includes(key.toLowerCase())) {
      params[key] = value;
    }
  }

  return Object.keys(params).length > 0 ? params : undefined;
}

/**
 * Extract and sanitize request body
 *
 * Removes sensitive fields before logging
 */
function getSafeBody(body: any): any {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const sensitiveFields = [
    "password",
    "token",
    "apiKey",
    "api_key",
    "secret",
    "auth",
    "csrf",
  ];

  const safe = { ...body };
  for (const field of sensitiveFields) {
    if (field in safe) {
      delete safe[field];
    }
  }

  return Object.keys(safe).length > 0 ? safe : undefined;
}

/**
 * Create request logging middleware
 *
 * @returns Middleware function to log requests and responses
 *
 * @example
 * ```typescript
 * // In middleware.ts or api route handler
 * import { withRequestLogging } from "@/lib/middleware/request-logging";
 *
 * export async function GET(request: NextRequest) {
 *   return withRequestLogging(request, async () => {
 *     // Handle request
 *     return NextResponse.json({ data: "..." });
 *   });
 * }
 * ```
 */
export async function withRequestLogging(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = Date.now();
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;
  const ipAddress = getClientIp(request);
  const userId = getUserId(request);
  const userAgent = request.headers.get("user-agent") || undefined;
  const queryParams = getSafeQueryParams(request);

  let response: NextResponse;
  let error: string | undefined;

  try {
    // Call the handler
    response = await handler();
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);

    // Log error
    logger.error("Request handler error", {
      method,
      path,
      userId,
      ipAddress,
      error,
      stack: err instanceof Error ? err.stack : undefined,
    });

    // Return 500 response
    response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }

  // Calculate duration
  const duration = Date.now() - startTime;

  // Create log entry
  const log: RequestLog = {
    timestamp: new Date().toISOString(),
    method,
    path,
    statusCode: response.status,
    duration,
    userId,
    userAgent,
    ipAddress,
    queryParams,
    error,
  };

  // Log based on status code
  if (response.status >= 500) {
    logger.error("Request error", log);
  } else if (response.status >= 400) {
    logger.warn("Request client error", log);
  } else {
    logger.info("Request success", log);
  }

  return response;
}

/**
 * Middleware wrapper for Next.js middleware.ts
 *
 * Logs all requests passing through middleware
 *
 * @example
 * ```typescript
 * // In middleware.ts
 * import { requestLoggingMiddleware } from "@/lib/middleware/request-logging";
 * import { NextRequest, NextResponse } from "next/server";
 *
 * export function middleware(request: NextRequest) {
 *   return requestLoggingMiddleware(request);
 * }
 * ```
 */
export function requestLoggingMiddleware(request: NextRequest) {
  const startTime = Date.now();
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;
  const ipAddress = getClientIp(request);
  const userId = getUserId(request);
  const userAgent = request.headers.get("user-agent") || undefined;
  const queryParams = getSafeQueryParams(request);

  // Log request start
  logger.debug("Request received", {
    method,
    path,
    userId,
    ipAddress,
    queryParams,
  });

  // Create response
  const response = NextResponse.next();

  // Add custom headers for downstream logging
  response.headers.set("x-request-started", new Date().toISOString());
  response.headers.set("x-request-path", path);
  response.headers.set("x-request-method", method);

  return response;
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Create detailed request/response logging middleware
 *
 * Includes request size, response size, and timing information
 */
export function createDetailedRequestLogger() {
  return async function detailedLogger(
    request: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const startTime = Date.now();
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;
    const ipAddress = getClientIp(request);
    const userId = getUserId(request);

    // Calculate request size
    let requestSize = 0;
    if (request.body) {
      const bodyClone = request.body?.getReader();
      if (bodyClone) {
        let size = 0;
        let chunk;
        while (!chunk?.done) {
          chunk = await bodyClone.read();
          if (chunk.value) {
            size += chunk.value.length;
          }
        }
        requestSize = size;
      }
    }

    let response: NextResponse;
    let error: string | undefined;

    try {
      response = await handler();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      response = NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    // Calculate duration
    const duration = Date.now() - startTime;

    // Get response size from content-length header
    const responseSize = parseInt(
      response.headers.get("content-length") || "0",
      10
    );

    // Create detailed log
    logger.debug("Detailed request log", {
      method,
      path,
      statusCode: response.status,
      userId,
      ipAddress,
      requestSize: formatBytes(requestSize),
      responseSize: formatBytes(responseSize),
      duration: `${duration}ms`,
      error,
    });

    return response;
  };
}

/**
 * Log slow requests (above threshold)
 *
 * Useful for performance monitoring
 */
export async function withSlowRequestLogging(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  thresholdMs: number = 1000
): Promise<NextResponse> {
  const startTime = Date.now();
  const method = request.method;
  const path = new URL(request.url).pathname;
  const userId = getUserId(request);
  const ipAddress = getClientIp(request);

  const response = await handler();
  const duration = Date.now() - startTime;

  if (duration > thresholdMs) {
    logger.warn("Slow request detected", {
      method,
      path,
      userId,
      ipAddress,
      duration: `${duration}ms`,
      threshold: `${thresholdMs}ms`,
      statusCode: response.status,
    });
  }

  return response;
}
