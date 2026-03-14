/**
 * Monitor-on-monitor: detects when the AI monitoring pipeline itself goes stale.
 *
 * Runs daily.  Checks:
 * 1. `aggregateAiMonitoring` last ran within 2 hours
 * 2. `sendAiMonitoringDigest` last ran within 36 hours
 * 3. Today's daily-metrics doc exists and is fresh
 *
 * Sends an alert email to support if any check fails.
 */
import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { emailService } from "../services/emailService";
import { SUPPORT_EMAIL, alertStateDoc, dailyMetricsCollection, dateKeyForUtc, toDate } from "../services/aiMonitoring/types";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THIRTY_SIX_HOURS_MS = 36 * 60 * 60 * 1000;

export async function monitorAiMonitoringHealthHandler(
  _context: functions.EventContext,
): Promise<void> {
  const now = new Date();
  const db = admin.firestore();
  const issues: string[] = [];

  try {
    // 1. Check alert-state doc for aggregation freshness
    const alertSnap = await alertStateDoc(db).get();
    const alertData = alertSnap.data();

    if (!alertData) {
      issues.push("Alert state document does not exist — aggregation may never have run.");
    } else {
      const lastAggregation = toDate(alertData.lastHourlySummaryAt);
      if (!lastAggregation) {
        issues.push("lastHourlySummaryAt is missing — aggregation may never have run.");
      } else if (now.getTime() - lastAggregation.getTime() > TWO_HOURS_MS) {
        const hoursAgo = ((now.getTime() - lastAggregation.getTime()) / 3_600_000).toFixed(1);
        issues.push(
          `aggregateAiMonitoring last ran ${hoursAgo}h ago (threshold: 2h). Last: ${lastAggregation.toISOString()}`,
        );
      }

      const lastDigest = toDate(alertData.lastDigestSentAt);
      if (!lastDigest) {
        issues.push("lastDigestSentAt is missing — digest may never have run.");
      } else if (now.getTime() - lastDigest.getTime() > THIRTY_SIX_HOURS_MS) {
        const hoursAgo = ((now.getTime() - lastDigest.getTime()) / 3_600_000).toFixed(1);
        issues.push(
          `sendAiMonitoringDigest last ran ${hoursAgo}h ago (threshold: 36h). Last: ${lastDigest.toISOString()}`,
        );
      }
    }

    // 2. Check today's daily-metrics document
    const todayKey = dateKeyForUtc(now);
    const metricsSnap = await dailyMetricsCollection(db).doc(todayKey).get();
    if (!metricsSnap.exists) {
      issues.push(`Daily metrics document for ${todayKey} does not exist.`);
    } else {
      const updatedAt = toDate(metricsSnap.data()?.updatedAt);
      if (updatedAt && now.getTime() - updatedAt.getTime() > TWO_HOURS_MS) {
        const hoursAgo = ((now.getTime() - updatedAt.getTime()) / 3_600_000).toFixed(1);
        issues.push(
          `Daily metrics for ${todayKey} last updated ${hoursAgo}h ago (threshold: 2h).`,
        );
      }
    }

    if (issues.length === 0) {
      functions.logger.info("[MonitorHealth] All AI monitoring checks passed.");
      return;
    }

    // Send alert
    functions.logger.warn(
      `[MonitorHealth] ${issues.length} issue(s) detected`,
      { issues },
    );

    const issueList = issues.map((i) => `<li>${i}</li>`).join("");
    const subject = "[SWITCHCV ALERT] AI monitoring pipeline may be stale";
    const html = `
      <h2>AI Monitoring Health Check Failed</h2>
      <p>The following issues were detected at ${now.toISOString()}:</p>
      <ul>${issueList}</ul>
      <p>Please check the Cloud Functions logs for <code>aggregateAiMonitoring</code> and <code>sendAiMonitoringDigest</code>.</p>
    `;
    const text = [
      "AI Monitoring Health Check Failed",
      `Detected at: ${now.toISOString()}`,
      "",
      ...issues.map((i) => `- ${i}`),
      "",
      "Check Cloud Functions logs for aggregateAiMonitoring and sendAiMonitoringDigest.",
    ].join("\n");

    await emailService.sendCustomEmail({
      to: SUPPORT_EMAIL,
      subject,
      html,
      text,
    });

    functions.logger.info("[MonitorHealth] Alert email sent to admin.");
  } catch (error) {
    functions.logger.error("[MonitorHealth] Health check failed:", error);
  }
}
