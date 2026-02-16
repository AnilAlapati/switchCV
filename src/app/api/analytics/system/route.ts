import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { getSystemAnalytics } from "@/lib/services/analyticsService";
import { verifyAdminRole } from "@/lib/services/userService";

export async function GET(request: NextRequest) {
  const { userId, error: authError } = await getAuthenticatedUserId(request);
  if (authError || !userId) {
    return (
      authError ||
      handleApiError(new Error("Unauthorized"), "Unauthorized", 401)
    );
  }

  // SECURITY: Only admins can access platform-wide analytics
  if (!(await verifyAdminRole(userId))) {
    return handleApiError(null, "Forbidden: Admin access required", 403);
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
    const errorText = String(error);
    if (errorText.includes("User not found")) {
      return handleApiError(null, "User not found", 404);
    }
    if (errorText.includes("Unauthorized")) {
      return handleApiError(error, "Unauthorized. Only admins and recruiters can access system analytics.", 403);
    }
    logger.error({ err: error, userId }, "Failed to fetch system analytics");
    return handleApiError(error, "Failed to fetch system analytics");
  }
}
