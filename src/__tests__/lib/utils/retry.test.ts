import { withRetry } from "../../../lib/utils/retry";

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    warn: jest.fn(),
  },
}));

describe("Retry Utility", () => {
  const mockFn = jest.fn();
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    jest.useRealTimers();
    process.env = originalEnv;
  });

  describe("withRetry", () => {
    it("should return result on first successful call", async () => {
      mockFn.mockResolvedValue("success");

      const result = await withRetry(mockFn);

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and succeed", async () => {
      mockFn
        .mockRejectedValueOnce(new Error("First failure"))
        .mockResolvedValue("success");

      const promise = withRetry(mockFn, 1, 0); // Use 1 retry, 0 delay

      // Advance timers and wait for promise
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(2); // initial + 1 retry
    }, 10000);

    it("should throw error after all retries exhausted", async () => {
      jest.useRealTimers();
      const error = new Error("Persistent failure");
      mockFn.mockRejectedValue(error);

      await expect(withRetry(mockFn, 1, 0)).rejects.toThrow(
        "Persistent failure"
      );

      expect(mockFn).toHaveBeenCalledTimes(2); // initial + 1 retry
      jest.useFakeTimers();
    });

    it("should use zero retries in test environment", async () => {
      jest.useRealTimers();
      (process.env as any).NODE_ENV = "test";
      const error = new Error("Failure");
      mockFn.mockRejectedValue(error);

      await expect(withRetry(mockFn)).rejects.toThrow("Failure");

      expect(mockFn).toHaveBeenCalledTimes(1); // only initial call
      jest.useFakeTimers();
    });
    it.skip("should respect custom retry count", async () => {
      const error = new Error("Failure");
      mockFn.mockRejectedValue(error);

      const promise = withRetry(mockFn, 1, 0); // Use 0 delay
      await jest.runAllTimersAsync();

      await expect(promise).rejects.toThrow("Failure");
      expect(mockFn).toHaveBeenCalledTimes(2); // initial + 1 retry
    }, 10000);
    it.skip("should implement exponential backoff", async () => {
      mockFn.mockRejectedValue(new Error("Failure"));

      const promise = withRetry(mockFn, 1, 0, 2); // 1 retry, 0 delay, backoff factor 2
      jest.runAllTimers();

      await expect(promise).rejects.toThrow("Failure");
      expect(mockFn).toHaveBeenCalledTimes(2);
    }, 5000);

    it.skip("should limit delay in test environment", async () => {
      (process.env as any).NODE_ENV = "test";
      process.env.JEST_WORKER_ID = "1";

      mockFn.mockRejectedValue(new Error("Failure"));

      const promise = withRetry(mockFn, 1, 0); // Use 0 delay
      jest.runAllTimers();

      await expect(promise).rejects.toThrow("Failure");
      expect(mockFn).toHaveBeenCalledTimes(2);
    }, 5000);
    it.skip("should log retry attempts", async () => {
      const { logger } = require("@/lib/logger");
      mockFn.mockRejectedValue(new Error("Failure"));

      const promise = withRetry(mockFn, 1, 0); // Use 0 delay
      jest.runAllTimers();

      await expect(promise).rejects.toThrow("Failure");

      expect(logger.warn).toHaveBeenCalledWith(
        {
          remainingAttempts: 1,
          waitMs: 0, // 0 delay passed, so waitMs is 0
        },
        "Retrying operation after failure"
      );
    }, 5000);

    it("should handle zero retries", async () => {
      const error = new Error("Failure");
      mockFn.mockRejectedValue(error);

      await expect(withRetry(mockFn, 0)).rejects.toThrow("Failure");
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should work with synchronous functions that return promises", async () => {
      const syncFn = jest.fn().mockResolvedValue(42);

      const result = await withRetry(syncFn);

      expect(result).toBe(42);
      expect(syncFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("Jitter functionality", () => {
    it("should not apply jitter in test environment", async () => {
      const { logger } = require("@/lib/logger");
      jest.useRealTimers();

      // In test environment, jitter should be disabled for deterministic testing
      (process.env as Record<string, string>).NODE_ENV = "test";

      const error = new Error("Failure");
      const mockFn = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue("success");

      await withRetry(mockFn, 1, 100);

      // In test mode, delay should be minimized and deterministic (no jitter)
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          remainingAttempts: 1,
          // In test mode, waitMs should be capped at 5ms
          waitMs: expect.any(Number),
        }),
        "Retrying operation after failure"
      );

      // The waitMs should be exactly 5 (minimized for tests, no jitter)
      const callArgs = logger.warn.mock.calls[0][0];
      expect(callArgs.waitMs).toBeLessThanOrEqual(5);
    });

    it("should include baseDelay in log output for debugging", async () => {
      const { logger } = require("@/lib/logger");
      jest.useRealTimers();

      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error("Failure"))
        .mockResolvedValue("success");

      await withRetry(mockFn, 1, 100);

      // Should log baseDelay for debugging purposes
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          baseDelay: 100,
        }),
        "Retrying operation after failure"
      );
    });
  });
});

