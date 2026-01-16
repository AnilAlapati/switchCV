interface CacheEntry<T> {
  value: T;
  expiry: number;
}

/**
 * Simple in-memory cache with TTL.
 * Useful for caching high-frequency, low-volatility data in a serverless instance.
 */
export class MemoryCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();

  /**
   * @param defaultTtlMs Default TTL in milliseconds (default: 1 minute)
   */
  constructor(private readonly defaultTtlMs: number = 60 * 1000) {}

  set(key: string, value: T, ttlMs?: number): void {
    const expiry = Date.now() + (ttlMs || this.defaultTtlMs);
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Request Coalescing Map
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Coalesce multiple concurrent requests for the same key into a single execution.
 * Useful for preventing "thundering herd" on cache misses.
 */
export async function coalesce<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    // logger.debug({ key }, "⚡ Request coalesced");
    return pendingRequests.get(key) as Promise<T>;
  }

  const promise = fetcher()
    .then((result) => {
      pendingRequests.delete(key);
      return result;
    })
    .catch((error) => {
      pendingRequests.delete(key);
      throw error;
    });

  pendingRequests.set(key, promise);
  return promise;
}

// Export singleton instances for shared use
export const userTierCache = new MemoryCache<string>(5 * 60 * 1000); // 5 min
export const userRoleCache = new MemoryCache<string>(5 * 60 * 1000); // 5 min
export const quotaCache = new MemoryCache<number>(60 * 1000); // 1 min (shorter for quotas)
export const resumeCache = new MemoryCache<unknown>(5 * 60 * 1000); // 5 min

// Alias for backward compatibility
export const deduplicateRequest = coalesce;
