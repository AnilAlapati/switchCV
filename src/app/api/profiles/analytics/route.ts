// src/app/api/profiles/analytics/route.ts
/**
 * Analytics API for tracking and retrieving profile metrics
 *
 * Endpoints:
 * GET /api/profiles/analytics?resumeId=XXX - Get analytics for a resume
 * POST /api/profiles/analytics - Track a profile view or interaction
 */

import { NextRequest, NextResponse } from "next/server";
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
import { handleApiError } from "@/lib/utils/api-helpers";

/**
 * GET /api/profiles/analytics?resumeId=XXX
 * Retrieve analytics for a specific resume
 */
export async function GET(request: NextRequest) {
  try {
    const resumeId = request.nextUrl.searchParams.get("resumeId");

    if (!resumeId) {
      return handleApiError(null, "resumeId parameter is required", 400);
    }

    const result = await getAnalytics(resumeId);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "Failed to retrieve analytics");
  }
}

/**
 * POST /api/profiles/analytics
 * Track a profile view or interaction event
 */
export async function POST(request: NextRequest) {
  try {
    const trackingRequest = (await request.json()) as TrackingRequest;

    // Validate required fields
    if (!trackingRequest.resumeId || !trackingRequest.eventType) {
      return handleApiError(null, "resumeId and eventType are required", 400);
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
