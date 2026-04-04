// Analytics API Endpoint - Dashboard and metrics
// Refactored to use AnalyticsService

import { NextRequest, NextResponse } from "next/server";
import {
  getDashboardAnalytics,
  getAnalytics,
} from "@/lib/services/analyticsService";
import { logger } from "@/lib/logger";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { COLLECTIONS, collectionRef } from "@/lib/dal";
import {
  DashboardAnalyticsQuerySchema,
  DashboardAnalyticsRequestSchema,
} from "@/lib/schemas/api";

async function resolveResumeOwnerId(resumeId: string): Promise<string | null> {
  let resumeDoc = await collectionRef(COLLECTIONS.RESUMES).doc(resumeId).get();
  if (!resumeDoc.exists) {
    resumeDoc = await collectionRef(COLLECTIONS.RESUME_PROFILES)
      .doc(resumeId)
      .get();
  }

  const ownerId = resumeDoc.data()?.userId;
  return typeof ownerId === "string" && ownerId.length > 0 ? ownerId : null;
}

async function authorizeAnalyticsAccess(
  authUserId: string,
  resumeId: string,
  requestedUserId?: string,
): Promise<{ userId: string; error?: NextResponse }> {
  const authUserDoc = await collectionRef(COLLECTIONS.USERS)
    .doc(authUserId)
    .get();
  const isAdmin = authUserDoc.data()?.role === "admin";

  const ownerId = await resolveResumeOwnerId(resumeId);
  if (!ownerId) {
    return {
      userId: "",
      error: handleApiError(null, "Resume not found", 404),
    };
  }

  if (!isAdmin && ownerId !== authUserId) {
    return {
      userId: "",
      error: handleApiError(null, "Forbidden: Access denied", 403),
    };
  }

  if (requestedUserId && requestedUserId !== ownerId) {
    return {
      userId: "",
      error: handleApiError(
        null,
        "Forbidden: Resume does not belong to specified user",
        403,
      ),
    };
  }

  return { userId: requestedUserId || ownerId };
}

/**
 * POST /api/analytics/dashboard - Get analytics dashboard
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Missing resumeId or userId" },
        { status: 400 },
      );
    }

    const parseResult = DashboardAnalyticsRequestSchema.safeParse(payload);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: "Missing resumeId or userId" },
        { status: 400 },
      );
    }
    const { resumeId } = parseResult.data;
    const requestedUserId = parseResult.data.userId || undefined;

    if (!resumeId) {
      return NextResponse.json(
        { success: false, message: "Missing resumeId or userId" },
        { status: 400 },
      );
    }

    const accessCheck = await authorizeAnalyticsAccess(
      authUserId!,
      resumeId,
      requestedUserId,
    );
    if (accessCheck.error) return accessCheck.error;
    const userId = accessCheck.userId;

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

    const parseResult = DashboardAnalyticsQuerySchema.safeParse({
      resumeId: request.nextUrl.searchParams.get("resumeId"),
      userId: request.nextUrl.searchParams.get("userId") || undefined,
    });
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: "Missing resumeId or userId" },
        { status: 400 },
      );
    }

    const { resumeId } = parseResult.data;
    const requestedUserId = parseResult.data.userId || undefined;

    if (!resumeId) {
      return NextResponse.json(
        { success: false, message: "Missing resumeId or userId" },
        { status: 400 },
      );
    }

    const accessCheck = await authorizeAnalyticsAccess(
      authUserId!,
      resumeId,
      requestedUserId,
    );
    if (accessCheck.error) return accessCheck.error;
    const userId = accessCheck.userId;

    // Use regular getAnalytics for simple summary
    const result = await getAnalytics(resumeId);

    // Flatten logic to match previous response shape
    const analyticsRecord = result.analytics as unknown as Record<
      string,
      unknown
    >;
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

    return NextResponse.json(
      {
        success: true,
        data: analytics,
        timestamp: new Date(),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "Failed to retrieve analytics");
  }
}
