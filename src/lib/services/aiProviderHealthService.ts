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
  private lastSyncedAt = 0;
  private isSyncing = false;

  private async syncFromFirestore(): Promise<void> {
    if (this.isSyncing || Date.now() - this.lastSyncedAt < 10000) return;
    this.isSyncing = true;
    try {
      const { adminDb } = await import("@/lib/firebase-admin");
      const doc = await adminDb.collection("monitoring").doc("providerHealthState").get();
      if (doc.exists) {
        const data = doc.data() as Record<ProviderType, { disabledUntil?: string | null } | undefined>;
        if (data) {
          const now = Date.now();
          for (const [provider, details] of Object.entries(data)) {
            const untilStr = details?.disabledUntil;
            if (untilStr) {
              const until = new Date(untilStr).getTime();
              if (until > now) {
                this.disabledUntil.set(provider as ProviderType, until);
              } else {
                this.disabledUntil.delete(provider as ProviderType);
              }
            }
          }
        }
      }
      this.lastSyncedAt = Date.now();
    } catch (err) {
      logger.warn({ err }, "Failed to sync AI provider health from Firestore");
    } finally {
      this.isSyncing = false;
    }
  }

  private async persistHealthStateToFirestore(): Promise<void> {
    try {
      const { adminDb } = await import("@/lib/firebase-admin");
      const data: Record<string, unknown> = {};
      const providers: ProviderType[] = ["gemini", "openai", "groq"];
      for (const p of providers) {
        const until = this.disabledUntil.get(p);
        data[p] = {
          disabledUntil: until ? new Date(until).toISOString() : null,
        };
      }
      await adminDb.collection("monitoring").doc("providerHealthState").set(data, { merge: true });
    } catch (err) {
      logger.error({ err }, "Failed to persist AI provider health state to Firestore");
    }
  }

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
    // Non-blocking trigger of background sync
    this.syncFromFirestore().catch(() => {});

    const disabledUntil = this.disabledUntil.get(provider);
    if (!disabledUntil) return true;

    if (Date.now() >= disabledUntil) {
      this.disabledUntil.delete(provider);
      logger.info({ provider }, "AI provider re-enabled after recovery window");
      this.persistHealthStateToFirestore().catch(() => {});
      return true;
    }

    return false;
  }

  getSnapshots(): AIProviderHealthSnapshot[] {
    // Non-blocking trigger of background sync
    this.syncFromFirestore().catch(() => {});

    const providers: ProviderType[] = ["gemini", "openai", "groq"];
    return providers.map((provider) => this.getSnapshot(provider));
  }

  resetForTests(): void {
    this.events.clear();
    this.disabledUntil.clear();
    this.lastSyncedAt = 0;
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
      this.persistHealthStateToFirestore().catch(() => {});
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
