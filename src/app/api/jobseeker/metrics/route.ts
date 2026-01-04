import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError || !authUserId) {
      return authError || handleApiError(null, "Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");

    if (!requestedUserId) {
      return handleApiError(null, "userId is required", 400);
    }

    // BOLA FIX: Verify that the authenticated user is accessing their own metrics
    if (authUserId !== requestedUserId) {
      logger.warn(
        { authUserId, requestedUserId },
        "BOLA attempt detected in JobSeeker Metrics API"
      );
      return handleApiError(
        null,
        "Forbidden: Cannot access metrics for another user",
        403
      );
    }

    const userId = requestedUserId;

    // Get metrics from jobSeekerMetrics collection
    const metricsRef = adminDb.collection("jobSeekerMetrics").doc(userId);
    const metricsDoc = await metricsRef.get();
    const metrics = metricsDoc.exists ? metricsDoc.data() : {};

    // Return cached metrics immediately - no expensive calculations on the hot path
    // If contactRequests is missing, return 0 instead of calculating
    // A background job or admin script should handle backfilling missing data
    const contactRequests = metrics?.contactRequests ?? 0;

    return NextResponse.json({
      profileViews: metrics?.profileViews || 0,
      contactRequests: contactRequests,
      downloads: metrics?.downloads || 0,
      quality: metrics?.quality || 0,
      lastUpdated: metrics?.lastUpdated || null,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch job seeker metrics");
  }
}
