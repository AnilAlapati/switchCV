import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { Analytics, AnalyticsEvent } from "@/types";
import { logger } from "@/lib/logger";
import { TrackingRequest } from "./types";

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
export async function updateAnalyticsMetrics(
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
export async function trackSessionDuration(
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
