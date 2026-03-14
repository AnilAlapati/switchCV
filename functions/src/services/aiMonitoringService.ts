import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { emailService } from "./emailService";
import { buildDailyMetrics, detectActiveIncidents } from "./aiMonitoring/analytics";
import { sendIncidentEmail, sendRecoveryEmail } from "./aiMonitoring/notifications";
import {
  cleanupAiMonitoringCollections,
  normalizeOpenIncidents,
  readFailuresInWindow,
  readSummariesInWindow,
  shouldSendAlert,
} from "./aiMonitoring/storage";
import {
  alertStateDoc,
  cleanObject,
  dailyMetricsCollection,
  dateKeyForUtc,
  endOfUtcDay,
  RECOVERY_STABILITY_MS,
  startOfUtcDay,
  SUPPORT_EMAIL,
  topEntries,
} from "./aiMonitoring/types";
import type { AIAlertStateDoc, PersistedAIIncident } from "./aiMonitoring/types";
export { buildDailyMetrics, detectActiveIncidents } from "./aiMonitoring/analytics";
export type {
  AIDailyMetricsDoc,
  AIFailureEventDoc,
  AIIncident,
  AIRequestStageSummary,
  AIRequestSummaryDoc,
  AIAlertStateDoc,
} from "./aiMonitoring/types";

export async function aggregateAiMonitoring(): Promise<{
  alertsSent: number;
  recoveriesSent: number;
  activeIncidents: number;
  dateKey: string;
}> {
  const db = admin.firestore();
  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);
  const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dayStart = startOfUtcDay(now);
  const stateSnapshot = await alertStateDoc(db).get();
  const rawState = stateSnapshot.exists
    ? (stateSnapshot.data() as AIAlertStateDoc)
    : {};
  const openIncidents = normalizeOpenIncidents(rawState.openIncidents);

  const [
    failures15m,
    summaries15m,
    summaries60m,
    dayFailures,
    daySummaries,
  ] = await Promise.all([
    readFailuresInWindow(db, fifteenMinutesAgo, now),
    readSummariesInWindow(db, fifteenMinutesAgo, now),
    readSummariesInWindow(db, sixtyMinutesAgo, now),
    readFailuresInWindow(db, dayStart, now),
    readSummariesInWindow(db, dayStart, now),
  ]);

  const dailyMetrics = buildDailyMetrics(daySummaries, dayFailures, now);
  const dateKey = dateKeyForUtc(now);

  await dailyMetricsCollection(db)
    .doc(dateKey)
    .set(
      cleanObject({
        ...dailyMetrics,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }) as Record<string, unknown>,
      { merge: true },
    );

  const activeIncidents = detectActiveIncidents({
    failures15m,
    summaries15m,
    summaries60m,
  });
  const activeIncidentMap = new Map(
    activeIncidents.map((incident) => [incident.key, incident]),
  );

  let alertsSent = 0;
  let recoveriesSent = 0;
  const nextOpenIncidents: Record<string, PersistedAIIncident> = {};
  const nextLastSentByAlertKey = {
    ...(rawState.lastSentByAlertKey ?? {}),
  };

  for (const incident of activeIncidents) {
    const existing = openIncidents[incident.key];
    const persistedIncident: PersistedAIIncident = {
      ...incident,
      startedAt: existing?.startedAt ?? now,
      lastSeenAt: now,
      lastSentAt: existing?.lastSentAt,
      recoveryCandidateAt: null,
    };

    if (shouldSendAlert(existing?.lastSentAt ?? null, now)) {
      await sendIncidentEmail(incident, now);
      alertsSent += 1;
      persistedIncident.lastSentAt = now;
      nextLastSentByAlertKey[incident.key] = now;
    }

    nextOpenIncidents[incident.key] = persistedIncident;
  }

  for (const [key, incident] of Object.entries(openIncidents)) {
    if (activeIncidentMap.has(key)) {
      continue;
    }

    if (!incident.recoveryCandidateAt) {
      nextOpenIncidents[key] = {
        ...incident,
        recoveryCandidateAt: now,
      };
      continue;
    }

    const recoveryReady =
      now.getTime() - incident.recoveryCandidateAt.getTime() >=
      RECOVERY_STABILITY_MS;

    if (!recoveryReady) {
      nextOpenIncidents[key] = incident;
      continue;
    }

    await sendRecoveryEmail(incident, now);
    recoveriesSent += 1;
  }

  await alertStateDoc(db).set(
    cleanObject({
      lastSentByAlertKey: nextLastSentByAlertKey,
      openIncidents: nextOpenIncidents,
      lastHourlySummaryAt: now,
    }) as Record<string, unknown>,
    { merge: true },
  );

  return {
    alertsSent,
    recoveriesSent,
    activeIncidents: activeIncidents.length,
    dateKey,
  };
}

export async function sendAiMonitoringDigest(): Promise<{
  sent: boolean;
  dateKey: string;
  unresolvedIncidents: number;
}> {
  const db = admin.firestore();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dayStart = startOfUtcDay(yesterday);
  const dayEnd = endOfUtcDay(yesterday);
  const [failures, summaries, stateSnapshot] = await Promise.all([
    readFailuresInWindow(db, dayStart, dayEnd),
    readSummariesInWindow(db, dayStart, dayEnd),
    alertStateDoc(db).get(),
  ]);

  const metrics = buildDailyMetrics(summaries, failures, now);
  const dateKey = dateKeyForUtc(yesterday);
  const state = stateSnapshot.exists
    ? (stateSnapshot.data() as AIAlertStateDoc)
    : {};
  const openIncidents = normalizeOpenIncidents(state.openIncidents);

  const topFailureCodes = topEntries(metrics.failureCountsByCode, 5);
  const topFailingModels = topEntries(metrics.failureCountsByModel, 5);
  const unresolvedIncidentKeys = Object.keys(openIncidents);

  const html = `
    <h2>AI health summary for ${dateKey}</h2>
    <ul>
      <li><strong>Total AI requests:</strong> ${metrics.totalRequests}</li>
      <li><strong>Successful:</strong> ${metrics.successfulRequests}</li>
      <li><strong>Degraded:</strong> ${metrics.degradedRequests}</li>
      <li><strong>Failed:</strong> ${metrics.failedRequests}</li>
      <li><strong>User-visible failures:</strong> ${metrics.userVisibleFailures}</li>
      <li><strong>Fallback-recovered requests:</strong> ${metrics.fallbackRecoveredRequests}</li>
      <li><strong>Average extraction latency:</strong> ${metrics.avgLatencyByStage.extraction} ms</li>
    </ul>
    <h3>Top failure codes</h3>
    <ul>${topFailureCodes.map((entry) => `<li>${entry}</li>`).join("") || "<li>None</li>"}</ul>
    <h3>Top failing models</h3>
    <ul>${topFailingModels.map((entry) => `<li>${entry}</li>`).join("") || "<li>None</li>"}</ul>
    <h3>Unresolved incidents</h3>
    <ul>${unresolvedIncidentKeys.map((key) => `<li>${key}</li>`).join("") || "<li>None</li>"}</ul>
  `;
  const text = [
    `AI health summary for ${dateKey}`,
    `Total requests: ${metrics.totalRequests}`,
    `Successful: ${metrics.successfulRequests}`,
    `Degraded: ${metrics.degradedRequests}`,
    `Failed: ${metrics.failedRequests}`,
    `User-visible failures: ${metrics.userVisibleFailures}`,
    `Fallback-recovered requests: ${metrics.fallbackRecoveredRequests}`,
    `Top failure codes: ${topFailureCodes.join(", ") || "None"}`,
    `Top failing models: ${topFailingModels.join(", ") || "None"}`,
    `Unresolved incidents: ${unresolvedIncidentKeys.join(", ") || "None"}`,
  ].join("\n");

  await emailService.sendCustomEmail({
    to: SUPPORT_EMAIL,
    subject: `[SWITCHCV DAILY] AI health summary (${dateKey})`,
    html,
    text,
  });

  await alertStateDoc(db).set(
    {
      lastDigestSentAt: now,
    },
    { merge: true },
  );

  return {
    sent: true,
    dateKey,
    unresolvedIncidents: unresolvedIncidentKeys.length,
  };
}

export async function cleanupAiMonitoringData(): Promise<{
  rawEventsDeleted: number;
  requestSummariesDeleted: number;
  dailyMetricsDeleted: number;
}> {
  const db = admin.firestore();
  const now = new Date();
  const {
    rawEventsDeleted,
    requestSummariesDeleted,
    dailyMetricsDeleted,
  } = await cleanupAiMonitoringCollections(db, now);

  functions.logger.info("AI monitoring cleanup completed", {
    rawEventsDeleted,
    requestSummariesDeleted,
    dailyMetricsDeleted,
  });

  return {
    rawEventsDeleted,
    requestSummariesDeleted,
    dailyMetricsDeleted,
  };
}
