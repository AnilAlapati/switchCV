type TimestampLike =
  | FirebaseFirestore.Timestamp
  | Date
  | { toDate: () => Date }
  | null
  | undefined;

export interface AIFailureEventDoc {
  requestId: string;
  stage: "extraction" | "generation" | "repair" | string;
  provider?: string;
  model?: string;
  failureCode: string;
  errorMessage: string;
  httpStatus?: number;
  latencyMs?: number;
  fallbackUsed?: boolean;
  fallbackSucceeded?: boolean;
  userTier?: string;
  environment?: string;
  deployVersion?: string;
  createdAt?: TimestampLike;
  conversationTurn?: number;
}

export interface AIRequestStageSummary {
  status?: "success" | "degraded" | "failed";
  attempts?: number;
  failureCount?: number;
  fallbackUsed?: boolean;
  fallbackSucceeded?: boolean;
  failureCodes?: string[];
  providers?: string[];
  models?: string[];
  latencyMs?: number;
}

export interface AIRequestSummaryDoc {
  requestId: string;
  entrypoint: string;
  startedAt?: TimestampLike;
  completedAt?: TimestampLike;
  durationMs?: number;
  status: "success" | "degraded" | "failed";
  userVisibleFailure: boolean;
  failureCount: number;
  fallbackCount: number;
  stages?: Partial<
    Record<"extraction" | "generation" | "repair", AIRequestStageSummary>
  >;
  finalOutcome?: string;
  createdResume?: boolean;
  environment?: string;
  deployVersion?: string;
}

export interface AIDailyMetricsDoc {
  totalRequests: number;
  successfulRequests: number;
  degradedRequests: number;
  failedRequests: number;
  userVisibleFailures: number;
  fallbackRecoveredRequests: number;
  extractionFailures: number;
  generationFailures: number;
  repairFailures: number;
  failureCountsByCode: Record<string, number>;
  failureCountsByProvider: Record<string, number>;
  failureCountsByModel: Record<string, number>;
  avgLatencyByStage: Record<string, number>;
  updatedAt: Date;
}

export interface AIIncident {
  key: string;
  severity: "critical" | "warning";
  title: string;
  summary: string;
  requestIds: string[];
  details: Record<string, number | string>;
}

export interface PersistedAIIncident extends AIIncident {
  startedAt: Date;
  lastSeenAt: Date;
  lastSentAt?: Date;
  recoveryCandidateAt?: Date | null;
}

export interface AIAlertStateDoc {
  lastSentByAlertKey?: Record<string, TimestampLike>;
  openIncidents?: Record<string, PersistedAIIncident>;
  lastDigestSentAt?: TimestampLike;
  lastHourlySummaryAt?: TimestampLike;
}

export interface AggregationWindowData {
  failures15m: AIFailureEventDoc[];
  summaries15m: AIRequestSummaryDoc[];
  summaries60m: AIRequestSummaryDoc[];
}

export const SUPPORT_EMAIL = "support@switchcv.com";
export const ALERT_COOLDOWN_MS = 60 * 60 * 1000;
export const RECOVERY_STABILITY_MS = 30 * 60 * 1000;
export const RAW_EVENTS_RETENTION_MS = 14 * 24 * 60 * 60 * 1000;
export const REQUEST_SUMMARY_RETENTION_MS = 60 * 24 * 60 * 60 * 1000;
export const DAILY_METRICS_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

function monitoringCollection(db: FirebaseFirestore.Firestore) {
  return db.collection("monitoring");
}

export function failureEventsCollection(db: FirebaseFirestore.Firestore) {
  return monitoringCollection(db).doc("aiFailureEvents").collection("events");
}

export function requestSummariesCollection(db: FirebaseFirestore.Firestore) {
  return monitoringCollection(db)
    .doc("aiRequestSummaries")
    .collection("requests");
}

export function dailyMetricsCollection(db: FirebaseFirestore.Firestore) {
  return monitoringCollection(db).doc("aiMetrics").collection("daily");
}

export function alertStateDoc(db: FirebaseFirestore.Firestore) {
  return monitoringCollection(db).doc("aiAlertState");
}

export function toDate(value: TimestampLike): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "object" && "toDate" in value) {
    const converted = value.toDate();
    return converted instanceof Date && !Number.isNaN(converted.valueOf())
      ? converted
      : null;
  }

  return null;
}

export function dateKeyForUtc(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

export function endOfUtcDay(date: Date): Date {
  return new Date(startOfUtcDay(date).getTime() + 24 * 60 * 60 * 1000);
}

export function cleanObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => cleanObject(item));
  }

  // Preserve Date and Firestore Timestamp instances —
  // Firestore SDK converts Dates to Timestamps automatically.
  if (value instanceof Date) {
    return value;
  }
  if (value && typeof value === "object" && "toDate" in value) {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce<Record<string, unknown>>(
      (accumulator, [key, entry]) => {
        if (entry === undefined) {
          return accumulator;
        }

        accumulator[key] = cleanObject(entry);
        return accumulator;
      },
      {},
    );
  }

  return value;
}

export function topEntries(
  counts: Record<string, number>,
  limit: number,
): string[] {
  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([key, value]) => `${key}: ${value}`);
}
