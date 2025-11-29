import * as functions from "firebase-functions/v1";
import { cleanupExpiredRateLimits } from "./middleware/rateLimiter";
import {
  performanceMonitor,
  MetricType,
  alertManager,
  AlertSeverity,
} from "./utils/monitoring";

export const cleanupRateLimits = functions.pubsub
  .schedule("every 24 hours")
  .timeZone("UTC")
  .onRun(async (context: functions.EventContext) => {
    return performanceMonitor.measure(
      "functions.cleanupRateLimits",
      async () => {
        try {
          const count = await cleanupExpiredRateLimits();
          functions.logger.info("Scheduled rate limit cleanup completed", {
            count,
            eventId: context.eventId,
          });
          return null;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          await alertManager.sendAlert(
            AlertSeverity.ERROR,
            "cleanupRateLimits failed",
            message,
            {
              eventId: context.eventId,
              stack: error instanceof Error ? error.stack : undefined,
            }
          );
          throw error;
        }
      },
      MetricType.FUNCTION_EXECUTION,
      { eventId: context.eventId }
    );
  });
