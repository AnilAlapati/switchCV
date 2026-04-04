/**
 * RAG Response Cache
 *
 * Hashes (prompt + context) to avoid duplicate LLM calls.
 * In-memory with TTL — no external dependencies.
 *
 * Key design:
 * - Hash = SHA-256 of (query + sorted chunk IDs)
 * - This means same question + same context = cache hit
 * - Different chunks (e.g., resume updated) = cache miss (correct)
 *
 * @module lib/services/rag/responseCache
 */

import { createHash } from "crypto";

interface CacheEntry {
  answer: string;
  model?: string;
  provider?: string;
  qualityScore?: number;
  createdAt: number;
  ttlMs: number;
}

/** Default TTL: 30 minutes */
const DEFAULT_TTL_MS = 30 * 60 * 1000;

/** Max cache entries to bound memory */
const MAX_ENTRIES = 500;

const cache = new Map<string, CacheEntry>();

/**
 * Generate a cache key from query and chunk context.
 */
export function generateCacheKey(query: string, chunkIds: string[]): string {
  const sorted = [...chunkIds].sort();
  const input = `${query.trim().toLowerCase()}|${sorted.join(",")}`;
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Look up a cached response.
 * Returns null if not found or expired.
 */
export function getCachedResponse(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.createdAt > entry.ttlMs) {
    cache.delete(key);
    return null;
  }

  return entry;
}

/**
 * Store a response in the cache.
 */
export function setCachedResponse(
  key: string,
  answer: string,
  options?: {
    model?: string;
    provider?: string;
    qualityScore?: number;
    ttlMs?: number;
  },
): void {
  // Evict oldest entries if over limit
  if (cache.size >= MAX_ENTRIES) {
    evictOldest();
  }

  cache.set(key, {
    answer,
    model: options?.model,
    provider: options?.provider,
    qualityScore: options?.qualityScore,
    createdAt: Date.now(),
    ttlMs: options?.ttlMs ?? DEFAULT_TTL_MS,
  });
}

/**
 * Clear entire response cache.
 */
export function clearResponseCache(): void {
  cache.clear();
}

/**
 * Get cache stats for monitoring.
 */
export function getResponseCacheStats(): {
  size: number;
  maxSize: number;
} {
  return { size: cache.size, maxSize: MAX_ENTRIES };
}

// ─── Internal ───────────────────────────────────────────────────────

function evictOldest(): void {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, entry] of cache.entries()) {
    if (entry.createdAt < oldestTime) {
      oldestTime = entry.createdAt;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    cache.delete(oldestKey);
  }
}
