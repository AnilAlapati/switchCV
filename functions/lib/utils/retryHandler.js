"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
exports.retryWithBackoff = retryWithBackoff;
exports.withTimeout = withTimeout;
exports.resilientCall = resilientCall;
const functions = __importStar(require("firebase-functions"));
/**
 * Circuit breaker states
 */
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (CircuitState = {}));
/**
 * Circuit breaker for external service calls
 */
class CircuitBreaker {
    constructor(failureThreshold = 5, recoveryTimeoutMs = 60000, successThreshold = 2) {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
        this.failureThreshold = failureThreshold;
        this.recoveryTimeoutMs = recoveryTimeoutMs;
        this.successThreshold = successThreshold;
    }
    async execute(fn, serviceName) {
        if (this.state === CircuitState.OPEN) {
            if (this.lastFailureTime &&
                Date.now() - this.lastFailureTime > this.recoveryTimeoutMs) {
                functions.logger.info("Circuit breaker transitioning to HALF_OPEN", {
                    service: serviceName,
                });
                this.state = CircuitState.HALF_OPEN;
                this.successCount = 0;
            }
            else {
                throw new Error(`Circuit breaker is OPEN for ${serviceName}. Service temporarily unavailable.`);
            }
        }
        try {
            const result = await fn();
            this.onSuccess(serviceName);
            return result;
        }
        catch (error) {
            this.onFailure(serviceName);
            throw error;
        }
    }
    onSuccess(serviceName) {
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
    onFailure(serviceName) {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.failureThreshold ||
            this.state === CircuitState.HALF_OPEN) {
            functions.logger.error("Circuit breaker transitioning to OPEN", {
                service: serviceName,
                failureCount: this.failureCount,
            });
            this.state = CircuitState.OPEN;
        }
    }
    getState() {
        return this.state;
    }
    reset() {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = null;
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Exponential backoff retry handler with jitter
 */
async function retryWithBackoff(fn, options = {}, operationName = "operation") {
    const { maxAttempts = 3, initialDelayMs = 1000, maxDelayMs = 10000, backoffMultiplier = 2, retryableErrors = [
        "ECONNRESET",
        "ETIMEDOUT",
        "ENOTFOUND",
        "ECONNREFUSED",
        "UNAVAILABLE",
        "DEADLINE_EXCEEDED",
        "RESOURCE_EXHAUSTED",
        "503",
        "429",
    ], } = options;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            functions.logger.debug("Attempting operation", {
                operation: operationName,
                attempt,
                maxAttempts,
            });
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const errorMessage = lastError.message;
            // Check if error is retryable
            const isRetryable = retryableErrors.some((retryableError) => errorMessage.includes(retryableError));
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
            const baseDelay = Math.min(initialDelayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);
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
async function withTimeout(fn, timeoutMs, operationName = "operation") {
    return Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => {
            const error = new Error(`${operationName} timed out after ${timeoutMs}ms`);
            functions.logger.error("Operation timed out", {
                operation: operationName,
                timeoutMs,
            });
            reject(error);
        }, timeoutMs)),
    ]);
}
/**
 * Combine retry, circuit breaker, and timeout
 */
async function resilientCall(fn, options = {}) {
    const { retryOptions = {}, circuitBreaker, timeoutMs = 30000, operationName = "resilient-operation", } = options;
    const wrappedFn = async () => {
        const timeoutWrapped = () => withTimeout(fn, timeoutMs, operationName);
        if (circuitBreaker) {
            return circuitBreaker.execute(timeoutWrapped, operationName);
        }
        return timeoutWrapped();
    };
    return retryWithBackoff(wrappedFn, retryOptions, operationName);
}
//# sourceMappingURL=retryHandler.js.map