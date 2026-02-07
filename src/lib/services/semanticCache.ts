/**
 * Semantic Cache Service
 *
 * Provides intelligent caching for AI queries using similarity matching.
 * This reduces API costs by returning cached responses for similar queries.
 *
 * Architecture:
 * - Uses Firestore for persistence (no external dependencies)
 * - Simple string similarity for matching (no embedding API calls)
 * - TTL-based expiration for cache freshness
 * - User-scoped caching for personalization
 *
 * @module lib/services/semanticCache
 */

import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { FieldValue } from "firebase-admin/firestore";

// Configuration
const CACHE_COLLECTION = "aiQueryCache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SIMILARITY_THRESHOLD = 0.85; // 85% similarity required for cache hit
const MAX_CACHE_ENTRIES_PER_USER = 100;

/**
 * Cache entry structure stored in Firestore
 */
interface CacheEntry {
  userId: string;
  queryHash: string;
  queryNormalized: string;
  queryOriginal: string;
  response: string;
  model: string;
  provider: string;
  tokens: number;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  hitCount: number;
  lastAccessedAt: FirebaseFirestore.Timestamp;
}

/**
 * Result of a cache lookup
 */
export interface CacheLookupResult {
  hit: boolean;
  response?: string;
  model?: string;
  provider?: string;
  similarity?: number;
  cacheKey?: string;
}

/**
 * Normalize a query string for comparison
 * - Lowercase
 * - Remove extra whitespace
 * - Remove common filler words
 * - Trim
 */
function normalizeQuery(query: string): string {
  const fillerWords = new Set([
    "please",
    "can",
    "you",
    "could",
    "would",
    "help",
    "me",
    "i",
    "want",
    "to",
    "the",
    "a",
    "an",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "shall",
    "should",
    "may",
    "might",
    "must",
    "need",
    "just",
    "also",
    "very",
    "really",
  ]);

  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ") // Remove punctuation
    .split(/\s+/)
    .filter((word) => word.length > 2 && !fillerWords.has(word))
    .join(" ")
    .trim();
}

/**
 * Generate a hash for quick lookup
 */
function hashQuery(normalizedQuery: string): string {
  // Simple hash using string reduce
  let hash = 0;
  for (let i = 0; i < normalizedQuery.length; i++) {
    const char = normalizedQuery.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Calculate Jaccard similarity between two normalized queries
 */
function calculateSimilarity(query1: string, query2: string): number {
  const words1 = new Set(query1.split(" "));
  const words2 = new Set(query2.split(" "));

  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Look up a query in the semantic cache
 *
 * @param userId User making the query
 * @param query The AI query/prompt
 * @returns Cache result with optional cached response
 */
export async function lookupCache(
  userId: string,
  query: string,
): Promise<CacheLookupResult> {
  try {
    const normalizedQuery = normalizeQuery(query);
    const queryHash = hashQuery(normalizedQuery);

    // First, try exact hash match (fast path)
    const exactMatch = await adminDb
      .collection(CACHE_COLLECTION)
      .where("userId", "==", userId)
      .where("queryHash", "==", queryHash)
      .where("expiresAt", ">", FieldValue.serverTimestamp())
      .limit(1)
      .get();

    if (!exactMatch.empty) {
      const entry = exactMatch.docs[0].data() as CacheEntry;

      // Update hit count and last accessed
      await exactMatch.docs[0].ref.update({
        hitCount: FieldValue.increment(1),
        lastAccessedAt: FieldValue.serverTimestamp(),
      });

      logger.info(
        { userId, cacheKey: exactMatch.docs[0].id, similarity: 1.0 },
        "🎯 Semantic cache HIT (exact match)",
      );

      return {
        hit: true,
        response: entry.response,
        model: entry.model,
        provider: entry.provider,
        similarity: 1.0,
        cacheKey: exactMatch.docs[0].id,
      };
    }

    // Try semantic similarity match (slower path)
    const recentEntries = await adminDb
      .collection(CACHE_COLLECTION)
      .where("userId", "==", userId)
      .where("expiresAt", ">", FieldValue.serverTimestamp())
      .orderBy("expiresAt", "desc")
      .limit(50) // Check last 50 entries for similarity
      .get();

    let bestMatch: {
      doc: FirebaseFirestore.QueryDocumentSnapshot;
      similarity: number;
    } | null = null;

    for (const doc of recentEntries.docs) {
      const entry = doc.data() as CacheEntry;
      const similarity = calculateSimilarity(
        normalizedQuery,
        entry.queryNormalized,
      );

      if (similarity >= SIMILARITY_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { doc, similarity };
        }
      }
    }

    if (bestMatch) {
      const entry = bestMatch.doc.data() as CacheEntry;

      // Update hit count
      await bestMatch.doc.ref.update({
        hitCount: FieldValue.increment(1),
        lastAccessedAt: FieldValue.serverTimestamp(),
      });

      logger.info(
        {
          userId,
          cacheKey: bestMatch.doc.id,
          similarity: bestMatch.similarity,
        },
        "🎯 Semantic cache HIT (similarity match)",
      );

      return {
        hit: true,
        response: entry.response,
        model: entry.model,
        provider: entry.provider,
        similarity: bestMatch.similarity,
        cacheKey: bestMatch.doc.id,
      };
    }

    logger.debug({ userId }, "❌ Semantic cache MISS");
    return { hit: false };
  } catch (error) {
    logger.error({ err: error, userId }, "Semantic cache lookup failed");
    // Fail open - don't block the request if cache fails
    return { hit: false };
  }
}

/**
 * Store a query and response in the semantic cache
 *
 * @param userId User who made the query
 * @param query Original query
 * @param response AI response
 * @param metadata Additional metadata (model, provider, tokens)
 */
export async function storeInCache(
  userId: string,
  query: string,
  response: string,
  metadata: {
    model: string;
    provider: string;
    tokens?: number;
  },
): Promise<void> {
  try {
    const normalizedQuery = normalizeQuery(query);
    const queryHash = hashQuery(normalizedQuery);

    // Don't cache very short queries (likely too specific)
    if (normalizedQuery.length < 10) {
      logger.debug({ userId }, "Query too short for semantic caching");
      return;
    }

    // Don't cache very long responses (unlikely to be reusable)
    if (response.length > 50000) {
      logger.debug({ userId }, "Response too long for semantic caching");
      return;
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);

    const entry: Omit<
      CacheEntry,
      "createdAt" | "expiresAt" | "lastAccessedAt"
    > = {
      userId,
      queryHash,
      queryNormalized: normalizedQuery,
      queryOriginal: query.slice(0, 500), // Truncate original for storage
      response,
      model: metadata.model,
      provider: metadata.provider,
      tokens: metadata.tokens || 0,
      hitCount: 0,
    };

    await adminDb.collection(CACHE_COLLECTION).add({
      ...entry,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: FirebaseFirestore.Timestamp.fromDate(expiresAt),
      lastAccessedAt: FieldValue.serverTimestamp(),
    });

    logger.info(
      { userId, queryHash, model: metadata.model },
      "💾 Stored in semantic cache",
    );

    // Cleanup old entries if too many (async, don't await)
    cleanupUserCache(userId).catch(() => {});
  } catch (error) {
    logger.error({ err: error, userId }, "Failed to store in semantic cache");
    // Don't throw - cache failures shouldn't break the request
  }
}

/**
 * Clean up old cache entries for a user
 */
async function cleanupUserCache(userId: string): Promise<void> {
  try {
    const entries = await adminDb
      .collection(CACHE_COLLECTION)
      .where("userId", "==", userId)
      .orderBy("lastAccessedAt", "desc")
      .offset(MAX_CACHE_ENTRIES_PER_USER)
      .limit(50)
      .get();

    if (entries.empty) return;

    const batch = adminDb.batch();
    entries.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    logger.debug(
      { userId, deleted: entries.size },
      "Cleaned up old semantic cache entries",
    );
  } catch (error) {
    logger.warn({ err: error, userId }, "Failed to cleanup semantic cache");
  }
}

/**
 * Clear all cache entries for a user (useful for testing or privacy)
 */
export async function clearUserCache(userId: string): Promise<number> {
  try {
    const entries = await adminDb
      .collection(CACHE_COLLECTION)
      .where("userId", "==", userId)
      .limit(200)
      .get();

    if (entries.empty) return 0;

    const batch = adminDb.batch();
    entries.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    logger.info(
      { userId, cleared: entries.size },
      "Cleared user semantic cache",
    );
    return entries.size;
  } catch (error) {
    logger.error({ err: error, userId }, "Failed to clear user cache");
    throw error;
  }
}

/**
 * Get cache statistics for monitoring
 */
export async function getCacheStats(): Promise<{
  totalEntries: number;
  totalHits: number;
  avgHitsPerEntry: number;
}> {
  try {
    const snapshot = await adminDb
      .collection(CACHE_COLLECTION)
      .where("expiresAt", ">", FieldValue.serverTimestamp())
      .limit(200)
      .get();

    let totalHits = 0;
    snapshot.docs.forEach((doc) => {
      totalHits += (doc.data() as CacheEntry).hitCount || 0;
    });

    return {
      totalEntries: snapshot.size,
      totalHits,
      avgHitsPerEntry: snapshot.size > 0 ? totalHits / snapshot.size : 0,
    };
  } catch (error) {
    logger.error({ err: error }, "Failed to get cache stats");
    return { totalEntries: 0, totalHits: 0, avgHitsPerEntry: 0 };
  }
}
