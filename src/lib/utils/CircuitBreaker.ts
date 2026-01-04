
import { logger } from "@/lib/logger";

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerConfig {
    failureThreshold: number;
    resetTimeoutMs: number;
}

export class CircuitBreaker {
    private state: CircuitState = "CLOSED";
    private failures = 0;
    private lastFailureTime = 0;
    private readonly failureThreshold: number;
    private readonly resetTimeoutMs: number;
    public readonly name: string;

    constructor(name: string, config: CircuitBreakerConfig = { failureThreshold: 3, resetTimeoutMs: 60000 }) {
        this.name = name;
        this.failureThreshold = config.failureThreshold;
        this.resetTimeoutMs = config.resetTimeoutMs;
    }

    public isOpen(): boolean {
        if (this.state === "OPEN") {
            const now = Date.now();
            if (now - this.lastFailureTime > this.resetTimeoutMs) {
                this.transitionTo("HALF_OPEN");
                return false; // Allow one trial request
            }
            return true;
        }
        return false;
    }

    public recordSuccess(): void {
        if (this.state === "HALF_OPEN" || this.state === "OPEN") {
            this.transitionTo("CLOSED");
        }
        this.failures = 0;
    }

    public recordFailure(): void {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.state === "CLOSED" && this.failures >= this.failureThreshold) {
            this.transitionTo("OPEN");
        } else if (this.state === "HALF_OPEN") {
            this.transitionTo("OPEN");
        }
    }

    private transitionTo(newState: CircuitState): void {
        if (this.state !== newState) {
            logger.info(
                { provider: this.name, from: this.state, to: newState },
                `🔌 Circuit Breaker State Change: ${this.name} -> ${newState}`
            );
            this.state = newState;
        }
    }

    public getState(): CircuitState {
        return this.state;
    }
}
