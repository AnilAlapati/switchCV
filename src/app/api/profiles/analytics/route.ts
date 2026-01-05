// src/app/api/profiles/analytics/route.ts
/**
 * Analytics API for tracking and retrieving profile metrics
 *
 * Endpoints:
 * GET /api/profiles/analytics?resumeId=XXX - Get analytics for a resume
 * POST /api/profiles/analytics - Track a profile view or interaction
 */

import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import {
  getAnalytics,
  trackAnalyticsEvent,
  TrackingRequest,
} from "@/lib/services/analyticsService";
import {
  incrementJobSeekerMetric,
  incrementRecruiterMetric,
} from "@/lib/services/metricsService";
import {
  getAuthenticatedUserId,
  handleApiError,
  fetchResumeDocument,
} from "@/lib/utils/api-helpers";

/**
 * GET /api/profiles/analytics?resumeId=XXX
 * Retrieve analytics for a specific resume
 */
export async function GET(request: NextRequest) {
  const { userId: authUserId, error: authError } = await getAuthenticatedUserId(
    request
  );
  if (authError || !authUserId)
    return authError || handleApiError(null, "Unauthorized", 401);

  try {
    const resumeId = request.nextUrl.searchParams.get("resumeId");

    if (!resumeId) {
      return handleApiError(null, "resumeId parameter is required", 400);
    }

    // Verify ownership using helper
    const resumeDoc = await fetchResumeDocument(resumeId);
    if (!resumeDoc) {
      return handleApiError(null, "Resume not found", 404);
    }

    const { data: resumeData } = resumeDoc;
    if (resumeData?.userId !== authUserId) {
      // Check if user is admin
      const userSnap = await adminDb.collection("users").doc(authUserId).get();
      const userData = userSnap.data();
      if (userData?.role !== "admin") {
        logger.warn({ authUserId, resumeId, ownerId: resumeData?.userId }, "Unauthorized analytics access attempt");
        return handleApiError(
          null,
          "Forbidden: You do not own this resume",
          403
        );
      }
    }

    try {
      // Fetch owner details for display name
      const ownerSnap = await adminDb.collection("users").doc(resumeData?.userId || "").get();
      const ownerData = ownerSnap.data();
      const ownerName = ownerData?.displayName || ownerData?.email?.split('@')[0] || "Unknown User";

      const result = await getAnalytics(resumeId);

      return NextResponse.json({
        ...result,
        ownerName,
        resumeTitle: resumeData?.title || `Resume #${resumeId}`
      });
    } catch (innerError) {
      logger.error({ err: innerError, resumeId }, "Error fetching analytics from service");
      return handleApiError(innerError, "Failed to retrieve analytics data from service");
    }
  } catch (outerError) {
    logger.error({ err: outerError }, "Top-level error in resume analytics GET route");
    return handleApiError(outerError, "Failed to retrieve analytics");
  }
}

/**
 * POST /api/profiles/analytics
 * Track a profile view or interaction event
 */
export async function POST(request: NextRequest) {
  const { userId: authUserId } = await getAuthenticatedUserId(request);
  // POST can be anonymous for public profiles, but if userId is provided, it must match authUserId

  try {
    const trackingRequest = (await request.json()) as TrackingRequest;

    // Validate required fields
    if (!trackingRequest.resumeId || !trackingRequest.eventType) {
      return handleApiError(null, "resumeId and eventType are required", 400);
    }

    // Security: If userId is provided in request, it must match authenticated user
    if (
      trackingRequest.userId &&
      authUserId &&
      trackingRequest.userId !== authUserId
    ) {
      return handleApiError(null, "Forbidden: User ID mismatch", 403);
    }

    const result = await trackAnalyticsEvent(trackingRequest);

    // Update Aggregated Metrics (Fire & Forget / Parallel)
    // We await them to ensure execution in serverless environment
    try {
      const resumeSnap = await adminDb
        .collection("resumes")
        .doc(trackingRequest.resumeId)
        .get();
      const resumeData = resumeSnap.data();

      if (resumeData?.userId) {
        const ownerId = resumeData.userId;

        // Update Job Seeker Metrics (Owner)
        if (trackingRequest.eventType === "view") {
          await incrementJobSeekerMetric(ownerId, "profileViews");
        } else if (trackingRequest.eventType === "download") {
          await incrementJobSeekerMetric(ownerId, "downloads");
        }
        // Note: 'request' events are handled in /api/profiles/request-access to avoid double counting
      }

      // Update Recruiter Metrics (Viewer)
      if (trackingRequest.userId && trackingRequest.eventType === "view") {
        await incrementRecruiterMetric(
          trackingRequest.userId,
          "profilesViewed"
        );
      }
    } catch (metricError) {
      // Don't fail the request if metric update fails, just log it
      logger.error({ err: metricError }, "Failed to update aggregated metrics");
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "Failed to track analytics");
  }
}
