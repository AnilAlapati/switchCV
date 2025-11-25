import * as functions from "firebase-functions";

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = "CLOSED", // Normal operation
  OPEN = "OPEN", // Failing, reject requests
  HALF_OPEN = "HALF_OPEN", // Testing if service recovered
}

/**
 * Circuit breaker for external service calls
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;
  private readonly failureThreshold: number;
  private readonly recoveryTimeoutMs: number;
  private readonly successThreshold: number;

  constructor(
    failureThreshold = 5,
    recoveryTimeoutMs = 60000,
    successThreshold = 2
  ) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeoutMs = recoveryTimeoutMs;
    this.successThreshold = successThreshold;
  }

  async execute<T>(fn: () => Promise<T>, serviceName: string): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > this.recoveryTimeoutMs
      ) {
        functions.logger.info("Circuit breaker transitioning to HALF_OPEN", {
          service: serviceName,
        });
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error(
          `Circuit breaker is OPEN for ${serviceName}. Service temporarily unavailable.`
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess(serviceName);
      return result;
    } catch (error) {
      this.onFailure(serviceName);
      throw error;
    }
  }

  private onSuccess(serviceName: string): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        functions.logger.info("Circuit breaker transitioning to CLOSED", {
          service: serviceName,
        });
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(serviceName: string): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (
      this.failureCount >= this.failureThreshold ||
      this.state === CircuitState.HALF_OPEN
    ) {
      functions.logger.error("Circuit breaker transitioning to OPEN", {
        service: serviceName,
        failureCount: this.failureCount,
      });
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
  }
}

/**
 * Exponential backoff retry handler with jitter
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  operationName: string = "operation"
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    retryableErrors = [
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "ECONNREFUSED",
      "UNAVAILABLE",
      "DEADLINE_EXCEEDED",
      "RESOURCE_EXHAUSTED",
      "503",
      "429",
    ],
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      functions.logger.debug("Attempting operation", {
        operation: operationName,
        attempt,
        maxAttempts,
      });

      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message;

      // Check if error is retryable
      const isRetryable = retryableErrors.some((retryableError) =>
        errorMessage.includes(retryableError)
      );

      if (!isRetryable || attempt === maxAttempts) {
        functions.logger.error("Operation failed - not retrying", {
          operation: operationName,
          attempt,
          error: errorMessage,
          isRetryable,
          isFinalAttempt: attempt === maxAttempts,
        });
        throw lastError;
      }

      // Calculate delay with exponential backoff and jitter
      const baseDelay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );
      const jitter = Math.random() * 0.3 * baseDelay; // 0-30% jitter
      const delayMs = Math.floor(baseDelay + jitter);

      functions.logger.warn("Operation failed - retrying", {
        operation: operationName,
        attempt,
        maxAttempts,
        error: errorMessage,
        nextRetryDelayMs: delayMs,
      });

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Timeout wrapper for async operations
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  operationName: string = "operation"
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        const error = new Error(
          `${operationName} timed out after ${timeoutMs}ms`
        );
        functions.logger.error("Operation timed out", {
          operation: operationName,
          timeoutMs,
        });
        reject(error);
      }, timeoutMs)
    ),
  ]);
}

/**
 * Combine retry, circuit breaker, and timeout
 */
export async function resilientCall<T>(
  fn: () => Promise<T>,
  options: {
    retryOptions?: RetryOptions;
    circuitBreaker?: CircuitBreaker;
    timeoutMs?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    retryOptions = {},
    circuitBreaker,
    timeoutMs = 30000,
    operationName = "resilient-operation",
  } = options;

  const wrappedFn = async () => {
    const timeoutWrapped = () => withTimeout(fn, timeoutMs, operationName);

    if (circuitBreaker) {
      return circuitBreaker.execute(timeoutWrapped, operationName);
    }

    return timeoutWrapped();
  };

  return retryWithBackoff(wrappedFn, retryOptions, operationName);
}
