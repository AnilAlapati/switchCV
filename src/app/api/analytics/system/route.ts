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
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return handleApiError(error, "Unauthorized. Only admins and recruiters can access system analytics.", 403);
    }
    logger.error({ err: error, userId }, "Failed to fetch system analytics");
    return handleApiError(error, "Failed to fetch system analytics");
  }
}
