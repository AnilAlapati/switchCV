import { withRetry } from "./retry";
import { logger } from "@/lib/logger";

jest.mock("@/lib/logger", () => ({
  logger: {
    warn: jest.fn(),
  },
}));

describe("retry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should return result if function succeeds on first try", async () => {
    const fn = jest.fn().mockResolvedValue("success");
    const result = await withRetry(fn);
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry and succeed", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("success");

    const promise = withRetry(fn, 1, 100);

    // Wait for the first failure and the setTimeout
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalled();
  });

  it("should throw error if all retries fail", async () => {
    jest.useRealTimers();
    const error = new Error("permanent fail");
    const fn = jest.fn().mockRejectedValue(error);

    await expect(withRetry(fn, 2, 1)).rejects.toThrow("permanent fail");
  });

  it("should use exponential backoff", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValue("success");

    const promise = withRetry(fn, 2, 100, 2);

    // First retry
    await jest.runAllTimersAsync();
    // Second retry
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should use non-test delay when not in test runtime", async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalWorkerId = process.env.JEST_WORKER_ID;

    delete process.env.JEST_WORKER_ID;
    process.env.NODE_ENV = "production";

    let isolatedWithRetry: typeof withRetry;

    jest.isolateModules(() => {
      isolatedWithRetry = require("./retry").withRetry;
    });

    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("success");

    // @ts-ignore
    const promise = isolatedWithRetry(fn, 1, 100);

    // In production mode, it should use the full delay (100ms)
    // But since we are still in Jest, we can use fake timers to advance it
    await jest.advanceTimersByTimeAsync(100);

    const result = await promise;
    expect(result).toBe("success");

    process.env.NODE_ENV = originalEnv;
    process.env.JEST_WORKER_ID = originalWorkerId;
  });
});
