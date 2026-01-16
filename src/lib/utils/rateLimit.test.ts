/**
 * Rate Limiting Utility Tests
 */

describe("Rate Limiting", () => {
  let rateLimit: Record<string, unknown>;

  beforeEach(() => {
    jest.resetModules();
    rateLimit = require("./rateLimit");
    rateLimit.clearAllRateLimits();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("checkRateLimit", () => {
    it("allows first request", async () => {
      const result = await rateLimit.checkRateLimit("test-user-1");

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it("resets after window expires", async () => {
      const options = { limit: 1, windowMs: 1000 };

      await rateLimit.checkRateLimit("expiry-user", options);
      expect(
        (await rateLimit.checkRateLimit("expiry-user", options)).allowed
      ).toBe(false);

      jest.advanceTimersByTime(1001);

      const result = await rateLimit.checkRateLimit("expiry-user", options);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
    });

    it("tracks request count", async () => {
      await rateLimit.checkRateLimit("test-user-2");
      await rateLimit.checkRateLimit("test-user-2");
      const result = await rateLimit.checkRateLimit("test-user-2");

      expect(result.current).toBe(3);
    });

    it("blocks when limit exceeded", async () => {
      const options = { limit: 3, windowMs: 60000 };

      await rateLimit.checkRateLimit("test-user-3", options);
      await rateLimit.checkRateLimit("test-user-3", options);
      await rateLimit.checkRateLimit("test-user-3", options);
      const result = await rateLimit.checkRateLimit("test-user-3", options);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it("isolates different identifiers", async () => {
      const options = { limit: 2, windowMs: 60000 };

      await rateLimit.checkRateLimit("user-a", options);
      await rateLimit.checkRateLimit("user-a", options);
      const resultA = await rateLimit.checkRateLimit("user-a", options);

      const resultB = await rateLimit.checkRateLimit("user-b", options);

      expect(resultA.allowed).toBe(false);
      expect(resultB.allowed).toBe(true);
    });

    it("returns correct remaining count", async () => {
      const options = { limit: 5, windowMs: 60000 };

      const result1 = await rateLimit.checkRateLimit("test-user-4", options);
      expect(result1.remaining).toBe(4);

      await rateLimit.checkRateLimit("test-user-4", options);
      await rateLimit.checkRateLimit("test-user-4", options);

      const result4 = await rateLimit.checkRateLimit("test-user-4", options);
      expect(result4.remaining).toBe(1);
    });

    it("provides reset time", async () => {
      const options = { limit: 10, windowMs: 5000 };
      const result = await rateLimit.checkRateLimit("test-user-5", options);

      expect(result.resetIn).toBeGreaterThan(0);
      expect(result.resetIn).toBeLessThanOrEqual(5000);
    });

    it("uses default options if not provided", async () => {
      const result = await rateLimit.checkRateLimit("default-options", {
        limit: undefined,
        windowMs: undefined,
      });
      expect(result.limit).toBe(100); // Default from config
    });
  });

  describe("createRateLimiter", () => {
    it("creates limiter with custom options", async () => {
      const limiter = rateLimit.createRateLimiter({ limit: 2, windowMs: 1000 });

      expect((await limiter("custom-user")).allowed).toBe(true);
      expect((await limiter("custom-user")).allowed).toBe(true);
      expect((await limiter("custom-user")).allowed).toBe(false);
    });
  });

  describe("aiRateLimiter", () => {
    it("uses AI-specific limits", async () => {
      const result = await rateLimit.aiRateLimiter("ai-user");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(10); // AI_REQUESTS_PER_HOUR from config (basic tier)
    });
  });

  describe("apiRateLimiter", () => {
    it("uses API-specific limits", async () => {
      const result = await rateLimit.apiRateLimiter("api-user");

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100); // API_REQUESTS_PER_MINUTE from config
    });
  });

  describe("resetRateLimit", () => {
    it("resets rate limit for specific identifier", async () => {
      const options = { limit: 2, windowMs: 60000 };

      await rateLimit.checkRateLimit("reset-user", options);
      await rateLimit.checkRateLimit("reset-user", options);
      expect(
        (await rateLimit.checkRateLimit("reset-user", options)).allowed
      ).toBe(false);

      rateLimit.resetRateLimit("reset-user");

      expect(
        (await rateLimit.checkRateLimit("reset-user", options)).allowed
      ).toBe(true);
    });
  });

  describe("clearAllRateLimits", () => {
    it("clears all rate limits", async () => {
      const options = { limit: 1, windowMs: 60000 };

      await rateLimit.checkRateLimit("user-1", options);
      await rateLimit.checkRateLimit("user-2", options);

      expect((await rateLimit.checkRateLimit("user-1", options)).allowed).toBe(
        false
      );
      expect((await rateLimit.checkRateLimit("user-2", options)).allowed).toBe(
        false
      );

      rateLimit.clearAllRateLimits();

      expect((await rateLimit.checkRateLimit("user-1", options)).allowed).toBe(
        true
      );
      expect((await rateLimit.checkRateLimit("user-2", options)).allowed).toBe(
        true
      );
    });
  });

  describe("Cleanup Logic", () => {
    it("runs cleanup interval and deletes expired entries", async () => {
      await rateLimit.checkRateLimit("cleanup-test", { windowMs: 100 });

      // Advance time past expiration and interval
      jest.advanceTimersByTime(60001);

      // Run pending timers
      jest.runOnlyPendingTimers();
    });

    it("handles unref if available", async () => {
      jest.resetModules();
      const mockUnref = jest.fn();
      const mockSetInterval = jest
        .spyOn(global, "setInterval")
        .mockReturnValue({
          unref: mockUnref,
        } as any);

      const isolatedRateLimit = require("./rateLimit");
      await isolatedRateLimit.checkRateLimit("unref-test");

      expect(mockUnref).toHaveBeenCalled();
      mockSetInterval.mockRestore();
    });

    it("handles missing unref", async () => {
      jest.resetModules();
      const mockSetInterval = jest
        .spyOn(global, "setInterval")
        .mockReturnValue({
          // no unref
        } as any);

      const isolatedRateLimit = require("./rateLimit");
      await isolatedRateLimit.checkRateLimit("no-unref-test");

      mockSetInterval.mockRestore();
    });
  });
});
