/**
 * Tests for CacheService — Firestore-backed L1/L2 cache.
 *
 * Fully mocked: no real Firestore connection needed.
 */

// ── Firestore mock ─────────────────────────────────────────────────────────

const mockDoc = jest.fn();
const mockSet = jest.fn().mockResolvedValue(undefined);
const mockDelete = jest.fn().mockResolvedValue(undefined);
const mockGet = jest.fn();
const mockWhere = jest.fn();
const mockLimit = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn().mockResolvedValue(undefined);

const mockCollection = jest.fn().mockReturnValue({
  doc: mockDoc.mockReturnValue({
    get: mockGet,
    set: mockSet,
    delete: mockDelete,
  }),
  where: mockWhere.mockReturnValue({
    where: jest.fn().mockReturnValue({
      limit: mockLimit.mockReturnValue({
        get: jest.fn().mockResolvedValue({ empty: true, docs: [] }),
      }),
    }),
  }),
});

const mockBatch = jest.fn().mockReturnValue({
  delete: mockBatchDelete,
  commit: mockBatchCommit,
});

jest.mock("firebase-admin", () => ({
  apps: [{}], // pretend already initialized
  firestore: jest.fn().mockReturnValue({
    collection: mockCollection,
    batch: mockBatch,
  }),
  initializeApp: jest.fn(),
}));

// ── Import after mocking ──────────────────────────────────────────────────

import { cacheService } from "@/lib/services/cacheService";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("CacheService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("get()", () => {
    it("returns null on cache miss", async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const result = await cacheService.get("missing-key");

      expect(result).toBeNull();
    });

    it("returns value on cache hit within TTL", async () => {
      const futureDate = new Date(Date.now() + 60_000).toISOString();
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          key: "test-key",
          value: { name: "John" },
          expiresAt: futureDate,
          createdAt: new Date().toISOString(),
          namespace: "default",
        }),
      });

      const result = await cacheService.get("test-key");

      expect(result).toEqual({ name: "John" });
    });

    it("returns null for expired entries", async () => {
      const pastDate = new Date(Date.now() - 60_000).toISOString();
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          key: "expired-key",
          value: "stale",
          expiresAt: pastDate,
          createdAt: new Date().toISOString(),
          namespace: "default",
        }),
      });

      const result = await cacheService.get("expired-key");

      expect(result).toBeNull();
    });

    it("returns null gracefully on Firestore error", async () => {
      mockGet.mockRejectedValueOnce(new Error("Firestore unavailable"));

      const result = await cacheService.get("error-key");

      expect(result).toBeNull();
    });
  });

  describe("set()", () => {
    it("stores value in Firestore with TTL", async () => {
      await cacheService.set("my-key", { data: 42 }, { ttlSeconds: 600 });

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          key: "my-key",
          value: { data: 42 },
          namespace: "default",
        }),
      );
    });

    it("uses custom namespace", async () => {
      await cacheService.set(
        "ns-key",
        "val",
        { ttlSeconds: 60, namespace: "profiles" },
      );

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ namespace: "profiles" }),
      );
    });

    it("handles Firestore write failures gracefully", async () => {
      mockSet.mockRejectedValueOnce(new Error("Write failed"));

      // Should not throw
      await expect(
        cacheService.set("fail-key", "data"),
      ).resolves.toBeUndefined();
    });
  });

  describe("getOrSet()", () => {
    it("returns cached value without calling fallback", async () => {
      const futureDate = new Date(Date.now() + 60_000).toISOString();
      mockGet.mockResolvedValueOnce({
        exists: true,
        data: () => ({
          key: "cached",
          value: "from-cache",
          expiresAt: futureDate,
          createdAt: new Date().toISOString(),
          namespace: "default",
        }),
      });

      const fallback = jest.fn().mockResolvedValue("from-fallback");
      const result = await cacheService.getOrSet("cached", fallback);

      expect(result).toBe("from-cache");
      expect(fallback).not.toHaveBeenCalled();
    });

    it("calls fallback on cache miss and stores result", async () => {
      mockGet.mockResolvedValueOnce({ exists: false });

      const fallback = jest.fn().mockResolvedValue({ fresh: true });
      const result = await cacheService.getOrSet("miss", fallback, {
        ttlSeconds: 120,
      });

      expect(result).toEqual({ fresh: true });
      expect(fallback).toHaveBeenCalledTimes(1);
      expect(mockSet).toHaveBeenCalled();
    });
  });

  describe("invalidate()", () => {
    it("deletes key from Firestore", async () => {
      await cacheService.invalidate("del-key");

      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe("getStats()", () => {
    it("returns cache statistics with hit rate", () => {
      const stats = cacheService.getStats();

      expect(stats).toHaveProperty("hits");
      expect(stats).toHaveProperty("misses");
      expect(stats).toHaveProperty("sets");
      expect(stats).toHaveProperty("invalidations");
      expect(stats).toHaveProperty("hitRate");
    });
  });
});
