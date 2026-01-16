/**
 * Edge-compatible Rate Limiting Utility
 *
 * Provides a lightweight, in-memory rate limiter suitable for Next.js Middleware (Edge Runtime).
 * This does NOT use Firebase Admin or any Node.js specific APIs.
 *
 * NOTE: In serverless/edge environments, this memory is ephemeral and per-instance.
 * It provides "best effort" global protection and good protection against sinlge-instance flooding.
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// Global store that *might* persist across hot executions in Edge
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval (optional, as Map might just be cleared on cold start)
// In edge, strict cleanup intervals are hard, we'll lazy clean on access or use a probability check
const CLEANUP_PROBABILITY = 0.05; // 5% chance to cleanup on any request

function pruneExpired() {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
            rateLimitStore.delete(key);
        }
    }
}

export interface EdgeRateLimitResult {
    allowed: boolean;
    limit: number;
    remaining: number;
    resetIn: number;
}

export function checkEdgeRateLimit(
    identifier: string,
    limit: number,
    windowMs: number
): EdgeRateLimitResult {
    // Probabilistic cleanup
    if (Math.random() < CLEANUP_PROBABILITY) {
        pruneExpired();
    }

    const now = Date.now();
    const key = identifier;
    const entry = rateLimitStore.get(key);

    // If new or expired
    if (!entry || entry.resetTime < now) {
        const newEntry = {
            count: 1,
            resetTime: now + windowMs,
        };
        rateLimitStore.set(key, newEntry);
        return {
            allowed: true,
            limit,
            remaining: limit - 1,
            resetIn: windowMs,
        };
    }

    // Existing valid entry
    if (entry.count >= limit) {
        return {
            allowed: false,
            limit,
            remaining: 0,
            resetIn: entry.resetTime - now,
        };
    }

    // Increment
    entry.count++;
    return {
        allowed: true,
        limit,
        remaining: limit - entry.count,
        resetIn: entry.resetTime - now,
    };
}
