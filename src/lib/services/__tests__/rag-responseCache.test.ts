/**
 * Tests for RAG Response Cache
 */

import {
  generateCacheKey,
  getCachedResponse,
  setCachedResponse,
  clearResponseCache,
  getResponseCacheStats,
} from "../rag/responseCache";

beforeEach(() => {
  clearResponseCache();
});

describe("generateCacheKey", () => {
  it("produces consistent keys for same input", () => {
    const key1 = generateCacheKey("what skills?", ["c1", "c2"]);
    const key2 = generateCacheKey("what skills?", ["c1", "c2"]);
    expect(key1).toBe(key2);
  });

  it("produces different keys for different queries", () => {
    const key1 = generateCacheKey("what skills?", ["c1"]);
    const key2 = generateCacheKey("what experience?", ["c1"]);
    expect(key1).not.toBe(key2);
  });

  it("produces different keys for different chunks", () => {
    const key1 = generateCacheKey("query", ["c1"]);
    const key2 = generateCacheKey("query", ["c2"]);
    expect(key1).not.toBe(key2);
  });

  it("is order-independent for chunk IDs (sorts internally)", () => {
    const key1 = generateCacheKey("query", ["c1", "c2", "c3"]);
    const key2 = generateCacheKey("query", ["c3", "c1", "c2"]);
    expect(key1).toBe(key2);
  });

  it("normalizes query case", () => {
    const key1 = generateCacheKey("What Skills?", ["c1"]);
    const key2 = generateCacheKey("what skills?", ["c1"]);
    expect(key1).toBe(key2);
  });
});

describe("setCachedResponse / getCachedResponse", () => {
  it("stores and retrieves a response", () => {
    setCachedResponse("key-1", "TypeScript, React, Node.js", {
      model: "gemini-pro",
      provider: "gemini",
      qualityScore: 0.9,
    });

    const result = getCachedResponse("key-1");
    expect(result).not.toBeNull();
    expect(result!.answer).toBe("TypeScript, React, Node.js");
    expect(result!.model).toBe("gemini-pro");
    expect(result!.qualityScore).toBe(0.9);
  });

  it("returns null for missing keys", () => {
    expect(getCachedResponse("nonexistent")).toBeNull();
  });

  it("returns null for expired entries", () => {
    setCachedResponse("key-1", "answer", { ttlMs: 1 });

    const start = Date.now();
    while (Date.now() - start < 5) {
      // busy wait
    }

    expect(getCachedResponse("key-1")).toBeNull();
  });
});

describe("clearResponseCache", () => {
  it("clears all entries", () => {
    setCachedResponse("k1", "a1");
    setCachedResponse("k2", "a2");
    clearResponseCache();

    expect(getCachedResponse("k1")).toBeNull();
    expect(getCachedResponse("k2")).toBeNull();
  });
});

describe("getResponseCacheStats", () => {
  it("reports correct size", () => {
    setCachedResponse("k1", "a1");
    setCachedResponse("k2", "a2");

    const stats = getResponseCacheStats();
    expect(stats.size).toBe(2);
    expect(stats.maxSize).toBe(500);
  });
});
