// src/lib/services/analyticsService.ts
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Analytics,
  ProfileViewAnalytics,
  EngagementMetrics,
  RequestStatistics,
  AnalyticsEvent,
} from "@/types";

export interface TrackingRequest {
  resumeId: string;
  userId?: string;
  eventType: "view" | "request" | "approval" | "click" | "share";
  metadata?: {
    viewedBy?: string;
    viewerName?: string;
    source?: "search" | "direct" | "link" | "recruiter" | "other";
    referrer?: string;
    sessionDuration?: number;
  };
}

/**
 * Get analytics for a specific resume
 */
export async function getAnalytics(resumeId: string) {
  const analyticsRef = doc(db, "analytics", resumeId);
  const analyticsSnap = await getDoc(analyticsRef);

  if (!analyticsSnap.exists()) {
    throw new Error(`No analytics found for resume: ${resumeId}`);
  }

  const analytics = analyticsSnap.data() as Analytics;
  const engagement = await getEngagementMetrics(resumeId);
  const requests = await getRequestStatistics(resumeId);

  return {
    analytics,
    engagement,
    requests,
    resumeId,
  };
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

  const eventsRef = collection(db, "analytics", resumeId, "events");
  await setDoc(doc(eventsRef, eventId), eventData);

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

  console.log(`📊 Analytics event tracked: ${eventType} for ${resumeId}`);

  return {
    success: true,
    eventId,
    eventType,
    timestamp,
    resumeId,
  };
}

/**
 * Update analytics metrics based on event type
 */
async function updateAnalyticsMetrics(
  resumeId: string,
  userId: string | undefined,
  eventType: string,
  timestamp: string,
  metadata: any
): Promise<void> {
  const analyticsRef = doc(db, "analytics", resumeId);
  const analyticsSnap = await getDoc(analyticsRef);

  if (!analyticsSnap.exists()) {
    // Create new analytics document
    const newAnalytics: Analytics = {
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
    await setDoc(analyticsRef, newAnalytics);
  } else {
    // Update existing analytics
    const updates: Record<string, any> = {
      lastUpdatedAt: timestamp,
    };

    if (eventType === "view") {
      updates["views.count"] = increment(1);
      updates["views.lastViewedAt"] = timestamp;
      updates["views.uniqueViewers"] = increment(1);

      // Update top referrers
      if (metadata?.referrer) {
        updates[`views.topReferrers.${metadata.referrer}`] = increment(1);
      }
    }

    // Update total interactions
    updates["totalInteractions"] = increment(1);

    // Add request-specific tracking
    if (eventType === "request") {
      updates["requests.totalRequests"] = increment(1);
      updates["requests.pendingRequests"] = increment(1);
    } else if (eventType === "approval") {
      updates["requests.approvedRequests"] = increment(1);
      updates["requests.pendingRequests"] = increment(-1);
    }

    await updateDoc(analyticsRef, updates);
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
    const engagementRef = doc(
      db,
      "analytics",
      resumeId,
      "engagement",
      "current"
    );
    const engagementSnap = await getDoc(engagementRef);

    if (!engagementSnap.exists()) {
      await setDoc(engagementRef, {
        resumeId,
        avgSessionDuration: sessionDuration,
        totalSessions: 1,
      });
    } else {
      const data = engagementSnap.data();
      const avgDuration =
        (data.avgSessionDuration * data.totalSessions + sessionDuration) /
        (data.totalSessions + 1);

      await updateDoc(engagementRef, {
        avgSessionDuration: avgDuration,
        totalSessions: increment(1),
      });
    }
  } catch (error) {
    console.error("Failed to track session duration:", error);
  }
}

/**
 * Get engagement metrics for a resume
 */
export async function getEngagementMetrics(
  resumeId: string
): Promise<EngagementMetrics | null> {
  try {
    const engagementRef = doc(
      db,
      "analytics",
      resumeId,
      "engagement",
      "current"
    );
    const snap = await getDoc(engagementRef);
    return snap.exists() ? (snap.data() as EngagementMetrics) : null;
  } catch (error) {
    console.error("Error getting engagement metrics:", error);
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
    const requestsRef = doc(db, "analytics", resumeId, "requests", "current");
    const snap = await getDoc(requestsRef);
    return snap.exists() ? (snap.data() as RequestStatistics) : null;
  } catch (error) {
    console.error("Error getting request statistics:", error);
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
    const eventsRef = collection(db, "analytics", resumeId, "events");
    const q = query(eventsRef, orderBy("timestamp", "desc"), limit(limitCount));
    const querySnap = await getDocs(q);
    return querySnap.docs.map((doc) => doc.data() as AnalyticsEvent);
  } catch (error) {
    console.error("Error getting recent events:", error);
    return [];
  }
}
