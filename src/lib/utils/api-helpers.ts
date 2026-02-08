/**
 * API Helpers Module
 *
 * Provides standardized utilities for Next.js API routes including:
 * - Authentication and authorization
 * - Error handling with consistent response format
 * - Resume document fetching with fallback support
 * - Admin role verification
 *
 * @module lib/utils/api-helpers
 *
 * @example
 * ```typescript
 * // In an API route handler
 * import { getAuthenticatedUserId, handleApiError } from "@/lib/utils/api-helpers";
 *
 * export async function POST(request: NextRequest) {
 *   const { userId, error } = await getAuthenticatedUserId(request);
 *   if (error) return error;
 *
 *   try {
 *     // ... your logic
 *   } catch (err) {
 *     return handleApiError(err, "Failed to process request");
 *   }
 * }
 * ```
 */

import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import type { ResumeProfile, Visibility } from "@/types";
import { checkRateLimit, RateLimitResult } from "@/lib/utils/rateLimit";
import { validateCorsOrigin, createCorsHeaders } from "@/lib/utils/cors";

// Re-export secure error handlers from dedicated module
export {
  handleSecureApiError,
  getSecureAuthErrorMessage,
  getSecureFirestoreErrorMessage,
} from "./api-error-helpers";

/**
 * Resume document data as stored in Firestore.
 * Extends ResumeProfile with metadata fields added by the system.
 */
export interface ResumeDocumentData extends Partial<ResumeProfile> {
  /** Owner user ID - required for ownership verification */
  userId: string;
  /** Optional numeric ID for short URLs */
  numericId?: number;
  /** Firestore timestamps */
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
  /** Visibility settings */
  isPublic?: boolean;
  visibility?: Visibility;
}
import { logger, sanitizeForLogging } from "@/lib/logger";

/**alidates CORS origin for the request.
 * Returns an error response if the origin is not allowed.
 *
 * @param request - The incoming Next.js request
 * @returns Error NextResponse if origin not allowed, undefined if allowed
 *
 * @example
 * ```typescript
 * const corsError = validateCorsRequest(request);
 * if (corsError) return corsError; // Returns 403 response
 * ```
 */
export function validateCorsRequest(
  request: NextRequest
): NextResponse | undefined {
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

    return NextResponse.json(
      { error: "Origin not allowed" },
      {
        status: 403,
        headers: createCorsHeaders(request),
      }
    );
  }

  return undefined;
}

/**
 * Verifies the authentication token from the request headers.
 * Returns the user ID if successful, or an error response if not.
 *
 * @param request - The incoming Next.js request
 * @returns Object with userId on success, or error NextResponse on failure
 *
 * @example
 * ```typescript
 * const { userId, error } = await getAuthenticatedUserId(request);
 * if (error) return error; // Returns 401 response
 * logger.info(`Authenticated user: ${userId}`);
 * ```
 */
export async function getAuthenticatedUserId(
  request: NextRequest
): Promise<{ userId?: string; error?: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        {
          status: 401,
          headers: createCorsHeaders(request),
        }
      ),
    };
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return { userId: decodedToken.uid };
  } catch (authError) {
    logger.error({ err: authError }, "Auth verification failed");
    return {
      error: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
    };
  }
}

/**
 * Attempts to verify authentication without treating missing credentials as an error.
 * Returns the user ID when available, or null when the caller is anonymous.
 */
export async function maybeGetAuthenticatedUserId(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (authError) {
    logger.warn({ err: authError }, "Optional auth verification failed");
    return null;
  }
}

/**
 * Fetches a resume document by ID, checking both 'resumes' and 'resumeProfiles' collections.
 * Uses parallel queries for better performance - eliminates sequential fallback pattern.
 * Returns the document reference, snapshot, and data if found, or null if not.
 */
export async function fetchResumeDocument(id: string) {
  // Fetch from both collections in parallel to avoid sequential N+1-like pattern
  const resumesRef = adminDb.collection("resumes").doc(id);
  const legacyRef = adminDb.collection("resumeProfiles").doc(id);

  const [resumesSnap, legacySnap] = await Promise.all([
    resumesRef.get(),
    legacyRef.get(),
  ]);

  // Prefer 'resumes' collection (new system), fallback to 'resumeProfiles' (legacy)
  if (resumesSnap.exists) {
    return {
      docRef: resumesRef,
      docSnap: resumesSnap,
      data: resumesSnap.data(),
    };
  }

  if (legacySnap.exists) {
    return { docRef: legacyRef, docSnap: legacySnap, data: legacySnap.data() };
  }

  return null;
}

/**
 * Standardized API error handler.
 * Logs the error and returns a JSON response with the appropriate status code.
 * Automatically includes CORS headers in the response.
 */
export function handleApiError(
  error: unknown,
  message = "Internal server error",
  status = 500,
  request?: NextRequest
) {
  if (status >= 500) {
    logger.error({ err: error, status }, `API Error: ${message}`);
  } else {
    logger.warn({ err: error, status }, `API Warning: ${message}`);
  }

  // Only include raw error details in development to prevent information leakage
  const includeDetails = process.env.NODE_ENV === "development";

  const headers = request ? createCorsHeaders(request) : {};

  return NextResponse.json(
    {
      error: message,
      ...(includeDetails && {
        details:
          error instanceof Error
            ? error.message
            : error
              ? String(error)
              : undefined,
      }),
    },
    { status, headers }
  );
}

/**
 * Verifies that the authenticated user owns the resume.
 * Returns the resume data if successful, or an error response if not.
 */
export async function verifyResumeOwnership(
  request: NextRequest,
  resumeId: string
): Promise<
  | {
    success: true;
    userId: string;
    resumeData: ResumeDocumentData;
    docRef: FirebaseFirestore.DocumentReference;
  }
  | { success: false; error: NextResponse }
> {
  // 1. Authenticate
  const { userId, error: authError } = await getAuthenticatedUserId(request);
  if (authError) {
    return { success: false, error: authError };
  }

  // 2. Fetch Resume
  const resumeDoc = await fetchResumeDocument(resumeId);
  if (!resumeDoc) {
    return {
      success: false,
      error: NextResponse.json(
        { error: "Resume not found" },
        {
          status: 404,
          headers: createCorsHeaders(request),
        }
      ),
    };
  }

  const { docRef, data: resumeData } = resumeDoc;

  // 3. Verify Ownership
  if (resumeData?.userId !== userId) {
    // Optional: Check for admin role here if needed, but for now strict ownership
    return {
      success: false,
      error: NextResponse.json(
        { error: "Permission denied" },
        {
          status: 403,
          headers: createCorsHeaders(request),
        }
      ),
    };
  }

  // Cast to ResumeDocumentData - we've verified userId exists via ownership check
  return {
    success: true,
    userId: userId!,
    resumeData: resumeData as ResumeDocumentData,
    docRef,
  };
}

/**
 * Safely parse JSON body from a request with size limit enforcement.
 * Returns the parsed body or throws a SyntaxError/Error.
 *
 * @param request - The incoming Next.js request
 * @param limitBytes - Maximum allowed body size in bytes (default: 1MB)
 * @returns Parsed JSON body
 * @throws SyntaxError if the body is not valid JSON
 * @throws Error if body size exceeds limit
 *
 * @example
 * ```typescript
 * try {
 *   const body = await safeParseBody(request);
 * } catch (error) {
 *   return handleApiError(error, "Invalid JSON payload", 400);
 * }
 * ```
 */
export async function safeParseBody<T = unknown>(
  request: NextRequest,
  limitBytes: number = 1024 * 1024 // 1MB default
): Promise<T> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > limitBytes) {
    throw new Error(`Request body too large. Limit is ${limitBytes} bytes.`);
  }

  try {
    return await request.json();
  } catch (error) {
    throw error instanceof SyntaxError
      ? error
      : new SyntaxError("Invalid JSON payload");
  }
}

/**
 * Apply rate limiting to a request.
 * Returns a 429 response if the rate limit is exceeded.
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param options - Rate limit configuration
 * @returns Object with allowed status and optional error response
 *
 * @example
 * ```typescript
 * const { allowed, response, result } = await applyRateLimit(userId || request.ip);
 * if (!allowed) return response;
 * // Proceed with request handling
 * attachRateLimitHeaders(myResponse, result);
 * ```
 */
export async function applyRateLimit(
  identifier: string,
  options?: { limit?: number; windowMs?: number }
): Promise<
  | { allowed: true; result: RateLimitResult }
  | { allowed: false; response: NextResponse }
> {
  const result = await checkRateLimit(identifier, options);

  if (!result.allowed) {
    const response = NextResponse.json(
      {
        error: "Too many requests",
        retryAfter: Math.ceil(result.resetIn / 1000),
      },
      { status: 429 }
    );
    attachRateLimitHeaders(response, result);
    return { allowed: false, response };
  }

  return { allowed: true, result };
}

/**
 * Attach rate limit headers to a response.
 * Adds standard X-RateLimit-* headers for client visibility.
 *
 * @param response - The NextResponse to modify
 * @param result - Rate limit result from checkRateLimit
 */
export function attachRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): void {
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set(
    "X-RateLimit-Reset",
    Math.ceil(Date.now() / 1000 + result.resetIn / 1000).toString()
  );
}

/**
 * Get client IP address from request.
 * Checks X-Forwarded-For header first (for proxied requests), then falls back.
 *
 * @param request - The incoming Next.js request
 * @returns IP address string or "unknown"
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}


