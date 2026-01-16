import { logger } from "@/lib/logger";

const isTestRuntime =
  process.env.NODE_ENV === "test" || Boolean(process.env.JEST_WORKER_ID);

const DEFAULT_RETRIES = isTestRuntime ? 0 : 3;
const DEFAULT_DELAY = isTestRuntime ? 5 : 1000;
const DEFAULT_JITTER_FACTOR = 0.2; // ±20% jitter

/**
 * Add jitter to a delay value to prevent thundering herd
 * @param delay Base delay in ms
 * @param jitterFactor Factor for jitter range (0.2 = ±20%)
 * @returns Delay with random jitter applied
 */
function addJitter(delay: number, jitterFactor: number = DEFAULT_JITTER_FACTOR): number {
  const jitterRange = delay * jitterFactor;
  const jitter = (Math.random() * 2 - 1) * jitterRange; // Random value between -jitterRange and +jitterRange
  return Math.max(0, Math.round(delay + jitter));
}

/**
 * Retry a function with exponential backoff and jitter
 * 
 * The jitter prevents "thundering herd" issues where many requests
 * retry at exactly the same time after a provider outage.
 * 
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

    // Apply jitter only in non-test environments
    const baseWaitMs = isTestRuntime ? Math.min(delay, 5) : delay;
    const waitMs = isTestRuntime ? baseWaitMs : addJitter(baseWaitMs);

    logger.warn(
      {
        remainingAttempts: retries,
        waitMs,
        baseDelay: delay,
      },
      "Retrying operation after failure"
    );

    await new Promise((resolve) => setTimeout(resolve, waitMs));

    return withRetry(fn, retries - 1, delay * backoffFactor, backoffFactor);
  }
}
