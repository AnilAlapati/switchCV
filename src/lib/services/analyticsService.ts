/* eslint-disable max-lines */
// src/lib/services/analyticsService.ts
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  Analytics,
  EngagementMetrics,
  RequestStatistics,
  AnalyticsEvent,
  SystemAnalytics,
} from "@/types";
import { logger } from "@/lib/logger";

// Helper interfaces for Dashboard
interface ViewEvent {
  id: string;
  resumeId: string;
  viewerId?: string;
  viewedAt: Date;
  duration: number;
  sourceType: string;
  metadata: Record<string, any>;
}

interface SectionHeatmap {
  resumeId: string;
  sectionName: string;
  viewCount: number;
  avgTimeSpent: number;
  clickCount: number;
  engagementScore: number;
}

interface RecruiterEngagement {
  resumeId: string;
  recruiterId: string;
  viewCount: number;
  interactionCount: number;
  lastInteractedAt: Date;
  engagementLevel: string;
  score: number;
}

interface IndustryBenchmark {
  industry: string;
  avgAttractivenessScore: number;
  avgViewCount: number;
  avgDownloadCount: number;
  topSkills: string[];
  benchmarkDate: Date;
}

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
    const eventsRef = adminDb
      .collection("analytics")
      .doc(resumeId)
      .collection("events");
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
    logger.error(
      { err: error, resumeId, eventType },
      "Error tracking analytics event"
    );
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
    const updates: Record<string, FieldValue | string | number> = {
      lastUpdatedAt: timestamp,
      totalInteractions: FieldValue.increment(1),
    };

    if (eventType === "view") {
      updates["views.count"] = FieldValue.increment(1);
      updates["views.lastViewedAt"] = timestamp;
      updates["views.uniqueViewers"] = FieldValue.increment(1);

      // Update top referrers
      if (metadata?.referrer) {
        updates[`views.topReferrers.${metadata.referrer.replace(/\./g, "_")}`] =
          FieldValue.increment(1);
      }
    }

    if (eventType === "download") {
      updates["downloads"] = FieldValue.increment(1);
      updates["lastDownloadedAt"] = timestamp;
      if (metadata?.downloadFormat) {
        updates[`downloadsByFormat.${metadata.downloadFormat}`] =
          FieldValue.increment(1);
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

    await engagementRef.set(
      {
        resumeId,
        totalTimeSpent: FieldValue.increment(sessionDuration),
        totalSessions: FieldValue.increment(1),
      },
      { merge: true }
    );
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

/**
 * Get system-wide analytics (Admin/Recruiter only)
 */
export async function getSystemAnalytics(
  requestingUserId: string
): Promise<SystemAnalytics> {
  // Check permission
  const userDoc = await adminDb.collection("users").doc(requestingUserId).get();
  if (!userDoc.exists) throw new Error("User not found");
  const role = userDoc.data()?.role;

  if (role !== "admin" && role !== "recruiter") {
    throw new Error("Unauthorized");
  }

  // 1. Aggregations (Fast & Bounded)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { AggregateField } = await import("firebase-admin/firestore");

  const [
    totalUsersSnap,
    totalResumesSnap,
    totalRequestsSnap,
    activeRecruitersSnap,
    analyticsAggSnap,
    basicSubsSnap,
    premiumSubsSnap,
    entSubsSnap,
    recentResumesForInd,
  ] = await Promise.all([
    adminDb.collection("users").count().get(),
    adminDb.collection("resumes").count().get(),
    adminDb.collection("contactRequests").count().get(),
    adminDb
      .collection("users")
      .where("role", "in", ["recruiter", "admin"])
      .where("lastLoginAt", ">=", thirtyDaysAgo)
      .count()
      .get(),
    adminDb
      .collection("analytics")
      .aggregate({
        totalViews: AggregateField.sum("views.count"),
        avgAttract: AggregateField.average("attractivenessScore"),
      })
      .get(),
    adminDb.collection("users").where("tier", "==", "basic").count().get(),
    adminDb.collection("users").where("tier", "==", "premium").count().get(),
    adminDb.collection("users").where("tier", "==", "enterprise").count().get(),
    // Sample last 500 resumes for industry trends instead of scanning all
    adminDb.collection("resumes").orderBy("createdAt", "desc").limit(500).get(),
  ]);

  // Process Industries (Sampled)
  const industriesCounts: Record<string, number> = {};
  recentResumesForInd.forEach((doc) => {
    const data = doc.data();
    const industry = data.industry || data.targetIndustry || "Other";
    industriesCounts[industry] = (industriesCounts[industry] || 0) + 1;
  });

  const topIndustries = Object.entries(industriesCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Recent Activity
  const recentActivity: Array<{
    type: string;
    timestamp: Date;
    description: string;
  }> = [];

  // Reuse logic for recent items, but ensuring limits
  const recentResumes = await adminDb
    .collection("resumes")
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  recentResumes.forEach((doc) => {
    const data = doc.data();
    recentActivity.push({
      type: "resume_created",
      timestamp: data.createdAt?.toDate?.() || new Date(),
      description: `New resume created: ${data.title || "Untitled"}`,
    });
  });

  const recentRequests = await adminDb
    .collection("contactRequests")
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();

  recentRequests.forEach((doc) => {
    const data = doc.data();
    recentActivity.push({
      type: "contact_request",
      timestamp: data.createdAt?.toDate?.() || new Date(),
      description: `Contact request ${data.status || "pending"}`,
    });
  });

  recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return {
    totalUsers: totalUsersSnap.data().count,
    totalResumes: totalResumesSnap.data().count,
    activeRecruiters: activeRecruitersSnap.data().count,
    totalViews: analyticsAggSnap.data().totalViews || 0,
    averageAttractiveness: Math.round(analyticsAggSnap.data().avgAttract || 0),
    totalContactRequests: totalRequestsSnap.data().count,
    topIndustries,
    recentActivity: recentActivity.slice(0, 10),
    subscriptionDistribution: {
      basic: basicSubsSnap.data().count,
      premium: premiumSubsSnap.data().count,
      enterprise: entSubsSnap.data().count,
    },
  };
}

/**
 * Get comprehensive dashboard analytics
 */
export async function getDashboardAnalytics(resumeId: string) {
  // 1. Get base analytics
  const analyticsRef = adminDb.collection("analytics").doc(resumeId);
  const doc = await analyticsRef.get();

  let analyticsData;
  if (!doc.exists) {
    // Initialize if missing
    analyticsData = {
      resumeId,
      viewCount: 0,
      uniqueViewCount: 0,
      downloadCount: 0,
      shareCount: 0,
      attractivenessScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await analyticsRef.set(analyticsData);
  } else {
    const d = doc.data()!;
    analyticsData = {
      ...d,
      lastViewedAt: d.lastViewedAt?.toDate(),
      createdAt: d.createdAt?.toDate(),
      updatedAt: d.updatedAt?.toDate(),
    };
  }

  // 2. Fetch sub-collections
  const [viewEventsSnap, heatmapsSnap, recruitersSnap] = await Promise.all([
    adminDb
      .collection("analytics")
      .doc(resumeId)
      .collection("viewEvents")
      .orderBy("viewedAt", "desc")
      .limit(100)
      .get(),
    adminDb.collection("analytics").doc(resumeId).collection("heatmaps").get(),
    adminDb
      .collection("analytics")
      .doc(resumeId)
      .collection("recruiterEngagement")
      .orderBy("lastInteractedAt", "desc")
      .limit(50)
      .get(),
  ]);

  const viewEvents: ViewEvent[] = viewEventsSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      resumeId,
      viewerId: d.viewerId,
      viewedAt: d.viewedAt?.toDate(),
      duration: d.duration || 0,
      sourceType: d.sourceType,
      metadata: d.metadata || {},
    } as ViewEvent;
  });

  const heatmaps: SectionHeatmap[] = heatmapsSnap.docs.map(
    (doc) =>
      ({
        ...doc.data(),
        sectionName: doc.data().sectionName || doc.id,
      } as SectionHeatmap)
  );

  const recruiters: RecruiterEngagement[] = recruitersSnap.docs.map((doc) => {
    const d = doc.data();
    return {
      ...d,
      lastInteractedAt: d.lastInteractedAt?.toDate(),
    } as RecruiterEngagement;
  });

  // 3. Generate missing heatmaps if needed
  const finalHeatmaps =
    heatmaps.length > 0
      ? heatmaps
      : generateHeatmap(viewEvents, resumeId, [
          "summary",
          "experience",
          "skills",
          "education",
          "projects",
        ]);

  // 4. Get Benchmark (defaulting to Technology for now, could be dynamic)
  const benchmarkRef = adminDb.collection("benchmarks").doc("technology");
  const benchDoc = await benchmarkRef.get();
  let benchmark: IndustryBenchmark = {
    industry: "Technology",
    avgAttractivenessScore: 50,
    avgViewCount: 30,
    avgDownloadCount: 5,
    topSkills: [],
    benchmarkDate: new Date(),
  };

  if (benchDoc.exists) {
    const d = benchDoc.data()!;
    benchmark = {
      ...d,
      benchmarkDate: d.benchmarkDate?.toDate(),
    } as IndustryBenchmark;
  }

  return aggregateToDashboard(
    analyticsData as any,
    finalHeatmaps,
    recruiters,
    benchmark
  );
}

// ... internal helpers ...

export function generateHeatmap(
  events: ViewEvent[],
  resumeId: string,
  sections: string[]
): SectionHeatmap[] {
  // stub implementation - simplistic logic
  return sections.map((section) => ({
    resumeId,
    sectionName: section,
    viewCount: Math.floor(Math.random() * 10), // Placeholder logic would go here
    avgTimeSpent: 10,
    clickCount: 0,
    engagementScore: 50,
  }));
}

export function aggregateToDashboard(
  analytics: Partial<Analytics> & { viewCount?: number },
  heatmaps: SectionHeatmap[],
  recruiters: RecruiterEngagement[],
  benchmark: IndustryBenchmark
) {
  return {
    summary: {
      totalViews: analytics.viewCount || analytics.views?.count || 0,
      uniqueViews:
        analytics.uniqueViews ||
        analytics.uniqueViewCount ||
        analytics.views?.uniqueViewers ||
        analytics.viewCount ||
        0,
      conversionRate: 0,
      avgTimeOnResume: 45, // seconds
    },
    trends: [], // would map from viewEvents
    heatmaps,
    recruiterActivity: recruiters,
    benchmark,
  };
}
