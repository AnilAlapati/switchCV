import { FieldPath } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const DEFAULT_DAYS = 7;
const MAX_DAYS = 30;

function clampInteger(
  rawValue: string | null,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number.parseInt(rawValue ?? "", 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, minimum), maximum);
}

function normalizeFirestoreValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeFirestoreValue(item));
  }

  if (value && typeof value === "object") {
    if ("toDate" in value && typeof value.toDate === "function") {
      const converted = value.toDate();
      return converted instanceof Date
        ? converted.toISOString()
        : normalizeFirestoreValue(converted);
    }

    return Object.entries(value).reduce<Record<string, unknown>>(
      (accumulator, [key, entry]) => {
        accumulator[key] = normalizeFirestoreValue(entry);
        return accumulator;
      },
      {},
    );
  }

  return value;
}

function serializeDoc<T extends Record<string, unknown>>(
  id: string,
  data: T,
): Record<string, unknown> {
  return {
    id,
    ...(normalizeFirestoreValue(data) as Record<string, unknown>),
  };
}

export interface AdminAiMonitoringQuery {
  requestId?: string | null;
  limit?: string | null;
  days?: string | null;
  stage?: string | null;
  failureCode?: string | null;
  provider?: string | null;
  model?: string | null;
}

export async function getAdminAiMonitoringData(
  query: AdminAiMonitoringQuery,
): Promise<Record<string, unknown>> {
  const limit = clampInteger(query.limit ?? null, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const days = clampInteger(query.days ?? null, DEFAULT_DAYS, 1, MAX_DAYS);
  const requestId = query.requestId ?? null;
  const stage = query.stage ?? null;
  const failureCode = query.failureCode ?? null;
  const provider = query.provider ?? null;
  const model = query.model ?? null;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const metricsPromise = adminDb
    .collection("monitoring")
    .doc("aiMetrics")
    .collection("daily")
    .orderBy(FieldPath.documentId(), "desc")
    .limit(days)
    .get();
  const alertStatePromise = adminDb
    .collection("monitoring")
    .doc("aiAlertState")
    .get();

  if (requestId) {
    const [summarySnap, eventsSnap, metricsSnap, alertStateSnap] =
      await Promise.all([
        adminDb
          .collection("monitoring")
          .doc("aiRequestSummaries")
          .collection("requests")
          .doc(requestId)
          .get(),
        adminDb
          .collection("monitoring")
          .doc("aiFailureEvents")
          .collection("events")
          .where("requestId", "==", requestId)
          .orderBy("createdAt", "desc")
          .limit(limit)
          .get(),
        metricsPromise,
        alertStatePromise,
      ]);

    return {
      requestTrace: {
        summary: summarySnap.exists
          ? serializeDoc(
              summarySnap.id,
              summarySnap.data() as Record<string, unknown>,
            )
          : null,
        events: eventsSnap.docs.map((doc) =>
          serializeDoc(doc.id, doc.data() as Record<string, unknown>),
        ),
      },
      dailyMetrics: metricsSnap.docs.map((doc) =>
        serializeDoc(doc.id, doc.data() as Record<string, unknown>),
      ),
      openIncidents: normalizeFirestoreValue(
        alertStateSnap.data()?.openIncidents ?? {},
      ),
    };
  }

  let failureQuery: FirebaseFirestore.Query = adminDb
    .collection("monitoring")
    .doc("aiFailureEvents")
    .collection("events")
    .where("createdAt", ">=", since);

  if (stage) {
    failureQuery = failureQuery.where("stage", "==", stage);
  }
  if (failureCode) {
    failureQuery = failureQuery.where("failureCode", "==", failureCode);
  }
  if (provider) {
    failureQuery = failureQuery.where("provider", "==", provider);
  }
  if (model) {
    failureQuery = failureQuery.where("model", "==", model);
  }

  const [failureEventsSnap, requestSummariesSnap, metricsSnap, alertStateSnap] =
    await Promise.all([
      failureQuery.orderBy("createdAt", "desc").limit(limit).get(),
      adminDb
        .collection("monitoring")
        .doc("aiRequestSummaries")
        .collection("requests")
        .where("completedAt", ">=", since)
        .orderBy("completedAt", "desc")
        .limit(limit)
        .get(),
      metricsPromise,
      alertStatePromise,
    ]);

  const dailyMetrics = metricsSnap.docs.map((doc) =>
    serializeDoc(doc.id, doc.data() as Record<string, unknown>),
  );
  const openIncidents = normalizeFirestoreValue(
    alertStateSnap.data()?.openIncidents ?? {},
  );

  return {
    overview: {
      days,
      latestDailyMetrics: dailyMetrics[0] ?? null,
      openIncidentCount: Object.keys(
        (openIncidents as Record<string, unknown>) ?? {},
      ).length,
    },
    failureEvents: failureEventsSnap.docs.map((doc) =>
      serializeDoc(doc.id, doc.data() as Record<string, unknown>),
    ),
    requestSummaries: requestSummariesSnap.docs.map((doc) =>
      serializeDoc(doc.id, doc.data() as Record<string, unknown>),
    ),
    dailyMetrics,
    openIncidents,
  };
}
