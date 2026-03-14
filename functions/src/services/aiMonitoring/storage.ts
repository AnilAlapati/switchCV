import * as admin from "firebase-admin";
import type {
  AIFailureEventDoc,
  AIRequestSummaryDoc,
  PersistedAIIncident,
} from "./types";
import {
  ALERT_COOLDOWN_MS,
  dailyMetricsCollection,
  DAILY_METRICS_RETENTION_MS,
  failureEventsCollection,
  RAW_EVENTS_RETENTION_MS,
  requestSummariesCollection,
  REQUEST_SUMMARY_RETENTION_MS,
  toDate,
} from "./types";

const MAX_QUERY_DOCS = 500;

export function shouldSendAlert(lastSentAt: Date | null, now: Date): boolean {
  if (!lastSentAt) {
    return true;
  }

  return now.getTime() - lastSentAt.getTime() >= ALERT_COOLDOWN_MS;
}

export async function readFailuresInWindow(
  db: FirebaseFirestore.Firestore,
  startTime: Date,
  endTime: Date,
): Promise<AIFailureEventDoc[]> {
  const snapshot = await failureEventsCollection(db)
    .where("createdAt", ">=", startTime)
    .where("createdAt", "<", endTime)
    .orderBy("createdAt", "desc")
    .limit(MAX_QUERY_DOCS)
    .get();

  return snapshot.docs.map((doc) => doc.data() as AIFailureEventDoc);
}

export async function readSummariesInWindow(
  db: FirebaseFirestore.Firestore,
  startTime: Date,
  endTime: Date,
): Promise<AIRequestSummaryDoc[]> {
  const snapshot = await requestSummariesCollection(db)
    .where("completedAt", ">=", startTime)
    .where("completedAt", "<", endTime)
    .orderBy("completedAt", "desc")
    .limit(MAX_QUERY_DOCS)
    .get();

  return snapshot.docs.map((doc) => doc.data() as AIRequestSummaryDoc);
}

export function normalizeOpenIncidents(
  incidents: Record<string, PersistedAIIncident> | undefined,
): Record<string, PersistedAIIncident> {
  return Object.entries(incidents ?? {}).reduce<
    Record<string, PersistedAIIncident>
  >((accumulator, [key, incident]) => {
    accumulator[key] = {
      ...incident,
      startedAt: toDate(incident.startedAt) ?? new Date(),
      lastSeenAt: toDate(incident.lastSeenAt) ?? new Date(),
      lastSentAt: toDate(incident.lastSentAt) ?? undefined,
      recoveryCandidateAt: toDate(incident.recoveryCandidateAt) ?? null,
    };
    return accumulator;
  }, {});
}

async function cleanupCollectionByDate(
  query: FirebaseFirestore.Query,
): Promise<number> {
  const snapshot = await query.limit(200).get();
  if (snapshot.empty) {
    return 0;
  }

  const batch = admin.firestore().batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  return snapshot.size;
}

export async function cleanupAiMonitoringCollections(
  db: FirebaseFirestore.Firestore,
  now: Date,
): Promise<{
  rawEventsDeleted: number;
  requestSummariesDeleted: number;
  dailyMetricsDeleted: number;
}> {
  const rawEventsCutoff = new Date(now.getTime() - RAW_EVENTS_RETENTION_MS);
  const requestSummaryCutoff = new Date(
    now.getTime() - REQUEST_SUMMARY_RETENTION_MS,
  );
  const dailyMetricsCutoff = new Date(now.getTime() - DAILY_METRICS_RETENTION_MS);

  const [rawEventsDeleted, requestSummariesDeleted, dailyMetricsDeleted] =
    await Promise.all([
      cleanupCollectionByDate(
        failureEventsCollection(db)
          .where("createdAt", "<", rawEventsCutoff)
          .orderBy("createdAt", "asc"),
      ),
      cleanupCollectionByDate(
        requestSummariesCollection(db)
          .where("completedAt", "<", requestSummaryCutoff)
          .orderBy("completedAt", "asc"),
      ),
      cleanupCollectionByDate(
        dailyMetricsCollection(db)
          .where("updatedAt", "<", dailyMetricsCutoff)
          .orderBy("updatedAt", "asc"),
      ),
    ]);

  return {
    rawEventsDeleted,
    requestSummariesDeleted,
    dailyMetricsDeleted,
  };
}
