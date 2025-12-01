/**
 * Rate Limiting Utility Tests
 */

import {
  checkRateLimit,
  createRateLimiter,
  aiRateLimiter,
  apiRateLimiter,
  resetRateLimit,
  clearAllRateLimits,
} from "./rateLimit";

describe("Rate Limiting", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  describe("checkRateLimit", () => {
    it("allows first request", async () => {
      const result = await checkRateLimit("test-user-1");

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("tracks request count", async () => {
      await checkRateLimit("test-user-2");
      await checkRateLimit("test-user-2");
      const result = await checkRateLimit("test-user-2");

      expect(result.current).toBe(3);
    });

    it("blocks when limit exceeded", async () => {
      const options = { limit: 3, windowMs: 60000 };

      await checkRateLimit("test-user-3", options);
      await checkRateLimit("test-user-3", options);
      await checkRateLimit("test-user-3", options);
      const result = await checkRateLimit("test-user-3", options);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("isolates different identifiers", async () => {
      const options = { limit: 2, windowMs: 60000 };

      await checkRateLimit("user-a", options);
      await checkRateLimit("user-a", options);
      const resultA = await checkRateLimit("user-a", options);

      const resultB = await checkRateLimit("user-b", options);

      expect(resultA.allowed).toBe(false);
      expect(resultB.allowed).toBe(true);
    });

    it("returns correct remaining count", async () => {
      const options = { limit: 5, windowMs: 60000 };

      const result1 = await checkRateLimit("test-user-4", options);
      expect(result1.remaining).toBe(4);

      await checkRateLimit("test-user-4", options);
      await checkRateLimit("test-user-4", options);

      const result4 = await checkRateLimit("test-user-4", options);
      expect(result4.remaining).toBe(1);
    });

    it("provides reset time", async () => {
      const options = { limit: 10, windowMs: 5000 };
      const result = await checkRateLimit("test-user-5", options);

      expect(result.resetIn).toBeGreaterThan(0);
      expect(result.resetIn).toBeLessThanOrEqual(5000);
    });
  });

  describe("createRateLimiter", () => {
    it("creates limiter with custom options", async () => {
      const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });

      expect((await limiter("custom-user")).allowed).toBe(true);
      expect((await limiter("custom-user")).allowed).toBe(true);
      expect((await limiter("custom-user")).allowed).toBe(false);
    });
  });

  describe("aiRateLimiter", () => {
    it("uses AI-specific limits", async () => {
      const result = await aiRateLimiter("ai-user");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10); // AI_REQUESTS_PER_HOUR from config (basic tier)
    });
  });

  describe("apiRateLimiter", () => {
    it("uses API-specific limits", async () => {
      const result = await apiRateLimiter("api-user");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100); // API_REQUESTS_PER_MINUTE from config
    });
  });

  describe("resetRateLimit", () => {
    it("resets rate limit for specific identifier", async () => {
      const options = { limit: 2, windowMs: 60000 };

      await checkRateLimit("reset-user", options);
      await checkRateLimit("reset-user", options);
      expect((await checkRateLimit("reset-user", options)).allowed).toBe(false);

      resetRateLimit("reset-user");

      expect((await checkRateLimit("reset-user", options)).allowed).toBe(true);
    });
  });

  describe("clearAllRateLimits", () => {
    it("clears all rate limits", async () => {
      const options = { limit: 1, windowMs: 60000 };

      await checkRateLimit("user-1", options);
      await checkRateLimit("user-2", options);

      expect((await checkRateLimit("user-1", options)).allowed).toBe(false);
      expect((await checkRateLimit("user-2", options)).allowed).toBe(false);

      clearAllRateLimits();

      expect((await checkRateLimit("user-1", options)).allowed).toBe(true);
      expect((await checkRateLimit("user-2", options)).allowed).toBe(true);
    });
  });
});
