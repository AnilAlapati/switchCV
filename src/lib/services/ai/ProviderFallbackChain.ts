import {
  aiCircuitBreaker,
  ProviderType,
} from "@/lib/services/ai/CircuitBreaker";

interface ProviderHealth {
  consecutiveFailures: number;
  successCount: number;
  failureCount: number;
  averageLatency: number;
  lastUsedAt: number;
  score: number; // 0-100, higher is better
}

interface FallbackConfig {
  penaltyPerFailure: number;
  bonusPerSuccess: number;
  latencyWeight: number; // impact of latency on score (ms)
  recoveryTimeMs: number;
}

const DEFAULT_CONFIG: FallbackConfig = {
  penaltyPerFailure: 20,
  bonusPerSuccess: 5,
  latencyWeight: 0.01, // 1000ms latency = -10 score
  recoveryTimeMs: 60 * 1000, // 1 minute
};

/**
 * Manages the health and fallback logic for AI providers.
 * Tracks success/failure rates and prioritizes healthy providers.
 */
class ProviderFallbackChain {
  private health: Map<ProviderType, ProviderHealth> = new Map();
  private config: FallbackConfig;

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeHealth();
  }

  private initializeHealth() {
    const providers: ProviderType[] = ["gemini", "openai", "groq"];
    providers.forEach((p) => {
      this.health.set(p, {
        consecutiveFailures: 0,
        successCount: 0,
        failureCount: 0,
        averageLatency: 0,
        lastUsedAt: 0,
        score: 100, // Start with perfect score
      });
    });
  }

  /**
   * Get an ordered list of available providers based on health score and circuit status.
   */
  public getPrioritizedProviders(): ProviderType[] {
    const candidates = Array.from(this.health.entries())
      .filter(([provider]) => {
        // Filter out OPEN circuits immediately
        return aiCircuitBreaker.getStatus(provider) !== "OPEN";
      })
      .sort((a, b) => b[1].score - a[1].score) // Descending score
      .map(([provider]) => provider);

    // If all are open/filtered, return empty (caller should handle)
    return candidates;
  }

  /**
   * Report a successful execution
   */
  public reportSuccess(provider: ProviderType, latencyMs: number) {
    const stats = this.health.get(provider);
    if (!stats) return;

    stats.successCount++;
    stats.consecutiveFailures = 0;
    stats.lastUsedAt = Date.now();

    // Update average latency (exponential moving average)
    stats.averageLatency =
      stats.averageLatency === 0
        ? latencyMs
        : stats.averageLatency * 0.8 + latencyMs * 0.2;

    // Boost score
    stats.score = Math.min(100, stats.score + this.config.bonusPerSuccess);
  }

  /**
   * Report a failed execution
   */
  public reportFailure(provider: ProviderType) {
    const stats = this.health.get(provider);
    if (!stats) return;

    stats.failureCount++;
    stats.consecutiveFailures++;
    stats.lastUsedAt = Date.now();

    // Penalize score
    stats.score = Math.max(0, stats.score - this.config.penaltyPerFailure);
  }

  /**
   * Get current stats for observability
   */
  public getStats() {
    return Object.fromEntries(this.health);
  }
}

// Export singleton
export const providerFallback = new ProviderFallbackChain();
