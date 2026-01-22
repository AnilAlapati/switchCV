import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { config } from "./config";
import {
  AlertSeverity,
  MetricType,
  alertManager,
  performanceMonitor,
} from "./utils/monitoring";
import { resilientCall } from "./utils/retryHandler";

const USERS_COLLECTION = "users";
const ANALYTICS_COLLECTION = "analytics";
const GLOBAL_STATS_DOC = "globalStats";

/**
 * Get Firestore instance (assumes admin is already initialized in index.ts)
 */
const getFirestore = (): FirebaseFirestore.Firestore => {
  return admin.firestore();
};

const databaseConfig = config.get("database");

const fetchCount = async (
  query: FirebaseFirestore.Query,
  metricName: string
): Promise<number> => {
  const start = Date.now();
  const snapshot = await resilientCall(() => query.count().get(), {
    retryOptions: {
      maxAttempts: databaseConfig.maxRetries,
    },
    timeoutMs: databaseConfig.timeoutMs,
    operationName: `stats-count-${metricName}`,
  });

  const data = snapshot.data();
  const rawCount = data?.count;
  const duration = Date.now() - start;

  functions.logger.info(`Stats count completed: ${metricName}`, {
    count: rawCount,
    durationMs: duration,
  });

  if (typeof rawCount !== "number" || rawCount < 0) {
    throw new Error(`Unable to read aggregate count for ${metricName}`);
  }

  return rawCount;
};

/**
 * Aggregate global statistics (users, resumes) periodically.
 * Runs every hour.
 */
export const aggregateGlobalStatsHandler = async (
  context: functions.EventContext
) => {
  const start = Date.now();
  functions.logger.info("Global stats aggregation started", {
    eventId: context.eventId,
  });

  return performanceMonitor.measure(
    "functions.aggregateGlobalStats",
    async () => {
      try {
        const db = getFirestore();
        const statsDocRef = db
          .collection(ANALYTICS_COLLECTION)
          .doc(GLOBAL_STATS_DOC);

        const [userCount, resumeCount, jobSeekerCount, recruiterCount] =
          await Promise.all([
            fetchCount(db.collection(USERS_COLLECTION), "userCount"),
            // Fixed: Query 'allResumes' collection (the actual production collection)
            fetchCount(
              db.collection("allResumes"),
              "resumeCount"
            ),
            fetchCount(
              db.collection(USERS_COLLECTION).where("role", "==", "jobseeker"),
              "jobSeekerCount"
            ),
            fetchCount(
              db.collection(USERS_COLLECTION).where("role", "==", "recruiter"),
              "recruiterCount"
            ),
          ]);

        const payload = {
          userCount,
          resumeCount,
          jobSeekerCount,
          recruiterCount,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastRunEventId: context.eventId,
        };

        await resilientCall(() => statsDocRef.set(payload, { merge: true }), {
          retryOptions: {
            maxAttempts: databaseConfig.maxRetries,
          },
          timeoutMs: databaseConfig.timeoutMs,
          operationName: "stats-write-global",
        });

        functions.logger.info("Global stats aggregation completed", {
          userCount,
          resumeCount,
          jobSeekerCount,
          recruiterCount,
          durationMs: Date.now() - start,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        await alertManager.sendAlert(
          AlertSeverity.ERROR,
          "Global stats aggregation failed",
          message,
          {
            eventId: context.eventId,
            stack: error instanceof Error ? error.stack : undefined,
          }
        );

        functions.logger.error("Global stats aggregation failed", {
          message,
          stack: error instanceof Error ? error.stack : undefined,
        });

        throw error;
      }
    },
    MetricType.BACKGROUND_TASK,
    { eventId: context.eventId }
  );
};
