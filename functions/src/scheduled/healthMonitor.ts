/**
 * Scheduled Cloud Function for Production Health Monitoring
 *
 * Runs every 30 minutes to check the health of critical services
 * (Firestore, Gemini AI, SMTP) and emails you if anything is down.
 *
 * Uses the same checks as /api/health but runs server-side in
 * Cloud Functions — no external dependency needed.
 *
 * Only runs in production (guarded by isProductionEnvironment check in index.ts).
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { alertManager, AlertSeverity } from "../utils/monitoring";
import { emailService } from "../services/emailService";

/** How many consecutive failures before we send an alert */
const FAILURE_THRESHOLD = 1;

/** State doc to track consecutive failures and avoid alert spam */
const HEALTH_STATE_DOC = "monitoring/healthCheckState";

interface ServiceCheckResult {
  name: string;
  status: "ok" | "error";
  latencyMs?: number;
  error?: string;
}

interface HealthState {
  consecutiveFailures: number;
  lastStatus: "ok" | "degraded";
  lastChecked: FirebaseFirestore.Timestamp | null;
  failureStartedAt: FirebaseFirestore.Timestamp | null;
  failingServices: string[];
  lastAlertSent: FirebaseFirestore.Timestamp | null;
}

const MAX_ERROR_DETAIL_LENGTH = 200;

function summarizeHttpError(status: number, rawBody: string): string {
  const body = rawBody.trim();
  if (!body) {
    return `API returned ${status}`;
  }

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    const message = parsed.error?.message?.trim();
    if (message) {
      const truncated =
        message.length > MAX_ERROR_DETAIL_LENGTH
          ? `${message.slice(0, MAX_ERROR_DETAIL_LENGTH)}...`
          : message;
      return `API returned ${status}: ${truncated}`;
    }
  } catch {
    // Fall through to plain-text summarization.
  }

  const normalized = body.replace(/\s+/g, " ");
  const truncated =
    normalized.length > MAX_ERROR_DETAIL_LENGTH
      ? `${normalized.slice(0, MAX_ERROR_DETAIL_LENGTH)}...`
      : normalized;
  return `API returned ${status}: ${truncated}`;
}

function computeApproxDowntimeMinutes(
  failureStartedAt: FirebaseFirestore.Timestamp | null | undefined,
  consecutiveFailures: number,
  now: Date,
): number {
  const failureStartedDate = failureStartedAt?.toDate?.();
  if (failureStartedDate instanceof Date && !Number.isNaN(failureStartedDate.valueOf())) {
    return Math.max(
      1,
      Math.round((now.getTime() - failureStartedDate.getTime()) / (60 * 1000)),
    );
  }

  return Math.max(1, consecutiveFailures * 30);
}

/**
 * Check Firestore connectivity
 */
async function checkFirestore(
  db: FirebaseFirestore.Firestore,
): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    await db.collection("monitoring").limit(1).get();
    return {
      name: "firestore",
      status: "ok",
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "firestore",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check Gemini AI API availability
 */
async function checkGeminiAI(): Promise<ServiceCheckResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      name: "gemini_ai",
      status: "error",
      error: "GEMINI_API_KEY not configured",
    };
  }

  const start = Date.now();
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: "GET" },
    );

    if (!response.ok) {
      const error = summarizeHttpError(response.status, await response.text());
      functions.logger.warn("Gemini AI health check failed", {
        statusCode: response.status,
        error,
      });
      return {
        name: "gemini_ai",
        status: "error",
        error,
      };
    }

    return {
      name: "gemini_ai",
      status: "ok",
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "gemini_ai",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check SMTP email connectivity
 */
async function checkEmail(): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    const isConnected = await emailService.verifyConnection();
    if (!isConnected) {
      return {
        name: "email_smtp",
        status: "error",
        error: "SMTP verification failed",
      };
    }

    return {
      name: "email_smtp",
      status: "ok",
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "email_smtp",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check AI Monitoring pipeline health
 * 
 * Verifies that the scheduled aggregateAiMonitoring function is
 * successfully persisting data. If lastHourlySummaryAt is missing
 * or older than 2 hours, the monitoring pipeline is down.
 */
async function checkAiMonitoring(
  db: FirebaseFirestore.Firestore,
  now: Date,
): Promise<ServiceCheckResult> {
  const start = Date.now();
  try {
    const stateDoc = await db.collection("monitoring").doc("aiAlertState").get();
    if (!stateDoc.exists) {
      return {
        name: "ai_monitoring_pipeline",
        status: "ok", // Hasn't initialized yet, or no traffic
        latencyMs: Date.now() - start,
      };
    }

    const state = stateDoc.data() || {};
    const lastHourlySummaryAt = state.lastHourlySummaryAt;

    if (!lastHourlySummaryAt) {
      // Possible that it just hasn't run yet, but if the doc exists it should be there.
      // We will let it pass if no traffic triggered an update.
      return {
        name: "ai_monitoring_pipeline",
        status: "ok",
        latencyMs: Date.now() - start,
      };
    }

    const lastSummaryDate = lastHourlySummaryAt.toDate?.() || new Date(lastHourlySummaryAt);
    if (!(lastSummaryDate instanceof Date) || Number.isNaN(lastSummaryDate.valueOf())) {
      return {
        name: "ai_monitoring_pipeline",
        status: "error",
        error: "aiAlertState.lastHourlySummaryAt is not a valid date",
      };
    }

    // Pipeline runs every 15 mins. If it's been > 2 hours, it's definitively broken.
    const hoursSinceLastSummary = (now.getTime() - lastSummaryDate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceLastSummary > 2) {
      return {
        name: "ai_monitoring_pipeline",
        status: "error",
        error: `AI monitoring aggregation hasn't run in ${hoursSinceLastSummary.toFixed(1)} hours. The scheduled function might be failing.`,
      };
    }

    return {
      name: "ai_monitoring_pipeline",
      status: "ok",
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      name: "ai_monitoring_pipeline",
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Load previous health state
 */
async function getHealthState(
  db: FirebaseFirestore.Firestore,
): Promise<HealthState> {
  try {
    const doc = await db.doc(HEALTH_STATE_DOC).get();
    if (doc.exists) {
      return doc.data() as HealthState;
    }
  } catch (error) {
    functions.logger.warn("Could not read health state", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    consecutiveFailures: 0,
    lastStatus: "ok",
    lastChecked: null,
    failureStartedAt: null,
    failingServices: [],
    lastAlertSent: null,
  };
}

/**
 * Save health state
 */
async function saveHealthState(
  db: FirebaseFirestore.Firestore,
  state: Partial<HealthState>,
): Promise<void> {
  try {
    await db.doc(HEALTH_STATE_DOC).set(
      {
        ...state,
        lastChecked: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  } catch (error) {
    functions.logger.error("Could not save health state", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Main health monitoring handler
 */
export const healthMonitorHandler = async (
  context: functions.EventContext,
): Promise<{
  checked: boolean;
  status: "ok" | "degraded";
  services: ServiceCheckResult[];
}> => {
  const db = admin.firestore();
  const checkedAt = new Date();

  // Run all checks in parallel
  const results = await Promise.all([
    checkFirestore(db),
    checkGeminiAI(),
    checkEmail(),
    checkAiMonitoring(db, checkedAt),
  ]);

  const failingServices = results.filter((r) => r.status === "error");
  const allHealthy = failingServices.length === 0;
  const overallStatus = allHealthy ? "ok" : "degraded";

  functions.logger.info("Health monitor check completed", {
    status: overallStatus,
    services: results.map((r) => ({
      name: r.name,
      status: r.status,
      latencyMs: r.latencyMs,
    })),
  });

  // Load previous state
  const prevState = await getHealthState(db);

  if (allHealthy) {
    // Everything OK — if we were previously failing, send recovery email
    if (
      prevState.lastStatus === "degraded" &&
      prevState.consecutiveFailures > 0
    ) {
      const recoveredServices = prevState.failingServices.join(", ");
      const downtimeMinutes = computeApproxDowntimeMinutes(
        prevState.failureStartedAt,
        prevState.consecutiveFailures,
        checkedAt,
      );
      await alertManager.sendAlert(
        AlertSeverity.INFO,
        "Services recovered ✅",
        `Previously failing services have recovered: ${recoveredServices}. All systems operational.`,
        {
          recoveredServices: prevState.failingServices,
          downtime: `${downtimeMinutes} minutes (approx)`,
        },
      );
    }

    // Save healthy state
    await saveHealthState(db, {
      consecutiveFailures: 0,
      lastStatus: "ok",
      failureStartedAt: null,
      failingServices: [],
    });

    return { checked: true, status: "ok", services: results };
  }

  // Some services are failing
  const newConsecutiveFailures = prevState.consecutiveFailures + 1;
  const failingNames = failingServices.map((s) => s.name);
  const failureStartedAt =
    prevState.lastStatus === "degraded" && prevState.failureStartedAt
      ? prevState.failureStartedAt
      : admin.firestore.Timestamp.fromDate(checkedAt);

  // Only alert after threshold AND don't spam (alert every 3rd failure after the first)
  const shouldSendAlert =
    newConsecutiveFailures >= FAILURE_THRESHOLD &&
    (newConsecutiveFailures === FAILURE_THRESHOLD ||
      newConsecutiveFailures % 3 === 0);

  if (shouldSendAlert) {
    const severity =
      failingServices.length >= 2
        ? AlertSeverity.CRITICAL
        : AlertSeverity.WARNING;

    const serviceDetails = failingServices
      .map((s) => `• ${s.name}: ${s.error}`)
      .join("\n");

    await alertManager.sendAlert(
      severity,
      `Production services degraded: ${failingNames.join(", ")}`,
      `${failingServices.length} of ${results.length} services are failing:\n\n${serviceDetails}\n\n` +
      `Consecutive failures: ${newConsecutiveFailures}`,
      {
        failingServices: failingNames,
        consecutiveFailures: newConsecutiveFailures,
        serviceDetails: failingServices.map((s) => ({
          name: s.name,
          error: s.error,
        })),
      },
    );
  }

  // Save degraded state
  await saveHealthState(db, {
    consecutiveFailures: newConsecutiveFailures,
    lastStatus: "degraded",
    failureStartedAt,
    failingServices: failingNames,
  });

  // Also store to monitoring timeseries for historical tracking
  try {
    const now = checkedAt;
    const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    await db
      .collection("monitoring")
      .doc("healthChecks")
      .collection("history")
      .doc(dateKey)
      .set(
        {
          checks: admin.firestore.FieldValue.arrayUnion({
            timestamp: now.toISOString(),
            status: overallStatus,
            services: results.map((r) => ({
              name: r.name,
              status: r.status,
              latencyMs: r.latencyMs || null,
            })),
          }),
        },
        { merge: true },
      );
  } catch (error) {
    // Non-critical — don't fail the health check if history write fails
    functions.logger.warn("Could not write health check history", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return { checked: true, status: "degraded", services: results };
};
