import { logger } from "@/lib/logger";

const isTestRuntime =
  process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID);

const DEFAULT_RETRIES = isTestRuntime ? 0 : 3;
const DEFAULT_DELAY = isTestRuntime ? 5 : 1000;

/**
 * Retry a function with exponential backoff
 * @param fn The async function to retry
 * @param retries Maximum number of retries (default: 3)
 * @param delay Initial delay in ms (default: 1000)
 * @param backoffFactor Factor to multiply delay by after each failure (default: 2)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = DEFAULT_RETRIES,
  delay: number = DEFAULT_DELAY,
  backoffFactor: number = 2
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }

    const waitMs = isTestRuntime ? Math.min(delay, 5) : delay;
    logger.warn(
      {
        remainingAttempts: retries,
        waitMs,
      },
      "Retrying operation after failure"
    );

    await new Promise((resolve) => setTimeout(resolve, waitMs));

    return withRetry(fn, retries - 1, delay * backoffFactor, backoffFactor);
  }
}
