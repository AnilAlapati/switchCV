import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { getSystemAnalytics } from "@/lib/services/analyticsService";

export async function GET(request: NextRequest) {
  const { userId, error: authError } = await getAuthenticatedUserId(request);
  if (authError || !userId) {
    return (
      authError ||
      handleApiError(new Error("Unauthorized"), "Unauthorized", 401)
    );
  }

  try {
    const analytics = await getSystemAnalytics(userId);

    logger.info(
      { userId, totalUsers: analytics.totalUsers },
      "System analytics fetched"
    );

    return NextResponse.json(analytics, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "User not found") {
      return handleApiError(null, "User not found", 404);
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return handleApiError(error, "Unauthorized. Only admins and recruiters can access system analytics.", 403);
    }
    logger.error({ err: error, userId }, "Failed to fetch system analytics");
    // Include detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const detailedMessage = `Failed to fetch system analytics: ${errorMessage}`;
    return handleApiError(error, detailedMessage);
  }
}
