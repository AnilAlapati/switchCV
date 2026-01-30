/**
 * Search Cache Service
 * In-memory cache with TTL for search results
 * Reduces Firestore reads by caching common queries
 */

import { logger } from "@/lib/logger";

interface CachedResult<T> {
    data: T;
    cachedAt: number;
    queryHash: string;
}

interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    lastCleanup: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 1000;
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Generic in-memory cache with TTL and LRU eviction
 */
class SearchCache<T> {
    private cache: Map<string, CachedResult<T>>;
    private stats: CacheStats;
    private readonly ttlMs: number;
    private readonly maxSize: number;
    private cleanupTimer: NodeJS.Timeout | null = null;

    constructor(ttlMs: number = DEFAULT_TTL_MS, maxSize: number = MAX_CACHE_SIZE) {
        this.cache = new Map();
        this.ttlMs = ttlMs;
        this.maxSize = maxSize;
        this.stats = {
            hits: 0,
            misses: 0,
            size: 0,
            lastCleanup: Date.now(),
        };
        this.startCleanupTimer();
    }

    /**
     * Get a cached result by key
     */
    get(key: string): T | undefined {
        const cached = this.cache.get(key);

        if (cached === undefined) {
            this.stats.misses++;
            return undefined;
        }

        // Check if expired
        if (Date.now() - cached.cachedAt > this.ttlMs) {
            this.cache.delete(key);
            this.stats.misses++;
            this.stats.size = this.cache.size;
            return undefined;
        }

        this.stats.hits++;

        // Move to end for LRU (delete and re-add)
        this.cache.delete(key);
        this.cache.set(key, cached);

        return cached.data;
    }

    /**
     * Set a cached result
     */
    set(key: string, value: T): void {
        // Evict oldest entries if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }

        this.cache.set(key, {
            data: value,
            cachedAt: Date.now(),
            queryHash: key,
        });
        this.stats.size = this.cache.size;
    }

    /**
     * Invalidate all cache entries containing a specific resume ID
     */
    invalidateByResumeId(resumeId: string): void {
        let invalidated = 0;
        for (const [key, value] of this.cache.entries()) {
            // Check if the cached data contains this resume
            if (this.containsResume(value.data, resumeId)) {
                this.cache.delete(key);
                invalidated++;
            }
        }
        this.stats.size = this.cache.size;
        if (invalidated > 0) {
            logger.info({ resumeId, invalidated }, "Cache entries invalidated");
        }
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.stats.size = 0;
        logger.info("Search cache cleared");
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats & { hitRate: number } {
        const total = this.stats.hits + this.stats.misses;
        return {
            ...this.stats,
            hitRate: total > 0 ? this.stats.hits / total : 0,
        };
    }

    /**
     * Check if cached data contains a specific resume
     */
    private containsResume(data: T, resumeId: string): boolean {
        if (Array.isArray(data)) {
            return data.some((item) => {
                if (typeof item === "object" && item !== null) {
                    return (
                        (item as Record<string, unknown>).resumeId === resumeId ||
                        (item as Record<string, unknown>).id === resumeId
                    );
                }
                return false;
            });
        }
        return false;
    }

    /**
     * Remove expired entries
     */
    private cleanup(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, value] of this.cache.entries()) {
            if (now - value.cachedAt > this.ttlMs) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        this.stats.size = this.cache.size;
        this.stats.lastCleanup = now;

        if (cleaned > 0) {
            logger.debug({ cleaned, remaining: this.cache.size }, "Cache cleanup completed");
        }
    }

    /**
     * Start periodic cleanup timer
     */
    private startCleanupTimer(): void {
        if (typeof setInterval !== "undefined") {
            this.cleanupTimer = setInterval(() => {
                this.cleanup();
            }, CLEANUP_INTERVAL_MS);

            // Don't prevent Node.js from exiting
            if (this.cleanupTimer.unref) {
                this.cleanupTimer.unref();
            }
        }
    }

    /**
     * Stop cleanup timer (for testing)
     */
    stopCleanupTimer(): void {
        if (this.cleanupTimer !== null) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
}

/**
 * Generate a hash key for a search query
 */
export function generateQueryHash(
    query: string,
    filters?: Record<string, unknown>
): string {
    const normalized = query.toLowerCase().trim();
    const filterStr = filters ? JSON.stringify(filters, Object.keys(filters).sort()) : "";
    return `${normalized}:${filterStr}`;
}

// Singleton cache instances
let searchResultCache: SearchCache<unknown[]> | null = null;
let skillPopularityCache: SearchCache<string[][]> | null = null;

/**
 * Get or create the search result cache
 */
export function getSearchCache(): SearchCache<unknown[]> {
    if (searchResultCache === null) {
        searchResultCache = new SearchCache<unknown[]>(DEFAULT_TTL_MS, MAX_CACHE_SIZE);
    }
    return searchResultCache;
}

/**
 * Get or create the skill popularity cache
 */
export function getSkillPopularityCache(): SearchCache<string[][]> {
    if (skillPopularityCache === null) {
        // Skill popularity cache has longer TTL (1 hour)
        skillPopularityCache = new SearchCache<string[][]>(60 * 60 * 1000, 200);
    }
    return skillPopularityCache;
}

/**
 * Invalidate caches when a resume is updated
 */
export function invalidateCacheForResume(resumeId: string): void {
    getSearchCache().invalidateByResumeId(resumeId);
}

/**
 * Clear all search caches
 */
export function clearAllSearchCaches(): void {
    if (searchResultCache !== null) {
        searchResultCache.clear();
    }
    if (skillPopularityCache !== null) {
        skillPopularityCache.clear();
    }
}

export { SearchCache };
