
import { CircuitBreaker } from "@/lib/utils/CircuitBreaker";

export type ProviderType = "gemini" | "openai" | "groq" | "huggingface";

class AiCircuitBreakerService {
    private breakers: Record<ProviderType, CircuitBreaker>;

    constructor() {
        this.breakers = {
            gemini: new CircuitBreaker("gemini", { failureThreshold: 3, resetTimeoutMs: 60 * 1000 }),
            openai: new CircuitBreaker("openai", { failureThreshold: 3, resetTimeoutMs: 60 * 1000 }),
            groq: new CircuitBreaker("groq", { failureThreshold: 3, resetTimeoutMs: 60 * 1000 }),
            huggingface: new CircuitBreaker("huggingface", { failureThreshold: 3, resetTimeoutMs: 60 * 1000 }),
        };
    }

    public getStatus(provider: ProviderType) {
        return this.breakers[provider].getState();
    }

    public isOpen(provider: ProviderType) {
        return this.breakers[provider].isOpen();
    }

    public recordSuccess(provider: ProviderType) {
        this.breakers[provider].recordSuccess();
    }

    public recordFailure(provider: ProviderType) {
        this.breakers[provider].recordFailure();
    }
}

export const aiCircuitBreaker = new AiCircuitBreakerService();
