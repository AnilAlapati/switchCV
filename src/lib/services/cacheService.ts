/**
 * Firestore-backed cache service.
 *
 * Uses a dedicated `cache` collection in Firestore with automatic TTL-based
 * expiration that is checked on read. No external dependencies (no Redis,
 * no Upstash) — runs entirely within the existing Firebase billing envelope.
 *
 * Usage:
 *   import { cacheService } from "@/lib/services/cacheService";
 *
 *   // getOrSet — cache-aside pattern (most common)
 *   const data = await cacheService.getOrSet(
 *     "system-config",
 *     () => fetchFromFirestore(),    // fallback if cache miss
 *     { ttlSeconds: 300 }            // 5 minutes
 *   );
 *
 *   // Manual get / set / invalidate
 *   await cacheService.set("key", value, { ttlSeconds: 600 });
 *   const hit = await cacheService.get<MyType>("key");
 *   await cacheService.invalidate("key");
 *   await cacheService.invalidatePattern("resume:*");
 */

import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CacheOptions {
  /** Time-to-live in seconds. Default: 300 (5 min) */
  ttlSeconds?: number;
  /** Optional namespace to group related keys */
  namespace?: string;
}

interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  expiresAt: string; // ISO-8601
  createdAt: string;
  namespace: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
}

// ---------------------------------------------------------------------------
// In-memory L1 cache (per-instance, survives for the lifetime of the
// serverless cold-start). Falls through to Firestore L2 on miss.
// ---------------------------------------------------------------------------

const L1_MAX_SIZE = 200;
const l1Cache = new Map<string, { value: unknown; expiresAt: number }>();

function l1Get<T>(key: string): T | undefined {
  const entry = l1Cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    l1Cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function l1Set(key: string, value: unknown, ttlMs: number): void {
  // Evict oldest if at capacity
  if (l1Cache.size >= L1_MAX_SIZE) {
    const firstKey = l1Cache.keys().next().value;
    if (firstKey !== undefined) {
      l1Cache.delete(firstKey);
    }
  }
  l1Cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function l1Delete(key: string): void {
  l1Cache.delete(key);
}

function l1DeletePattern(pattern: string): void {
  const prefix = pattern.replace(/\*$/, "");
  for (const key of l1Cache.keys()) {
    if (key.startsWith(prefix)) {
      l1Cache.delete(key);
    }
  }
}

// ---------------------------------------------------------------------------
// Lazy Firestore access — avoids importing firebase-admin at module scope in
// client bundles (tree-shaking safety).
// ---------------------------------------------------------------------------

let _db: FirebaseFirestore.Firestore | null = null;

async function getDb(): Promise<FirebaseFirestore.Firestore> {
  if (_db) return _db;
  // Dynamic import keeps firebase-admin out of client bundles
  const admin = await import("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  _db = admin.firestore();
  return _db;
}

const CACHE_COLLECTION = "cache";

// ---------------------------------------------------------------------------
// CacheService
// ---------------------------------------------------------------------------

class CacheService {
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, invalidations: 0 };

  // ── GET ──────────────────────────────────────────────────────────────────

  async get<T>(key: string): Promise<T | null> {
    // L1 check
    const l1Hit = l1Get<T>(key);
    if (l1Hit !== undefined) {
      this.stats.hits++;
      return l1Hit;
    }

    // L2 (Firestore)
    try {
      const db = await getDb();
      const doc = await db.collection(CACHE_COLLECTION).doc(this.sanitizeKey(key)).get();
      if (!doc.exists) {
        this.stats.misses++;
        return null;
      }

      const entry = doc.data() as CacheEntry<T>;

      // Check TTL
      if (new Date(entry.expiresAt) < new Date()) {
        // Expired — background-delete, don't block caller
        void db.collection(CACHE_COLLECTION).doc(this.sanitizeKey(key)).delete().catch(() => {});
        this.stats.misses++;
        return null;
      }

      // Promote to L1
      const ttlMs = new Date(entry.expiresAt).getTime() - Date.now();
      l1Set(key, entry.value, ttlMs);

      this.stats.hits++;
      return entry.value;
    } catch (err) {
      logger.error({ err, key }, "Cache GET failed — returning null");
      this.stats.misses++;
      return null;
    }
  }

  // ── SET ──────────────────────────────────────────────────────────────────

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttlSeconds = options.ttlSeconds ?? 300;
    const namespace = options.namespace ?? "default";
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    // L1
    l1Set(key, value, ttlSeconds * 1000);

    // L2
    try {
      const db = await getDb();
      const entry: CacheEntry<T> = {
        key,
        value,
        expiresAt: expiresAt.toISOString(),
        createdAt: now.toISOString(),
        namespace,
      };
      await db.collection(CACHE_COLLECTION).doc(this.sanitizeKey(key)).set(entry);
      this.stats.sets++;
    } catch (err) {
      logger.error({ err, key }, "Cache SET failed — continuing without cache");
    }
  }

  // ── GET OR SET (cache-aside) ─────────────────────────────────────────────

  async getOrSet<T>(
    key: string,
    fallback: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fallback();
    await this.set(key, value, options);
    return value;
  }

  // ── INVALIDATE ───────────────────────────────────────────────────────────

  async invalidate(key: string): Promise<void> {
    l1Delete(key);
    try {
      const db = await getDb();
      await db.collection(CACHE_COLLECTION).doc(this.sanitizeKey(key)).delete();
      this.stats.invalidations++;
    } catch (err) {
      logger.error({ err, key }, "Cache INVALIDATE failed");
    }
  }

  /** Invalidate all keys matching a prefix pattern (e.g. "resume:*") */
  async invalidatePattern(pattern: string): Promise<void> {
    const prefix = pattern.replace(/\*$/, "");
    l1DeletePattern(pattern);
    try {
      const db = await getDb();
      const snapshot = await db
        .collection(CACHE_COLLECTION)
        .where("key", ">=", prefix)
        .where("key", "<", prefix + "\uf8ff")
        .limit(500)
        .get();

      if (snapshot.empty) return;

      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      this.stats.invalidations += snapshot.size;
    } catch (err) {
      logger.error({ err, pattern }, "Cache INVALIDATE_PATTERN failed");
    }
  }

  // ── STATS ────────────────────────────────────────────────────────────────

  getStats(): CacheStats & { hitRate: string } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? `${((this.stats.hits / total) * 100).toFixed(1)}%` : "N/A";
    return { ...this.stats, hitRate };
  }

  // ── HELPERS ──────────────────────────────────────────────────────────────

  /** Firestore doc IDs cannot contain `/` — replace with `__` */
  private sanitizeKey(key: string): string {
    return key.replace(/\//g, "__").replace(/\./g, "_");
  }
}

export const cacheService = new CacheService();
