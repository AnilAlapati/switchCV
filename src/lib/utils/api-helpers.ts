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
import type { ResumeProfile } from "@/types";
import { checkRateLimit, RateLimitResult } from "@/lib/utils/rateLimit";

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
}
import { logger } from "@/lib/logger";

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
 * console.log(`Authenticated user: ${userId}`);
 * ```
 */
export async function getAuthenticatedUserId(
  request: NextRequest
): Promise<{ userId?: string; error?: NextResponse }> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
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
 * Returns the document reference, snapshot, and data if found, or null if not.
 */
export async function fetchResumeDocument(id: string) {
  // 1. Try to fetch from 'resumes' collection (new system)
  let docRef = adminDb.collection("resumes").doc(id);
  let docSnap = await docRef.get();

  // 2. Fallback to 'resumeProfiles' (legacy)
  if (!docSnap.exists) {
    docRef = adminDb.collection("resumeProfiles").doc(id);
    docSnap = await docRef.get();
  }

  if (!docSnap.exists) {
    return null;
  }

  return { docRef, docSnap, data: docSnap.data() };
}

/**
 * Standardized API error handler.
 * Logs the error and returns a JSON response with the appropriate status code.
 */
export function handleApiError(
  error: unknown,
  message = "Internal server error",
  status = 500
) {
  if (status >= 500) {
    logger.error({ err: error, status }, `API Error: ${message}`);
  } else {
    logger.warn({ err: error, status }, `API Warning: ${message}`);
  }

  return NextResponse.json(
    {
      error: message,
      details:
        error instanceof Error
          ? error.message
          : error
          ? String(error)
          : undefined,
    },
    { status }
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
      error: NextResponse.json({ error: "Resume not found" }, { status: 404 }),
    };
  }

  const { docRef, data: resumeData } = resumeDoc;

  // 3. Verify Ownership
  if (resumeData?.userId !== userId) {
    // Optional: Check for admin role here if needed, but for now strict ownership
    return {
      success: false,
      error: NextResponse.json({ error: "Permission denied" }, { status: 403 }),
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
 * Safely parse JSON body from a request.
 * Returns the parsed body or throws a SyntaxError with a clear message.
 *
 * @param request - The incoming Next.js request
 * @returns Parsed JSON body
 * @throws SyntaxError if the body is not valid JSON
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
  request: NextRequest
): Promise<T> {
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
 * const { allowed, response, result } = applyRateLimit(userId || request.ip);
 * if (!allowed) return response;
 * // Proceed with request handling
 * attachRateLimitHeaders(myResponse, result);
 * ```
 */
export function applyRateLimit(
  identifier: string,
  options?: { limit?: number; windowMs?: number }
):
  | { allowed: true; result: RateLimitResult }
  | { allowed: false; response: NextResponse } {
  const result = checkRateLimit(identifier, options);

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
