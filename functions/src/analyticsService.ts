import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ViewTrendData, EngagementMetrics, AnalyticsEvent } from "./types";

/**
 * Aggregate analytics data daily
 * Runs at 1 AM UTC every day
 */
export const aggregateAnalyticsDaily = functions.pubsub
  .schedule("0 1 * * *")
  .timeZone("UTC")
  .onRun(async (context) => {
    const startTime = Date.now();
    functions.logger.info("Daily analytics aggregation started", {
      eventId: context.eventId,
    });

    const db = admin.firestore();
    const analyticsRef = db.collection("analytics");
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      const analyticsSnap = await analyticsRef.get();

      for (const doc of analyticsSnap.docs) {
        const analyticsId = doc.id;
        const eventsRef = db
          .collection("analytics")
          .doc(analyticsId)
          .collection("events");

        const eventsSnap = await eventsRef
          .where("timestamp", ">=", sevenDaysAgo.toISOString())
          .get();

        // Calculate metrics
        const metrics = calculateEngagementMetrics(
          analyticsId,
          eventsSnap,
          now
        );

        // Get view trend
        const viewTrend = await getViewTrendLast7Days(analyticsId);

        // Update engagement document
        const engagementMetrics: EngagementMetrics = {
          ...metrics,
          viewTrendLast7Days: viewTrend,
        };

        await db
          .collection("analytics")
          .doc(analyticsId)
          .collection("engagement")
          .doc("current")
          .set(engagementMetrics, { merge: true });

        functions.logger.info("Analytics aggregated for document", {
          analyticsId,
          eventId: context.eventId,
        });
      }

      functions.logger.info("Daily analytics aggregation completed", {
        durationMs: Date.now() - startTime,
        eventId: context.eventId,
      });
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      functions.logger.error("Daily analytics aggregation failed", {
        message,
        stack: error instanceof Error ? error.stack : undefined,
        eventId: context.eventId,
      });
      throw error;
    }
  });

/**
 * Clean up old analytics events
 * Runs weekly to remove events older than 90 days
 */
export const cleanupAnalyticsEvents = functions.pubsub
  .schedule("0 2 * * 0")
  .timeZone("UTC")
  .onRun(async (context) => {
    const startTime = Date.now();
    functions.logger.info("Analytics cleanup started", {
      eventId: context.eventId,
    });

    const db = admin.firestore();
    const analyticsRef = db.collection("analytics");
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    try {
      const analyticsSnap = await analyticsRef.get();
      let deletedCount = 0;
      const BATCH_SIZE = 500; // Firestore batch limit

      for (const doc of analyticsSnap.docs) {
        const analyticsId = doc.id;
        const eventsRef = db
          .collection("analytics")
          .doc(analyticsId)
          .collection("events");

        let hasMore = true;
        while (hasMore) {
          const oldEventsSnap = await eventsRef
            .where("timestamp", "<", ninetyDaysAgo.toISOString())
            .limit(BATCH_SIZE)
            .get();

          if (oldEventsSnap.empty) {
            hasMore = false;
            break;
          }

          // Use batched writes for efficiency
          const batch = db.batch();
          oldEventsSnap.docs.forEach((eventDoc) => {
            batch.delete(eventDoc.ref);
            deletedCount++;
          });

          await batch.commit();

          functions.logger.info("Batch deleted", {
            analyticsId,
            batchSize: oldEventsSnap.size,
            totalDeleted: deletedCount,
          });

          // If we got less than batch size, we're done
          if (oldEventsSnap.size < BATCH_SIZE) {
            hasMore = false;
          }
        }
      }

      functions.logger.info("Analytics cleanup completed", {
        deletedCount,
        durationMs: Date.now() - startTime,
        eventId: context.eventId,
      });
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      functions.logger.error("Analytics cleanup failed", {
        message,
        stack: error instanceof Error ? error.stack : undefined,
        eventId: context.eventId,
      });
      throw error;
    }
  });

/**
 * Calculate engagement metrics from analytics events
 */
function calculateEngagementMetrics(
  analyticsId: string,
  eventsSnap: FirebaseFirestore.QuerySnapshot,
  now: Date
): Omit<EngagementMetrics, "viewTrendLast7Days"> {
  let totalViews = 0;
  const uniqueViewers = new Set<string>();
  let totalSessionDuration = 0;
  let sessionCount = 0;
  const viewsBySource: Record<string, number> = {
    search: 0,
    direct: 0,
    link: 0,
    recruiter: 0,
    other: 0,
  };
  const topReferrers: Record<string, number> = {};

  for (const eventDoc of eventsSnap.docs) {
    const event = eventDoc.data() as AnalyticsEvent;
    if (event.eventType === "view") {
      totalViews++;
      if (event.metadata?.viewedBy) {
        uniqueViewers.add(event.metadata.viewedBy);
      }
      if (event.metadata?.sessionDuration) {
        totalSessionDuration += event.metadata.sessionDuration;
        sessionCount++;
      }
      if (event.metadata?.source) {
        viewsBySource[event.metadata.source] =
          (viewsBySource[event.metadata.source] || 0) + 1;
      }
      if (event.metadata?.referrer) {
        topReferrers[event.metadata.referrer] =
          (topReferrers[event.metadata.referrer] || 0) + 1;
      }
    }
  }

  const avgSessionDuration =
    sessionCount > 0 ? totalSessionDuration / sessionCount : 0;

  return {
    resumeId: analyticsId,
    totalViews,
    uniqueViewers: uniqueViewers.size,
    avgSessionDuration: Math.round(avgSessionDuration),
    viewsBySource,
    topReferrers,
    lastViewedAt: now.toISOString(),
  };
}

/**
 * Get view trend for the last 7 days
 */
export async function getViewTrendLast7Days(
  analyticsId: string
): Promise<ViewTrendData[]> {
  const db = admin.firestore();
  const trend: ViewTrendData[] = [];
  const eventsRef = db
    .collection("analytics")
    .doc(analyticsId)
    .collection("events");

  for (let i = 6; i >= 0; i--) {
    const startOfDay = new Date();
    startOfDay.setDate(startOfDay.getDate() - i);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const dayEventsSnap = await eventsRef
      .where("timestamp", ">=", startOfDay.toISOString())
      .where("timestamp", "<=", endOfDay.toISOString())
      .where("eventType", "==", "view")
      .get();

    trend.push({
      date: startOfDay.toISOString().split("T")[0],
      count: dayEventsSnap.docs.length,
    });
  }

  return trend;
}
