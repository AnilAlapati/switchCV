/**
 * Username Availability Check API
 *
 * Rate-limited endpoint to check if a username is available.
 * Uses Firestore to check against existing usernames and reserved names.
 *
 * @route GET /api/user/username/check?username=<username>
 */

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { RESERVED_USERNAMES, USERNAME_CONFIG } from "@/config/constants";
import { logger } from "@/lib/logger";

// Username validation regex (same as useAuth.helpers.ts)
const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9-_]{1,28}[a-z0-9])?$/;

/**
 * Sanitize username input
 */
function sanitizeUsername(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-{2,}/g, "-");
}

/**
 * Validate username format
 */
function validateUsernameFormat(username: string): {
  valid: boolean;
  reason?: string;
} {
  if (!username) {
    return { valid: false, reason: "Username is required" };
  }

  if (username.length < USERNAME_CONFIG.MIN_LENGTH) {
    return {
      valid: false,
      reason: `Username must be at least ${USERNAME_CONFIG.MIN_LENGTH} characters`,
    };
  }

  if (username.length > USERNAME_CONFIG.MAX_LENGTH) {
    return {
      valid: false,
      reason: `Username must be at most ${USERNAME_CONFIG.MAX_LENGTH} characters`,
    };
  }

  if (!USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      reason:
        "Username can only contain lowercase letters, numbers, hyphens, and underscores. Must start and end with a letter or number.",
    };
  }

  return { valid: true };
}

/**
 * Check if username is reserved
 */
function isReservedUsername(username: string): boolean {
  return (RESERVED_USERNAMES as readonly string[]).includes(username);
}

/**
 * Generate username suggestion based on input
 */
function generateSuggestion(base: string): string {
  const sanitized = sanitizeUsername(base);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${sanitized}-${suffix}`;
}

export async function GET(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || "unknown";

    // Apply rate limiting (10 requests per minute per IP)
    const rateLimitResult = await checkRateLimit(ip, {
      limit: USERNAME_CONFIG.CHECK_RATE_LIMIT_PER_MINUTE,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.allowed) {
      logger.warn(
        { ip, remaining: rateLimitResult.remaining },
        "Username check rate limited"
      );
      return NextResponse.json(
        {
          available: false,
          reason: "Too many requests. Please wait a moment and try again.",
          retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil(rateLimitResult.resetIn / 1000).toString(),
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          },
        }
      );
    }

    // Get username from query params
    const { searchParams } = new URL(request.url);
    const rawUsername = searchParams.get("username") || "";
    const username = sanitizeUsername(rawUsername);

    // Validate format
    const formatValidation = validateUsernameFormat(username);
    if (!formatValidation.valid) {
      return NextResponse.json(
        {
          available: false,
          reason: formatValidation.reason,
          suggestion: username ? generateSuggestion(username) : undefined,
        },
        { status: 200 }
      );
    }

    // Check reserved usernames
    if (isReservedUsername(username)) {
      return NextResponse.json(
        {
          available: false,
          reason: "This username is reserved",
          suggestion: generateSuggestion(username),
        },
        { status: 200 }
      );
    }

    // Check Firestore for existing username
    if (!adminDb) {
      logger.error("Firebase Admin DB not initialized");
      return NextResponse.json(
        {
          available: false,
          reason: "Service temporarily unavailable",
        },
        { status: 503 }
      );
    }

    const usernameDoc = await adminDb
      .collection("usernames")
      .doc(username)
      .get();

    if (usernameDoc.exists) {
      return NextResponse.json(
        {
          available: false,
          reason: "This username is already taken",
          suggestion: generateSuggestion(username),
        },
        { status: 200 }
      );
    }

    // Username is available
    return NextResponse.json(
      {
        available: true,
        username,
      },
      {
        status: 200,
        headers: {
          "X-RateLimit-Limit": rateLimitResult.limit.toString(),
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
        },
      }
    );
  } catch (error) {
    logger.error({ err: error }, "Error checking username availability");
    return NextResponse.json(
      {
        available: false,
        reason: "An error occurred. Please try again.",
      },
      { status: 500 }
    );
  }
}

/**
 * Response type for username check
 */
export interface UsernameCheckResponse {
  /** Whether the username is available */
  available: boolean;
  /** Reason why username is not available (if applicable) */
  reason?: string;
  /** Suggested alternative username (if original is taken) */
  suggestion?: string;
  /** The sanitized username that was checked */
  username?: string;
  /** Seconds until rate limit resets (if rate limited) */
  retryAfter?: number;
}
