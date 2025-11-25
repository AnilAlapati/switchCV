/**
 * Rate Limiting Utility
 *
 * Provides in-memory rate limiting for API endpoints.
 * For production, consider using Redis or a distributed cache.
 *
 * @module lib/utils/rateLimit
 */

import { RATE_LIMITS } from "@/config/constants";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limits (keyed by IP or user ID)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
  // Don't prevent process exit
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
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

export interface RateLimitOptions {
  /** Maximum requests allowed in the time window */
  limit?: number;
  /** Time window in milliseconds */
  windowMs?: number;
}

/**
 * Check and update rate limit for a given identifier
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param options - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 *
 * @example
 * ```typescript
 * const result = checkRateLimit(request.ip);
 * if (!result.allowed) {
 *   return new Response("Too many requests", { status: 429 });
 * }
 * ```
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const {
    limit = RATE_LIMITS.API_REQUESTS_PER_MINUTE,
    windowMs = 60 * 1000, // 1 minute default
  } = options;

  startCleanup();

  const now = Date.now();
  const key = `${identifier}:${limit}`;
  const existing = rateLimitStore.get(key);

  // If no existing entry or window expired, create new entry
  if (!existing || existing.resetTime < now) {
    const entry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      current: 1,
      limit,
      resetIn: windowMs,
      remaining: limit - 1,
    };
  }

  // Increment count
  existing.count++;
  const allowed = existing.count <= limit;

  return {
    allowed,
    current: existing.count,
    limit,
    resetIn: existing.resetTime - now,
    remaining: Math.max(0, limit - existing.count),
  };
}

/**
 * Create a rate limiter middleware function
 *
 * @param options - Rate limit configuration
 * @returns A function that can be used as middleware
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  return function rateLimiter(identifier: string): RateLimitResult {
    return checkRateLimit(identifier, options);
  };
}

/**
 * AI-specific rate limiter (stricter limits)
 */
export const aiRateLimiter = createRateLimiter({
  limit: RATE_LIMITS.AI_REQUESTS_PER_HOUR,
  windowMs: 60 * 60 * 1000, // 1 hour
});

/**
 * API rate limiter (standard limits)
 */
export const apiRateLimiter = createRateLimiter({
  limit: RATE_LIMITS.API_REQUESTS_PER_MINUTE,
  windowMs: 60 * 1000, // 1 minute
});

/**
 * Reset rate limit for a specific identifier (useful for testing)
 */
export function resetRateLimit(identifier: string): void {
  // Remove all entries for this identifier
  for (const key of rateLimitStore.keys()) {
    if (key.startsWith(`${identifier}:`)) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
