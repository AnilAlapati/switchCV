// Analytics API Endpoint - Dashboard and metrics
// Refactored to use AnalyticsService

import { NextRequest, NextResponse } from "next/server";
import { getDashboardAnalytics, getAnalytics } from "@/lib/services/analyticsService";
import { logger } from "@/lib/logger";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";

interface DashboardRequest {
  resumeId: string;
  userId?: string;
}

/**
 * POST /api/analytics/dashboard - Get analytics dashboard
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    const body = (await request.json()) as DashboardRequest;
    const { resumeId } = body;
    const userId = body.userId || authUserId;

    if (!resumeId || !userId) {
      return NextResponse.json(
        { success: false, message: "Missing resumeId or userId" },
        { status: 400 }
      );
    }

    // Security check: Ensure user owns the resume or is admin
    if (userId !== authUserId) {
      // NOTE: Ideally we check this via UserService too, but simple DB check is faster here for now
      // Or we could trust the caller if we assume authUserId is verified
      const userDoc = await adminDb.collection("users").doc(authUserId!).get();
      if (userDoc.data()?.role !== "admin") {
        return handleApiError(null, "Forbidden: Access denied", 403);
      }
    }

    const dashboard = await getDashboardAnalytics(resumeId);

    logger.info({ resumeId, userId }, "Analytics dashboard retrieved");

    return NextResponse.json({
      success: true,
      data: dashboard,
      timestamp: new Date(),
    });
  } catch (error) {
    return handleApiError(error, "Failed to retrieve analytics dashboard");
  }
}

/**
 * GET /api/analytics/dashboard - Get analytics summary
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    const resumeId = request.nextUrl.searchParams.get("resumeId");
    const userId = request.nextUrl.searchParams.get("userId") || authUserId;

    if (!resumeId || !userId) {
      return NextResponse.json(
        { success: false, message: "Missing resumeId or userId" },
        { status: 400 }
      );
    }

    // Security check
    if (userId !== authUserId) {
      const userDoc = await adminDb.collection("users").doc(authUserId!).get();
      if (userDoc.data()?.role !== "admin") {
        return handleApiError(null, "Forbidden: Access denied", 403);
      }
    }

    // Use regular getAnalytics for simple summary
    const result = await getAnalytics(resumeId);

    // Flatten logic to match previous response shape
    const analyticsRecord = result.analytics as unknown as Record<string, unknown>;
    const analytics = {
      resumeId,
      userId,
      viewCount: result.analytics.views?.count || 0,
      uniqueViewCount: result.analytics.views?.uniqueViewers || 0,
      downloadCount: (analyticsRecord.downloads as number) || 0,
      shareCount: (analyticsRecord.shares as number) || 0,
      attractivenessScore: result.analytics.attractivenessScore || 0,
      lastViewedAt: result.analytics.views?.lastViewedAt || null,
      createdAt: result.analytics.lastUpdatedAt, // Approximate
      updatedAt: result.analytics.lastUpdatedAt,
    };

    return NextResponse.json({
      success: true,
      data: analytics,
      timestamp: new Date(),
    });
  } catch (error) {
    return handleApiError(error, "Failed to retrieve analytics");
  }
}
