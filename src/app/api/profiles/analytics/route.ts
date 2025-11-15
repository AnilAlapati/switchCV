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

/**
 * GET /api/profiles/analytics?resumeId=XXX
 * Retrieve analytics for a specific resume
 */
export async function GET(request: NextRequest) {
  try {
    const resumeId = request.nextUrl.searchParams.get("resumeId");

    if (!resumeId) {
      return NextResponse.json(
        { error: "resumeId parameter is required" },
        { status: 400 }
      );
    }

    const result = await getAnalytics(resumeId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve analytics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: "resumeId and eventType are required" },
        { status: 400 }
      );
    }

    const result = await trackAnalyticsEvent(trackingRequest);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Analytics POST error:", error);
    return NextResponse.json(
      {
        error: "Failed to track analytics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
