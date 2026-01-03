/**
 * Caching and Deduplication Utility
 * 
 * Provides:
 * 1. LRU Cache (In-Memory)
 * 2. Request Coalescing (Deduplication of in-flight promises)
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class InMemoryCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresh LRU order (delete and re-add)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest (first item in Map)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global request coalescer
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Coalesces multiple concurrent requests for the same key into a single promise.
 * Useful for preventing "thundering herd" or "read storms" on the database.
 */
export async function deduplicateRequest<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// Global instances for common use cases
export const resumeCache = new InMemoryCache<unknown>(50); // Store up to 50 resumes
