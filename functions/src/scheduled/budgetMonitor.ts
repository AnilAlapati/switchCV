/**
 * Scheduled Cloud Function for Budget Monitoring
 *
 * Runs hourly to check current month spending against budget caps.
 * Sends email alerts when spending exceeds warning/critical thresholds.
 *
 * Budget Caps (from billingService):
 *   - basic:      $0.10/month
 *   - premium:    $30/month
 *   - enterprise: $70/month
 *
 * Alert Thresholds:
 *   - 50%  → INFO (logged only)
 *   - 70%  → WARNING email
 *   - 90%  → CRITICAL email
 *   - 100% → CRITICAL email + flag for shutdown
 */

import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { alertManager, AlertSeverity } from "../utils/monitoring";

/** Billing constants — keep in sync with src/lib/services/billingService.ts */
const SHARD_COLLECTION = "system/billing/shards";
const DASHBOARD_COLLECTION = "system/billing/dashboard";
const ALERT_STATE_DOC = "system/billing/alertState";

/** Default system-wide monthly cap (enterprise tier) */
const SYSTEM_BUDGET_CAP = parseFloat(process.env.SYSTEM_BUDGET_CAP || "70");

/** Alert thresholds as fractions (0-1) */
const THRESHOLDS = {
  INFO: 0.5,
  WARNING: 0.7,
  CRITICAL: 0.9,
  SHUTDOWN: 1.0,
};

interface AlertState {
  lastAlertLevel: string | null;
  lastAlertTimestamp: FirebaseFirestore.Timestamp | null;
  monthKey: string;
}

/**
 * Get the current YYYY-MM key
 */
function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

/**
 * Read total cost from billing shards (source of truth)
 */
async function getTotalCostFromShards(
  db: FirebaseFirestore.Firestore,
): Promise<number> {
  const shardsSnapshot = await db.collection(SHARD_COLLECTION).get();
  let totalCost = 0;

  shardsSnapshot.forEach((doc) => {
    const data = doc.data();
    totalCost += data.monthCost || 0;
  });

  return totalCost;
}

/**
 * Determine the highest threshold breached
 */
function getAlertLevel(
  ratio: number,
): { level: string; severity: AlertSeverity } | null {
  if (ratio >= THRESHOLDS.SHUTDOWN) {
    return { level: "SHUTDOWN", severity: AlertSeverity.CRITICAL };
  }
  if (ratio >= THRESHOLDS.CRITICAL) {
    return { level: "CRITICAL", severity: AlertSeverity.CRITICAL };
  }
  if (ratio >= THRESHOLDS.WARNING) {
    return { level: "WARNING", severity: AlertSeverity.WARNING };
  }
  if (ratio >= THRESHOLDS.INFO) {
    return { level: "INFO", severity: AlertSeverity.INFO };
  }
  return null;
}

/**
 * Load previous alert state to avoid spamming the same alert
 */
async function getAlertState(
  db: FirebaseFirestore.Firestore,
  monthKey: string,
): Promise<AlertState> {
  try {
    const doc = await db.doc(ALERT_STATE_DOC).get();
    if (doc.exists) {
      const data = doc.data() as AlertState;
      // Reset if it's a new month
      if (data.monthKey !== monthKey) {
        return {
          lastAlertLevel: null,
          lastAlertTimestamp: null,
          monthKey,
        };
      }
      return data;
    }
  } catch (error) {
    functions.logger.warn("Could not read alert state, continuing", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    lastAlertLevel: null,
    lastAlertTimestamp: null,
    monthKey,
  };
}

/**
 * Persist alert state to prevent duplicate alerts at the same level
 */
async function saveAlertState(
  db: FirebaseFirestore.Firestore,
  state: AlertState,
): Promise<void> {
  try {
    await db.doc(ALERT_STATE_DOC).set(state, { merge: true });
  } catch (error) {
    functions.logger.error("Could not save alert state", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Check if we should send an alert (not already sent at this level this month)
 */
function shouldAlert(
  currentLevel: string,
  previousLevel: string | null,
): boolean {
  const ORDER = ["INFO", "WARNING", "CRITICAL", "SHUTDOWN"];
  const currentIndex = ORDER.indexOf(currentLevel);
  const previousIndex = previousLevel ? ORDER.indexOf(previousLevel) : -1;

  // Only alert if we've escalated to a higher level
  return currentIndex > previousIndex;
}

/**
 * Main budget monitoring handler
 */
export const budgetMonitorHandler = async (
  context: functions.EventContext,
): Promise<{ checked: boolean; totalCost?: number; ratio?: number }> => {
  const db = admin.firestore();
  const monthKey = getCurrentMonthKey();

  try {
    // 1. Read total spending from shards
    const totalCost = await getTotalCostFromShards(db);
    const ratio = totalCost / SYSTEM_BUDGET_CAP;
    const percentage = (ratio * 100).toFixed(1);

    functions.logger.info("Budget monitor check", {
      monthKey,
      totalCost: `$${totalCost.toFixed(4)}`,
      budgetCap: `$${SYSTEM_BUDGET_CAP}`,
      usage: `${percentage}%`,
    });

    // 2. Determine alert level
    const alertInfo = getAlertLevel(ratio);

    if (!alertInfo) {
      // Under 50% — no action needed
      return { checked: true, totalCost, ratio };
    }

    // 3. Check if we already alerted at this level
    const state = await getAlertState(db, monthKey);

    if (!shouldAlert(alertInfo.level, state.lastAlertLevel)) {
      functions.logger.info("Budget alert already sent at this level", {
        level: alertInfo.level,
        previousLevel: state.lastAlertLevel,
      });
      return { checked: true, totalCost, ratio };
    }

    // 4. Send the alert
    const title = `Budget ${alertInfo.level}: ${percentage}% of monthly cap used`;
    const message =
      alertInfo.level === "SHUTDOWN"
        ? `URGENT: Monthly spending ($${totalCost.toFixed(2)}) has reached the $${SYSTEM_BUDGET_CAP} cap. ` +
          `AI features should be disabled to prevent over-budget spending.`
        : `Monthly spending is $${totalCost.toFixed(2)} out of $${SYSTEM_BUDGET_CAP} budget (${percentage}%). ` +
          `Monitor closely to avoid exceeding the cap.`;

    await alertManager.sendAlert(alertInfo.severity, title, message, {
      monthKey,
      totalCost,
      budgetCap: SYSTEM_BUDGET_CAP,
      usagePercent: percentage,
      alertLevel: alertInfo.level,
    });

    // 5. Update dashboard doc with alert info
    await db
      .collection(DASHBOARD_COLLECTION)
      .doc(monthKey)
      .set(
        {
          totalCost,
          budgetCap: SYSTEM_BUDGET_CAP,
          usagePercent: parseFloat(percentage),
          lastChecked: admin.firestore.FieldValue.serverTimestamp(),
          alertLevel: alertInfo.level,
        },
        { merge: true },
      );

    // 6. Save alert state so we don't re-send at this level
    await saveAlertState(db, {
      lastAlertLevel: alertInfo.level,
      lastAlertTimestamp:
        admin.firestore.FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
      monthKey,
    });

    functions.logger.warn(`Budget alert sent: ${alertInfo.level}`, {
      totalCost,
      budgetCap: SYSTEM_BUDGET_CAP,
    });

    return { checked: true, totalCost, ratio };
  } catch (error) {
    functions.logger.error("Budget monitor failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Alert on monitor failure itself — this is critical infrastructure
    try {
      await alertManager.sendAlert(
        AlertSeverity.ERROR,
        "Budget monitor failed",
        `The hourly budget monitoring function encountered an error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { monthKey },
      );
    } catch {
      // Last resort — just log
      functions.logger.error("Failed to send budget monitor failure alert");
    }

    throw error;
  }
};
