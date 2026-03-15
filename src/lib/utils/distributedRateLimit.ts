import { logger } from "@/lib/logger";
/**
 * Distributed Rate Limiting Utility
 *
 * Provides Firestore-backed rate limiting for API endpoints.
 * Unlike in-memory rate limiting, this works across serverless instances.
 *
 * @module lib/utils/distributedRateLimit
 */

import { adminDb } from "@/lib/firebase-admin";

interface RateLimitEntry {
  count: number;
  windowStart: number;
  identifier: string;
  scope: string;
  expiresAt?: Date; // For cleanup
}

export interface DistributedRateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count in this window */
  current: number;
  /** Maximum allowed requests */
  limit: number;
  /** Milliseconds until the rate limit resets */
  resetIn: number;
  /** Remaining requests in this window */
  remaining: number;
}

export interface DistributedRateLimitOptions {
  /** Maximum requests allowed in the time window */
  limit?: number;
  /** Time window in milliseconds */
  windowMs?: number;
  /** Scope for the rate limit (e.g., "ai-search", "api") */
  scope?: string;
  /** User tier for automatic limit lookup */
  tier?: string;
  /** If true, check current usage without incrementing the counter */
  dryRun?: boolean;
}

const RATE_LIMIT_COLLECTION = "rateLimits";

/**
 * Check and update distributed rate limit using Firestore transaction.
 * This works across serverless instances unlike in-memory rate limiting.
 *
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @param options - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 *
 * @example
 * ```typescript
 * const result = await checkDistributedRateLimit(userId, { scope: "ai-search", limit: 10 });
 * if (!result.allowed) {
 *   return new Response("Too many requests", { status: 429 });
 * }
 * ```
 */

import { TIER_RATE_LIMITS, RateLimitScope } from "@/lib/config/rateLimits";

// ... existing interfaces ...

/**
 * Check and update distributed rate limit using Firestore transaction.
 * This works across serverless instances unlike in-memory rate limiting.
 *
 * Updated to automatically enforce tier-based limits if tier lookup is enabled.
 */
export async function checkDistributedRateLimit(
  identifier: string,
  options: DistributedRateLimitOptions = {},
): Promise<DistributedRateLimitResult> {
  const { scope = "default" } = options;
  let { limit, windowMs } = options;

  // If specific limits aren't provided, try to resolve from tier
  // Note: We need a way to know if 'limit' was explicitly passed or just default.
  // In this implementation, we prioritize tier-based config if we can find the user's tier.
  // Ideally, the caller should pass the tier if they already have it to avoid double-fetching.

  // However, `options` doesn't currently accept `tier`. Let's assume for now the caller
  // might rely on defaults or pass explicit values.
  // TO FIX: We need to allow passing `tier` or fetching it.
  // Let's modify the signature or logic in a follow-up if needed, but for now,
  // we will respect explicit options if provided, otherwise default to a safe fallback.

  // ACTUALLY: The best way is to allow specific limits to be overridden by the caller
  // BUT the caller usually wants to ENFORCE the tier limit.
  // So we should verify if the caller passed the tier-limit logic.

  // Let's keep this function low-level. It just enforces what it is told.
  // The CALLER (route handler) is responsible for looking up the correct limit
  // from TIER_RATE_LIMITS and passing it here.

  // Wait, the plan said: "Update checkDistributedRateLimit to optionally accept a User Tier"
  // Let's add that to the options.

  if (options.tier) {
    const tier = options.tier as keyof typeof TIER_RATE_LIMITS;
    const config =
      TIER_RATE_LIMITS[tier]?.[scope as RateLimitScope] ||
      TIER_RATE_LIMITS[tier]?.default ||
      TIER_RATE_LIMITS.basic.default;
    limit = config.limit;
    windowMs = config.windowMs;
  }

  // Fallbacks if still undefined (shouldn't happen if tier is passed or defaults used)
  limit = limit ?? 10;
  windowMs = windowMs ?? 60000;

  const now = Date.now();
  const docId = `${scope}:${identifier}`.replace(/[/\\]/g, "_");
  const rateLimitRef = adminDb.collection(RATE_LIMIT_COLLECTION).doc(docId);

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const data = doc.data() as RateLimitEntry | undefined;

      // If no entry or window expired, start fresh
      if (!data || now - data.windowStart >= windowMs) {
        if (options.dryRun) {
          // Dry run: don't write, just report headroom
          return {
            allowed: true,
            current: 0,
            limit,
            resetIn: windowMs,
            remaining: limit,
          };
        }
        const newEntry: RateLimitEntry = {
          count: 1,
          windowStart: now,
          identifier,
          scope,
          expiresAt: new Date(now + windowMs * 2), // Keep for 2x window for safety
        };
        transaction.set(rateLimitRef, newEntry);

        return {
          allowed: true,
          current: 1,
          limit,
          resetIn: windowMs,
          remaining: limit - 1,
        };
      }

      if (options.dryRun) {
        // Dry run: report current state without incrementing
        const resetIn = Math.max(0, data.windowStart + windowMs - now);
        return {
          allowed: data.count < limit,
          current: data.count,
          limit,
          resetIn,
          remaining: Math.max(0, limit - data.count),
        };
      }

      // Increment count
      const newCount = data.count + 1;
      const allowed = newCount <= limit;
      const resetIn = Math.max(0, data.windowStart + windowMs - now);

      transaction.update(rateLimitRef, {
        count: newCount,
        expiresAt: new Date(data.windowStart + windowMs * 2), // Ensure expiry is set
      });

      return {
        allowed,
        current: newCount,
        limit,
        resetIn,
        remaining: Math.max(0, limit - newCount),
      };
    });

    return result;
  } catch (error) {
    // SECURITY: On transaction failure, DENY the request (fail-closed)
    // This prevents abuse during Firestore outages
    // Log the error for monitoring but don't expose internal details
    logger.error(
      { err: error },
      "Distributed rate limit check failed - denying request (fail-closed):",
    );
    return {
      allowed: false,
      current: limit, // Assume at limit
      limit,
      resetIn: windowMs,
      remaining: 0,
    };
  }
}

/**
 * Create a distributed rate limiter for a specific scope
 *
 * @param scope - The scope name (e.g., "ai-search")
 * @param options - Rate limit configuration
 */
export function createDistributedRateLimiter(
  scope: string,
  options: Omit<DistributedRateLimitOptions, "scope"> = {},
) {
  return (identifier: string) =>
    checkDistributedRateLimit(identifier, { ...options, scope });
}

/**
 * AI Search rate limiter (stricter limits, distributed)
 * 10 requests per minute per user
 */
export const aiSearchRateLimiter = createDistributedRateLimiter("ai-search", {
  limit: 10,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Cleanup expired rate limit entries (call periodically via scheduled function)
 */
export async function cleanupExpiredRateLimits(
  maxAgeMs: number = 24 * 60 * 60 * 1000,
): Promise<number> {
  const cutoff = Date.now() - maxAgeMs;
  const expiredDocs = await adminDb
    .collection(RATE_LIMIT_COLLECTION)
    .where("windowStart", "<", cutoff)
    .limit(500)
    .get();

  if (expiredDocs.empty) {
    return 0;
  }

  const batch = adminDb.batch();
  expiredDocs.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return expiredDocs.size;
}
