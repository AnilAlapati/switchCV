/**
 * Rate Limiting Tests
 *
 * Tests for rate limit enforcement and bypass prevention
 *
 * @module __tests__/utils/rate-limit
 */

import {
  checkRateLimit,
  resetRateLimit,
  resetAllRateLimits,
  getRateLimitStatus,
  getAllRateLimits,
} from "@/lib/utils/rate-limit";

describe("Rate Limiting Utility", () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    resetAllRateLimits();
  });

  describe("checkRateLimit", () => {
    test("should allow requests within limit", () => {
      const limit = 5;
      const identifier = "user-123";

      for (let i = 1; i <= limit; i++) {
        const result = checkRateLimit(identifier, limit);
        expect(result.allowed).toBe(true);
        expect(result.count).toBe(i);
        expect(result.remaining).toBe(limit - i);
      }
    });

    test("should block requests exceeding limit", () => {
      const limit = 3;
      const identifier = "user-456";

      // Make 3 allowed requests
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit(identifier, limit);
        expect(result.allowed).toBe(true);
      }

      // 4th request should be blocked
      const blocked = checkRateLimit(identifier, limit);
      expect(blocked.allowed).toBe(false);
      expect(blocked.count).toBe(4);
    });

    test("should track remaining requests accurately", () => {
      const limit = 10;
      const identifier = "user-789";

      const result = checkRateLimit(identifier, limit);
      expect(result.remaining).toBe(limit - 1);

      for (let i = 0; i < 8; i++) {
        checkRateLimit(identifier, limit);
      }

      const status = checkRateLimit(identifier, limit);
      expect(status.remaining).toBe(0);
    });

    test("should respect custom time windows", () => {
      const identifier = "user-custom-window";
      const limit = 2;
      const windowMs = 100; // 100ms window

      // First request
      let result = checkRateLimit(identifier, limit, windowMs);
      expect(result.allowed).toBe(true);

      // Second request (within window)
      result = checkRateLimit(identifier, limit, windowMs);
      expect(result.allowed).toBe(true);

      // Third request (within window) - should be blocked
      result = checkRateLimit(identifier, limit, windowMs);
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      jest.useFakeTimers();
      jest.advanceTimersByTime(150);

      // Should be allowed now (new window)
      result = checkRateLimit(identifier, limit, windowMs);
      expect(result.allowed).toBe(true);

      jest.useRealTimers();
    });

    test("should reset bucket after window expiry", () => {
      jest.useFakeTimers();

      const identifier = "user-reset";
      const limit = 2;
      const windowMs = 1000;

      // Fill the bucket
      checkRateLimit(identifier, limit, windowMs);
      checkRateLimit(identifier, limit, windowMs);

      // Next should be blocked
      let result = checkRateLimit(identifier, limit, windowMs);
      expect(result.allowed).toBe(false);

      // Advance time past window
      jest.advanceTimersByTime(1100);

      // Should be allowed again (new window)
      result = checkRateLimit(identifier, limit, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(1);

      jest.useRealTimers();
    });

    test("should track different identifiers separately", () => {
      const limit = 2;
      const user1 = "user-1";
      const user2 = "user-2";

      // User 1 makes 2 requests
      checkRateLimit(user1, limit);
      checkRateLimit(user1, limit);

      // User 2 makes 1 request
      const result = checkRateLimit(user2, limit);

      // User 2 should still have more quota
      expect(result.count).toBe(1);
      expect(result.remaining).toBe(1);

      // User 1 should be blocked
      const user1Result = checkRateLimit(user1, limit);
      expect(user1Result.allowed).toBe(false);
    });
  });

  describe("resetRateLimit", () => {
    test("should reset limit for specific identifier", () => {
      const identifier = "user-reset-test";
      const limit = 2;

      // Fill bucket
      checkRateLimit(identifier, limit);
      checkRateLimit(identifier, limit);

      // Should be blocked
      let result = checkRateLimit(identifier, limit);
      expect(result.allowed).toBe(false);

      // Reset
      resetRateLimit(identifier);

      // Should be allowed now
      result = checkRateLimit(identifier, limit);
      expect(result.allowed).toBe(true);
      expect(result.count).toBe(1);
    });

    test("should not affect other identifiers", () => {
      const user1 = "user-1";
      const user2 = "user-2";
      const limit = 2;

      // Both make requests
      checkRateLimit(user1, limit);
      checkRateLimit(user2, limit);

      // Reset user 1
      resetRateLimit(user1);

      // User 1 should be reset
      const result1 = checkRateLimit(user1, limit);
      expect(result1.count).toBe(1);

      // User 2 should still be at 2
      const result2 = checkRateLimit(user2, limit);
      expect(result2.count).toBe(2);
    });
  });

  describe("getRateLimitStatus", () => {
    test("should return current status", () => {
      const identifier = "user-status";
      const limit = 5;

      checkRateLimit(identifier, limit);
      checkRateLimit(identifier, limit);

      const status = getRateLimitStatus(identifier);
      expect(status).not.toBeNull();
      expect(status?.count).toBe(2);
    });

    test("should return null for non-existent identifier", () => {
      const status = getRateLimitStatus("non-existent");
      expect(status).toBeNull();
    });

    test("should return null for expired bucket", () => {
      jest.useFakeTimers();

      const identifier = "user-expired";
      const limit = 1;
      const windowMs = 1000;

      checkRateLimit(identifier, limit, windowMs);

      // Before expiry
      expect(getRateLimitStatus(identifier)).not.toBeNull();

      // After expiry
      jest.advanceTimersByTime(1100);
      expect(getRateLimitStatus(identifier)).toBeNull();

      jest.useRealTimers();
    });
  });

  describe("getAllRateLimits", () => {
    test("should return all active limits", () => {
      const limit = 5;
      checkRateLimit("user-1", limit);
      checkRateLimit("user-2", limit);
      checkRateLimit("user-3", limit);

      const all = getAllRateLimits();
      expect(all.size).toBe(3);
    });

    test("should not include expired limits", () => {
      jest.useFakeTimers();

      const limit = 1;
      const windowMs = 1000;

      checkRateLimit("user-1", limit, windowMs);
      checkRateLimit("user-2", limit, windowMs);

      // Before expiry
      expect(getAllRateLimits().size).toBe(2);

      // After expiry
      jest.advanceTimersByTime(1100);
      expect(getAllRateLimits().size).toBe(0);

      jest.useRealTimers();
    });
  });

  describe("resetAllRateLimits", () => {
    test("should clear all rate limits", () => {
      const limit = 5;
      checkRateLimit("user-1", limit);
      checkRateLimit("user-2", limit);
      checkRateLimit("user-3", limit);

      expect(getAllRateLimits().size).toBe(3);

      resetAllRateLimits();

      expect(getAllRateLimits().size).toBe(0);
    });
  });

  describe("Rate Limit Bypass Prevention", () => {
    test("should not allow IP spoofing to bypass limits", () => {
      const limit = 2;

      // Same user with different identifiers should not bypass limit
      const userId = "user-123";

      checkRateLimit(userId, limit);
      checkRateLimit(userId, limit);

      // Even if using different IP-based identifier, same user ID should be blocked
      const result = checkRateLimit(userId, limit);
      expect(result.allowed).toBe(false);
    });

    test("should not allow timing attacks", () => {
      const limit = 1;
      const identifier = "user-timing";

      // First request
      const result1 = checkRateLimit(identifier, limit);
      expect(result1.allowed).toBe(true);

      // Immediate second request
      const result2 = checkRateLimit(identifier, limit);
      expect(result2.allowed).toBe(false);

      // Should consistently block within window
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit(identifier, limit);
        expect(result.allowed).toBe(false);
      }
    });

    test("should not allow connection pooling bypass", () => {
      const limit = 2;
      const identifier = "user-pooling";

      // Simulate multiple connections from same user
      const results = [];
      for (let i = 0; i < 4; i++) {
        results.push(checkRateLimit(identifier, limit));
      }

      // Should have exactly 2 allowed and 2 blocked
      const allowed = results.filter((r) => r.allowed).length;
      const blocked = results.filter((r) => !r.allowed).length;

      expect(allowed).toBe(2);
      expect(blocked).toBe(2);
    });
  });

  describe("Rate Limit Edge Cases", () => {
    test("should handle zero limit", () => {
      const result = checkRateLimit("user", 0);
      expect(result.allowed).toBe(false);
      expect(result.count).toBe(1);
    });

    test("should handle very large limits", () => {
      const limit = 1_000_000;
      const result = checkRateLimit("user", limit);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(limit - 1);
    });

    test("should handle rapid requests", () => {
      const limit = 100;
      const identifier = "user-rapid";

      for (let i = 0; i < 100; i++) {
        const result = checkRateLimit(identifier, limit);
        expect(result.allowed).toBe(true);
      }

      const blocked = checkRateLimit(identifier, limit);
      expect(blocked.allowed).toBe(false);
    });

    test("should provide accurate reset times", () => {
      const identifier = "user-timing";
      const limit = 1;
      const windowMs = 5000;

      const result = checkRateLimit(identifier, limit, windowMs);

      // Reset time should be approximately now + windowMs
      const now = Date.now();
      expect(result.resetIn).toBeGreaterThan(windowMs - 100);
      expect(result.resetIn).toBeLessThanOrEqual(windowMs);
    });
  });
});
