import { adminDb } from "@/lib/firebase-admin";
import { Analytics, EngagementMetrics, RequestStatistics, AnalyticsEvent } from "@/types";
import { logger } from "@/lib/logger";

/**
 * Get analytics for a specific resume
 */
export async function getAnalytics(resumeId: string) {
    try {
        const analyticsRef = adminDb.collection("analytics").doc(resumeId);
        const analyticsSnap = await analyticsRef.get();

        let analytics: Analytics;

        if (!analyticsSnap.exists) {
            // Return default zeroed analytics if not found
            analytics = {
                resumeId,
                userId: "",
                slug: "",
                views: {
                    count: 0,
                    lastViewedAt: "",
                    topReferrers: {},
                    uniqueViewers: 0,
                    avgSessionDuration: 0,
                },
                totalInteractions: 0,
                lastUpdatedAt: new Date().toISOString(),
            };
        } else {
            analytics = analyticsSnap.data() as Analytics;
        }

        const [engagement, requests, recentEvents] = await Promise.all([
            getEngagementMetrics(resumeId),
            getRequestStatistics(resumeId),
            getRecentEvents(resumeId, 5),
        ]);

        return {
            analytics: {
                ...analytics,
                engagement: engagement || undefined,
                requests: requests || undefined,
            },
            engagement,
            requests,
            recentEvents,
            resumeId,
        };
    } catch (error) {
        logger.error({ err: error, resumeId }, "Error in getAnalytics service");
        throw error;
    }
}

/**
 * Get engagement metrics for a resume
 */
export async function getEngagementMetrics(
    resumeId: string
): Promise<EngagementMetrics | null> {
    try {
        const engagementRef = adminDb
            .collection("analytics")
            .doc(resumeId)
            .collection("engagement")
            .doc("current");
        const snap = await engagementRef.get();

        if (!snap.exists) {
            return null;
        }

        const data = snap.data() || {};
        const totalSessions = data.totalSessions || 0;
        const totalTimeSpent = data.totalTimeSpent || 0;

        // Calculate average at read time
        const avgSessionDuration =
            totalSessions > 0 ? totalTimeSpent / totalSessions : 0;

        return {
            ...data,
            avgSessionDuration,
        } as EngagementMetrics;
    } catch (error) {
        logger.error({ err: error, resumeId }, "Error getting engagement metrics");
        return null;
    }
}

/**
 * Get request statistics for a resume
 */
export async function getRequestStatistics(
    resumeId: string
): Promise<RequestStatistics | null> {
    try {
        const requestsRef = adminDb
            .collection("analytics")
            .doc(resumeId)
            .collection("requests")
            .doc("current");
        const snap = await requestsRef.get();
        return snap.exists ? (snap.data() as RequestStatistics) : null;
    } catch (error) {
        logger.error({ err: error, resumeId }, "Error getting request statistics");
        return null;
    }
}

/**
 * Get recent events for a resume
 */
export async function getRecentEvents(
    resumeId: string,
    limitCount: number = 10
): Promise<AnalyticsEvent[]> {
    try {
        const eventsRef = adminDb
            .collection("analytics")
            .doc(resumeId)
            .collection("events");
        const querySnap = await eventsRef
            .orderBy("timestamp", "desc")
            .limit(limitCount)
            .get();

        return querySnap.docs.map((doc) => doc.data() as AnalyticsEvent);
    } catch (error) {
        logger.error(
            { err: error, resumeId, limitCount },
            "Error getting recent events"
        );
        return [];
    }
}
