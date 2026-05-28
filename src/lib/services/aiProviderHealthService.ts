import { logger } from "@/lib/logger";
import type { ProviderType } from "@/lib/services/ai/CircuitBreaker";

type ProviderStatus = "healthy" | "degraded" | "disabled";

interface ProviderEvent {
  at: number;
  ok: boolean;
  latencyMs?: number;
  schemaValid?: boolean;
}

export interface AIProviderHealthSnapshot {
  provider: ProviderType;
  status: ProviderStatus;
  disabledUntil: string | null;
  errorRate: number;
  schemaErrorRate: number;
  averageLatencyMs: number;
  sampleCount: number;
  lastUpdatedAt: string | null;
}

const HEALTH_WINDOW_MS = 10 * 60 * 1000;
const DISABLE_FOR_MS = 30 * 60 * 1000;
const ERROR_RATE_DISABLE_THRESHOLD = 0.2;
const MIN_SAMPLES_FOR_DISABLE = 5;

class AIProviderHealthService {
  private events = new Map<ProviderType, ProviderEvent[]>();
  private disabledUntil = new Map<ProviderType, number>();

  recordSuccess(
    provider: ProviderType,
    options: { latencyMs?: number; schemaValid?: boolean } = {},
  ): void {
    this.record(provider, {
      at: Date.now(),
      ok: options.schemaValid !== false,
      latencyMs: options.latencyMs,
      schemaValid: options.schemaValid,
    });
  }

  recordFailure(
    provider: ProviderType,
    options: { latencyMs?: number; schemaValid?: boolean } = {},
  ): void {
    this.record(provider, {
      at: Date.now(),
      ok: false,
      latencyMs: options.latencyMs,
      schemaValid: options.schemaValid,
    });
  }

  isProviderAvailable(provider: ProviderType): boolean {
    const disabledUntil = this.disabledUntil.get(provider);
    if (!disabledUntil) return true;

    if (Date.now() >= disabledUntil) {
      this.disabledUntil.delete(provider);
      logger.info({ provider }, "AI provider re-enabled after recovery window");
      return true;
    }

    return false;
  }

  getSnapshots(): AIProviderHealthSnapshot[] {
    const providers: ProviderType[] = ["gemini", "openai", "groq"];
    return providers.map((provider) => this.getSnapshot(provider));
  }

  resetForTests(): void {
    this.events.clear();
    this.disabledUntil.clear();
  }

  private record(provider: ProviderType, event: ProviderEvent): void {
    const events = this.pruneEvents(provider, event.at);
    events.push(event);
    this.events.set(provider, events);

    const snapshot = this.getSnapshot(provider, event.at);
    if (
      snapshot.sampleCount >= MIN_SAMPLES_FOR_DISABLE &&
      snapshot.errorRate > ERROR_RATE_DISABLE_THRESHOLD &&
      this.isProviderAvailable(provider)
    ) {
      const until = event.at + DISABLE_FOR_MS;
      this.disabledUntil.set(provider, until);
      logger.warn(
        {
          provider,
          errorRate: snapshot.errorRate,
          sampleCount: snapshot.sampleCount,
          disabledUntil: new Date(until).toISOString(),
        },
        "AI provider disabled by health policy",
      );
    }
  }

  private getSnapshot(
    provider: ProviderType,
    now: number = Date.now(),
  ): AIProviderHealthSnapshot {
    const events = this.pruneEvents(provider, now);
    const failures = events.filter((event) => !event.ok).length;
    const schemaChecks = events.filter(
      (event) => event.schemaValid !== undefined,
    );
    const schemaFailures = schemaChecks.filter(
      (event) => event.schemaValid === false,
    ).length;
    const latencies = events
      .map((event) => event.latencyMs)
      .filter((latency): latency is number => typeof latency === "number");
    const disabledUntil = this.disabledUntil.get(provider) ?? null;
    const status: ProviderStatus =
      disabledUntil && now < disabledUntil
        ? "disabled"
        : failures > 0
          ? "degraded"
          : "healthy";

    const lastEvent = events[events.length - 1];

    return {
      provider,
      status,
      disabledUntil: disabledUntil
        ? new Date(disabledUntil).toISOString()
        : null,
      errorRate: events.length === 0 ? 0 : failures / events.length,
      schemaErrorRate:
        schemaChecks.length === 0 ? 0 : schemaFailures / schemaChecks.length,
      averageLatencyMs:
        latencies.length === 0
          ? 0
          : latencies.reduce((sum, latency) => sum + latency, 0) /
            latencies.length,
      sampleCount: events.length,
      lastUpdatedAt: lastEvent ? new Date(lastEvent.at).toISOString() : null,
    };
  }

  private pruneEvents(provider: ProviderType, now: number): ProviderEvent[] {
    const cutoff = now - HEALTH_WINDOW_MS;
    const events = (this.events.get(provider) ?? []).filter(
      (event) => event.at >= cutoff,
    );
    this.events.set(provider, events);
    return events;
  }
}

export const aiProviderHealthService = new AIProviderHealthService();
