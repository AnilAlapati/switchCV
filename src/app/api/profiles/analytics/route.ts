// src/app/api/profiles/analytics/route.ts
/**
 * Analytics API for tracking and retrieving profile metrics
 *
 * Endpoints:
 * GET /api/profiles/analytics?resumeId=XXX - Get analytics for a resume
 * POST /api/profiles/analytics - Track a profile view or interaction
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAnalytics,
  trackAnalyticsEvent,
  TrackingRequest,
} from "@/lib/services/analyticsService";
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
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, "Failed to track analytics");
  }
}
