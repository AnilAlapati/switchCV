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
  failingServices: string[];
  lastAlertSent: FirebaseFirestore.Timestamp | null;
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
      return {
        name: "gemini_ai",
        status: "error",
        error: `API returned ${response.status}`,
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
    await emailService.verifyConnection();
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

  // Run all checks in parallel
  const results = await Promise.all([
    checkFirestore(db),
    checkGeminiAI(),
    checkEmail(),
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
      await alertManager.sendAlert(
        AlertSeverity.INFO,
        "Services recovered ✅",
        `Previously failing services have recovered: ${recoveredServices}. All systems operational.`,
        {
          recoveredServices: prevState.failingServices,
          downtime: prevState.consecutiveFailures * 30 + " minutes (approx)",
        },
      );
    }

    // Save healthy state
    await saveHealthState(db, {
      consecutiveFailures: 0,
      lastStatus: "ok",
      failingServices: [],
    });

    return { checked: true, status: "ok", services: results };
  }

  // Some services are failing
  const newConsecutiveFailures = prevState.consecutiveFailures + 1;
  const failingNames = failingServices.map((s) => s.name);

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
    failingServices: failingNames,
  });

  // Also store to monitoring timeseries for historical tracking
  try {
    const now = new Date();
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
