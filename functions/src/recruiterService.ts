import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { config } from "./config";
import { resilientCall } from "./utils/retryHandler";
import {
  MetricType,
  performanceMonitor,
  alertManager,
  AlertSeverity,
} from "./utils/monitoring";

const db = admin.firestore();
const databaseConfig = config.get("database");

/**
 * Clean up old recruiter search history
 * Runs daily to remove events older than 90 days
 */
export const cleanupRecruiterSearchHistoryHandler = async (
  context: functions.EventContext
) => {
  return performanceMonitor.measure(
    "functions.cleanupRecruiterSearchHistory",
    async () => {
      const startTime = Date.now();
      functions.logger.info("Recruiter search history cleanup started", {
        eventId: context.eventId,
      });

      const historyRef = db.collection("recruiterSearchHistory");
      const retentionDays = 90;
      const cutoffDate = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000
      );
      const BATCH_SIZE = databaseConfig?.batchSize || 500;
      let deletedCount = 0;

      try {
        let hasMore = true;
        while (hasMore) {
          const oldEventsSnap = await resilientCall(
            () =>
              historyRef
                .where("createdAt", "<", cutoffDate)
                .limit(BATCH_SIZE)
                .get(),
            {
              retryOptions: { maxAttempts: databaseConfig?.maxRetries || 3 },
              timeoutMs: databaseConfig?.timeoutMs || 10000,
              operationName: "recruiter-history-cleanup-scan",
            }
          );

          if (oldEventsSnap.empty) {
            hasMore = false;
            break;
          }

          const batch = db.batch();
          oldEventsSnap.docs.forEach((doc) => {
            batch.delete(doc.ref);
            deletedCount++;
          });

          await resilientCall(() => batch.commit(), {
            retryOptions: { maxAttempts: databaseConfig?.maxRetries || 3 },
            timeoutMs: databaseConfig?.timeoutMs || 10000,
            operationName: "recruiter-history-cleanup-commit",
          });

          functions.logger.info("Batch deleted", {
            batchSize: oldEventsSnap.size,
            totalDeleted: deletedCount,
          });

          if (oldEventsSnap.size < BATCH_SIZE) {
            hasMore = false;
          }
        }

        functions.logger.info("Recruiter search history cleanup completed", {
          deletedCount,
          durationMs: Date.now() - startTime,
          eventId: context.eventId,
        });
        return null;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await alertManager.sendAlert(
          AlertSeverity.ERROR,
          "cleanupRecruiterSearchHistory failed",
          message,
          {
            eventId: context.eventId,
            stack: error instanceof Error ? error.stack : undefined,
          }
        );
        functions.logger.error("cleanupRecruiterSearchHistory failed", {
          message,
          stack: error instanceof Error ? error.stack : undefined,
          eventId: context.eventId,
        });
        throw error;
      }
    },
    MetricType.BACKGROUND_TASK,
    { eventId: context.eventId }
  );
};
