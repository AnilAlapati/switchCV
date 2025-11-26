/**
 * Distributed Rate Limiting Utility
 *
 * Provides Firestore-backed rate limiting for API endpoints.
 * Unlike in-memory rate limiting, this works across serverless instances.
 *
 * @module lib/utils/distributedRateLimit
 */

import { adminDb } from "@/lib/firebase-admin";
import { RATE_LIMITS } from "@/config/constants";

interface RateLimitEntry {
  count: number;
  windowStart: number;
  identifier: string;
  scope: string;
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
export async function checkDistributedRateLimit(
  identifier: string,
  options: DistributedRateLimitOptions = {}
): Promise<DistributedRateLimitResult> {
  const {
    limit = RATE_LIMITS.API_REQUESTS_PER_MINUTE,
    windowMs = 60 * 1000, // 1 minute default
    scope = "default",
  } = options;

  const now = Date.now();
  const docId = `${scope}:${identifier}`.replace(/[/\\]/g, "_");
  const rateLimitRef = adminDb.collection(RATE_LIMIT_COLLECTION).doc(docId);

  try {
    const result = await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);
      const data = doc.data() as RateLimitEntry | undefined;

      // If no entry or window expired, start fresh
      if (!data || now - data.windowStart >= windowMs) {
        const newEntry: RateLimitEntry = {
          count: 1,
          windowStart: now,
          identifier,
          scope,
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

      // Increment count
      const newCount = data.count + 1;
      const allowed = newCount <= limit;
      const resetIn = Math.max(0, data.windowStart + windowMs - now);

      transaction.update(rateLimitRef, { count: newCount });

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
    // On transaction failure, allow the request but log the error
    // This prevents rate limiting from blocking requests during Firestore issues
    console.error("Distributed rate limit check failed:", error);
    return {
      allowed: true,
      current: 0,
      limit,
      resetIn: windowMs,
      remaining: limit,
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
  options: Omit<DistributedRateLimitOptions, "scope"> = {}
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
  maxAgeMs: number = 24 * 60 * 60 * 1000
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
