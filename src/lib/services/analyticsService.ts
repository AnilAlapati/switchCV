// src/lib/services/analyticsService.ts
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  Analytics,
  EngagementMetrics,
  RequestStatistics,
  AnalyticsEvent,
} from "@/types";
import { logger } from "@/lib/logger";

export interface TrackingRequest {
  resumeId: string;
  userId?: string;
  eventType: "view" | "request" | "approval" | "click" | "share" | "download";
  metadata?: {
    viewedBy?: string;
    viewerName?: string;
    source?: "search" | "direct" | "link" | "recruiter" | "other";
    referrer?: string;
    sessionDuration?: number;
    downloadFormat?: "pdf" | "docx" | "json";
  };
}

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
          lastViewedAt: new Date().toISOString(),
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
 * Track an analytics event
 */
export async function trackAnalyticsEvent(request: TrackingRequest) {
  const { resumeId, userId, eventType, metadata } = request;

  if (!resumeId || !eventType) {
    throw new Error("resumeId and eventType are required");
  }

  const timestamp = new Date().toISOString();
  const eventId = `${resumeId}-${eventType}-${Date.now()}`;

  // Store event
  const eventData: AnalyticsEvent = {
    eventId,
    resumeId,
    userId: userId || "anonymous",
    eventType,
    timestamp,
    metadata,
  };

  try {
    const eventsRef = adminDb.collection("analytics").doc(resumeId).collection("events");
    await eventsRef.doc(eventId).set(eventData);

    // Update main analytics
    await updateAnalyticsMetrics(
      resumeId,
      userId,
      eventType,
      timestamp,
      metadata
    );

    // Track session duration if provided
    if (metadata?.sessionDuration && eventType === "view") {
      await trackSessionDuration(resumeId, metadata.sessionDuration);
    }

    logger.info({ eventType, resumeId, eventId }, "Analytics event tracked");

    return {
      success: true,
      eventId,
      eventType,
      timestamp,
      resumeId,
    };
  } catch (error) {
    logger.error({ err: error, resumeId, eventType }, "Error tracking analytics event");
    throw error;
  }
}

/**
 * Update analytics metrics based on event type
 */
async function updateAnalyticsMetrics(
  resumeId: string,
  userId: string | undefined,
  eventType: string,
  timestamp: string,
  metadata: TrackingRequest["metadata"]
): Promise<void> {
  const analyticsRef = adminDb.collection("analytics").doc(resumeId);
  const analyticsSnap = await analyticsRef.get();

  if (!analyticsSnap.exists) {
    // Create new analytics document
    const newAnalytics: any = {
      slug: "",
      resumeId,
      userId: userId || "",
      views: {
        count: eventType === "view" ? 1 : 0,
        lastViewedAt: eventType === "view" ? timestamp : "",
        topReferrers: {},
        uniqueViewers: eventType === "view" ? 1 : 0,
        avgSessionDuration: 0,
      },
      totalInteractions: 1,
      lastUpdatedAt: timestamp,
    };

    // Add initial counters if not a view
    if (eventType === "download") {
      newAnalytics.downloads = 1;
      newAnalytics.lastDownloadedAt = timestamp;
    }
    if (eventType === "share") {
      newAnalytics.shares = 1;
      newAnalytics.lastSharedAt = timestamp;
    }

    await analyticsRef.set(newAnalytics);
  } else {
    // Update existing analytics
    const updates: Record<string, any> = {
      lastUpdatedAt: timestamp,
      totalInteractions: FieldValue.increment(1),
    };

    if (eventType === "view") {
      updates["views.count"] = FieldValue.increment(1);
      updates["views.lastViewedAt"] = timestamp;
      updates["views.uniqueViewers"] = FieldValue.increment(1);

      // Update top referrers
      if (metadata?.referrer) {
        updates[`views.topReferrers.${metadata.referrer.replace(/\./g, '_')}`] = FieldValue.increment(1);
      }
    }

    if (eventType === "download") {
      updates["downloads"] = FieldValue.increment(1);
      updates["lastDownloadedAt"] = timestamp;
      if (metadata?.downloadFormat) {
        updates[`downloadsByFormat.${metadata.downloadFormat}`] = FieldValue.increment(1);
      }
    }

    if (eventType === "share") {
      updates["shares"] = FieldValue.increment(1);
      updates["lastSharedAt"] = timestamp;
    }

    // Add request-specific tracking
    if (eventType === "request") {
      updates["requests.totalRequests"] = FieldValue.increment(1);
      updates["requests.pendingRequests"] = FieldValue.increment(1);
    } else if (eventType === "approval") {
      updates["requests.approvedRequests"] = FieldValue.increment(1);
      updates["requests.pendingRequests"] = FieldValue.increment(-1);
    }

    await analyticsRef.update(updates);
  }
}

/**
 * Track average session duration
 */
async function trackSessionDuration(
  resumeId: string,
  sessionDuration: number
): Promise<void> {
  try {
    const engagementRef = adminDb
      .collection("analytics")
      .doc(resumeId)
      .collection("engagement")
      .doc("current");

    await engagementRef.set({
      resumeId,
      totalTimeSpent: FieldValue.increment(sessionDuration),
      totalSessions: FieldValue.increment(1),
    }, { merge: true });
  } catch (error) {
    logger.error(
      { err: error, resumeId, sessionDuration },
      "Failed to track session duration"
    );
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
    const eventsRef = adminDb.collection("analytics").doc(resumeId).collection("events");
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
