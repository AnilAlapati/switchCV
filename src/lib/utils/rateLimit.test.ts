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
    it("allows first request", () => {
      const result = checkRateLimit("test-user-1");

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("tracks request count", () => {
      checkRateLimit("test-user-2");
      checkRateLimit("test-user-2");
      const result = checkRateLimit("test-user-2");

      expect(result.current).toBe(3);
    });

    it("blocks when limit exceeded", () => {
      const options = { limit: 3, windowMs: 60000 };

      checkRateLimit("test-user-3", options);
      checkRateLimit("test-user-3", options);
      checkRateLimit("test-user-3", options);
      const result = checkRateLimit("test-user-3", options);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("isolates different identifiers", () => {
      const options = { limit: 2, windowMs: 60000 };

      checkRateLimit("user-a", options);
      checkRateLimit("user-a", options);
      const resultA = checkRateLimit("user-a", options);

      const resultB = checkRateLimit("user-b", options);

      expect(resultA.allowed).toBe(false);
      expect(resultB.allowed).toBe(true);
    });

    it("returns correct remaining count", () => {
      const options = { limit: 5, windowMs: 60000 };

      const result1 = checkRateLimit("test-user-4", options);
      expect(result1.remaining).toBe(4);

      checkRateLimit("test-user-4", options);
      checkRateLimit("test-user-4", options);

      const result4 = checkRateLimit("test-user-4", options);
      expect(result4.remaining).toBe(1);
    });

    it("provides reset time", () => {
      const options = { limit: 10, windowMs: 5000 };
      const result = checkRateLimit("test-user-5", options);

      expect(result.resetIn).toBeGreaterThan(0);
      expect(result.resetIn).toBeLessThanOrEqual(5000);
    });
  });

  describe("createRateLimiter", () => {
    it("creates limiter with custom options", () => {
      const limiter = createRateLimiter({ limit: 2, windowMs: 1000 });

      expect(limiter("custom-user").allowed).toBe(true);
      expect(limiter("custom-user").allowed).toBe(true);
      expect(limiter("custom-user").allowed).toBe(false);
    });
  });

  describe("aiRateLimiter", () => {
    it("uses AI-specific limits", () => {
      const result = aiRateLimiter("ai-user");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(20); // AI_REQUESTS_PER_HOUR from constants
    });
  });

  describe("apiRateLimiter", () => {
    it("uses API-specific limits", () => {
      const result = apiRateLimiter("api-user");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(60); // API_REQUESTS_PER_MINUTE from constants
    });
  });

  describe("resetRateLimit", () => {
    it("resets rate limit for specific identifier", () => {
      const options = { limit: 2, windowMs: 60000 };

      checkRateLimit("reset-user", options);
      checkRateLimit("reset-user", options);
      expect(checkRateLimit("reset-user", options).allowed).toBe(false);

      resetRateLimit("reset-user");

      expect(checkRateLimit("reset-user", options).allowed).toBe(true);
    });
  });

  describe("clearAllRateLimits", () => {
    it("clears all rate limits", () => {
      const options = { limit: 1, windowMs: 60000 };

      checkRateLimit("user-1", options);
      checkRateLimit("user-2", options);

      expect(checkRateLimit("user-1", options).allowed).toBe(false);
      expect(checkRateLimit("user-2", options).allowed).toBe(false);

      clearAllRateLimits();

      expect(checkRateLimit("user-1", options).allowed).toBe(true);
      expect(checkRateLimit("user-2", options).allowed).toBe(true);
    });
  });
});
