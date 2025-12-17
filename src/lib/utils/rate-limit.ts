/**
 * Rate Limiting Utility
 *
 * Provides in-memory rate limiting for API endpoints.
 * Tracks request counts per identifier (user ID, IP address, etc.)
 * within configurable time windows.
 *
 * @module lib/utils/rate-limit
 * @example
 * ```typescript
 * import { checkRateLimit } from '@/lib/utils/rate-limit';
 * import { RATE_LIMITS } from '@/config/constants';
 *
 * export async function POST(request: NextRequest) {
 *   const userId = await getAuthenticatedUserId(request);
 *   const { allowed, remaining, resetIn } = checkRateLimit(
 *     userId,
 *     RATE_LIMITS.PROFILE_SEARCH_PER_MINUTE
 *   );
 *
 *   if (!allowed) {
 *     return NextResponse.json(
 *       { error: 'Rate limit exceeded', resetIn },
 *       {
 *         status: 429,
 *         headers: {
 *           'Retry-After': Math.ceil(resetIn / 1000),
 *           'X-RateLimit-Reset': new Date(Date.now() + resetIn).toISOString(),
 *         },
 *       }
 *     );
 *   }
 *
 *   // Process request
 * }
 * ```
 */

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  resetTime: number;
  resetIn: number;
}

/**
 * In-memory store for rate limit buckets
 * In production, use Redis for distributed systems
 */
const rateLimitStore = new Map<string, RateLimitBucket>();

/**
 * Configuration for rate limiting
 */
const RATE_LIMIT_CONFIG = {
  WINDOW_MS: 60 * 1000, // 1 minute window
  CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // Clean expired buckets every 5 minutes
} as const;

/**
 * Start periodic cleanup of expired rate limit buckets
 */
export function startRateLimitCleanup(): void {
  if (typeof window !== "undefined") {
    return; // Don't run in browser
  }

  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, bucket] of rateLimitStore.entries()) {
      if (now > bucket.resetTime) {
        rateLimitStore.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      // logger.info(`[RateLimit] Cleaned up ${cleaned} expired buckets`);
    }
  }, RATE_LIMIT_CONFIG.CLEANUP_INTERVAL_MS);
}

/**
 * Check if a request is within rate limit
 * @param identifier - Unique identifier (user ID, IP address, etc.)
 * @param limit - Maximum requests allowed in window
 * @param windowMs - Time window in milliseconds (default: 1 minute)
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number = RATE_LIMIT_CONFIG.WINDOW_MS
): RateLimitResult {
  const now = Date.now();
  const bucket = rateLimitStore.get(identifier);

  // New bucket or expired bucket
  if (!bucket || now > bucket.resetTime) {
    const newBucket: RateLimitBucket = {
      count: 1,
      resetTime: now + windowMs,
    };

    rateLimitStore.set(identifier, newBucket);

    return {
      allowed: limit > 0,
      count: 1,
      limit,
      remaining: Math.max(0, limit - 1),
      resetTime: newBucket.resetTime,
      resetIn: windowMs,
    };
  }

  // Existing bucket within window
  bucket.count++;

  const remaining = Math.max(0, limit - bucket.count);
  const allowed = bucket.count <= limit;
  const resetIn = Math.max(0, bucket.resetTime - now);

  return {
    allowed,
    count: bucket.count,
    limit,
    remaining,
    resetTime: bucket.resetTime,
    resetIn,
  };
}

/**
 * Reset rate limit for a specific identifier
 * Useful for testing or admin operations
 * @param identifier - Identifier to reset
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Reset all rate limits
 * Useful for testing
 */
export function resetAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Get current rate limit status for an identifier
 * @param identifier - Identifier to check
 * @returns Current bucket info or null
 */
export function getRateLimitStatus(
  identifier: string
): (Omit<RateLimitBucket, "resetTime"> & { resetIn: number }) | null {
  const bucket = rateLimitStore.get(identifier);
  if (!bucket) return null;

  const now = Date.now();
  if (now > bucket.resetTime) {
    rateLimitStore.delete(identifier);
    return null;
  }

  return {
    count: bucket.count,
    resetIn: bucket.resetTime - now,
  };
}

/**
 * Get all active rate limit entries (for debugging)
 * @returns Map of all active buckets
 */
export function getAllRateLimits(): Map<
  string,
  Omit<RateLimitBucket, "resetTime"> & { resetIn: number }
> {
  const now = Date.now();
  const result = new Map();

  for (const [key, bucket] of rateLimitStore.entries()) {
    if (now <= bucket.resetTime) {
      result.set(key, {
        count: bucket.count,
        resetIn: bucket.resetTime - now,
      });
    }
  }

  return result;
}
