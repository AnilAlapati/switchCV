import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { alertManager, AlertSeverity } from "../utils/monitoring";

const HEALTH_WINDOW_MS = 10 * 60 * 1000;
const DISABLE_FOR_MS = 30 * 60 * 1000;
const ERROR_RATE_DISABLE_THRESHOLD = 0.2;
const MIN_SAMPLES_FOR_DISABLE = 5;

type ProviderType = "gemini" | "openai" | "groq";

export const providerHealthCheckHandler = async (
  _context: functions.EventContext,
): Promise<void> => {
  const db = admin.firestore();
  const now = Date.now();
  const since = new Date(now - HEALTH_WINDOW_MS);

  functions.logger.info("[ProviderHealthCheck] Starting scheduled AI provider health check");

  try {
    // 1. Fetch failure events in the last 10 minutes
    const failuresSnap = await db
      .collection("monitoring")
      .doc("aiFailureEvents")
      .collection("events")
      .where("createdAt", ">=", since)
      .get();

    // 2. Fetch all request summaries in the last 10 minutes
    const summariesSnap = await db
      .collection("monitoring")
      .doc("aiRequestSummaries")
      .collection("requests")
      .where("completedAt", ">=", since.toISOString())
      .get();

    // Group stats by provider
    const stats: Record<ProviderType, { total: number; failed: number; schemaErrors: number }> = {
      gemini: { total: 0, failed: 0, schemaErrors: 0 },
      openai: { total: 0, failed: 0, schemaErrors: 0 },
      groq: { total: 0, failed: 0, schemaErrors: 0 },
    };

    // Process request summaries to estimate total attempts per provider
    summariesSnap.docs.forEach((doc) => {
      const data = doc.data();
      const stages = data.stages || {};
      for (const stageData of Object.values(stages) as any[]) {
        const providers = stageData.providers || [];
        providers.forEach((p: string) => {
          const providerKey = p.toLowerCase() as ProviderType;
          if (stats[providerKey]) {
            stats[providerKey].total += stageData.attempts || 1;
          }
        });
      }
    });

    // Process failure events
    failuresSnap.docs.forEach((doc) => {
      const data = doc.data();
      const p = data.provider;
      if (p) {
        const providerKey = p.toLowerCase() as ProviderType;
        if (stats[providerKey]) {
          stats[providerKey].failed += 1;
          if (data.schemaErrorCount && data.schemaErrorCount > 0) {
            stats[providerKey].schemaErrors += 1;
          }
        }
      }
    });

    // Get current disabled state from Firestore
    const stateDocRef = db.collection("monitoring").doc("providerHealthState");
    const stateDoc = await stateDocRef.get();
    const currentState = stateDoc.exists
      ? (stateDoc.data() as Record<ProviderType, { disabledUntil?: string | null } | undefined>)
      : ({} as Record<ProviderType, { disabledUntil?: string | null }>);

    const updatedState: Record<string, unknown> = {};
    const alertsToSend: Array<{ provider: string; errorRate: number; total: number }> = [];

    const providers: ProviderType[] = ["gemini", "openai", "groq"];
    for (const provider of providers) {
      const providerStats = stats[provider];
      const currentDisabledUntil = currentState[provider]?.disabledUntil;
      const isDisabled = currentDisabledUntil ? new Date(currentDisabledUntil).getTime() > now : false;

      // Adjust total to be at least failures to avoid error rate > 1
      if (providerStats.total < providerStats.failed) {
        providerStats.total = providerStats.failed;
      }

      if (providerStats.total >= MIN_SAMPLES_FOR_DISABLE) {
        const errorRate = providerStats.failed / providerStats.total;
        functions.logger.info(`[ProviderHealthCheck] Provider ${provider}: ${providerStats.failed}/${providerStats.total} failed (${(errorRate * 100).toFixed(1)}% error rate)`);

        if (errorRate > ERROR_RATE_DISABLE_THRESHOLD && !isDisabled) {
          // Disable provider
          const until = now + DISABLE_FOR_MS;
          updatedState[provider] = {
            disabledUntil: new Date(until).toISOString(),
          };
          alertsToSend.push({ provider, errorRate, total: providerStats.total });
        }
      }

      // Re-enable if disabled window passed
      if (isDisabled && new Date(currentDisabledUntil!).getTime() <= now) {
        updatedState[provider] = {
          disabledUntil: null,
        };
        functions.logger.info(`[ProviderHealthCheck] Re-enabling provider ${provider} (disabled window expired)`);
        await alertManager.sendAlert(
          AlertSeverity.INFO,
          `AI Provider Re-enabled: ${provider}`,
          `The auto-disabled window for provider ${provider} has expired. It is now re-enabled for traffic.`,
        );
      }
    }

    // Write back updated state if changed
    if (Object.keys(updatedState).length > 0) {
      await stateDocRef.set(updatedState, { merge: true });
    }

    // Send critical alerts for any newly disabled providers
    for (const alert of alertsToSend) {
      await alertManager.sendAlert(
        AlertSeverity.CRITICAL,
        `AI Provider Disabled: ${alert.provider}`,
        `Provider ${alert.provider} has been automatically disabled for 30 minutes due to high error rate.\n\n` +
          `Error Rate: ${(alert.errorRate * 100).toFixed(1)}%\n` +
          `Recent Samples: ${alert.total}\n\n` +
          `Traffic will automatically fallback to other providers in the fallback chain.`,
      );
    }

  } catch (error) {
    functions.logger.error("[ProviderHealthCheck] Failed to run AI provider health check", error);
  }
};
