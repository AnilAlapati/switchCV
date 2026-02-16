import { NextRequest, NextResponse } from "next/server";
import { getRecruiterSearchBreakdown } from "@/lib/recruiterSearchHistory";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { getRecruiterMetrics, getMarketInsights } from "@/lib/services/metricsService";
import { getUserRole } from "@/lib/services/userService";

export async function GET(request: NextRequest) {
  const { userId: authUserId, error: authError } = await getAuthenticatedUserId(
    request
  );
  if (authError || !authUserId)
    return authError || handleApiError(null, "Unauthorized", 401);

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return handleApiError(null, "userId is required", 400);
    }

    // Security: Only allow users to see their own metrics, unless they are an admin
    if (userId !== authUserId) {
      const authUserRole = await getUserRole(authUserId);
      if (authUserRole !== "admin") {
        return handleApiError(
          null,
          "Forbidden: You can only access your own metrics",
          403
        );
      }
    }

    const authUserRole = await getUserRole(authUserId);
    if (authUserRole !== "recruiter" && authUserRole !== "admin") {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }

    // Get metrics from Service
    const metrics = await getRecruiterMetrics(userId);
    const userSearchBreakdown = await getRecruiterSearchBreakdown(userId);
    const marketInsights = await getMarketInsights();

    // Inject global market insights for the "Market Insights" section
    const searchBreakdown = {
      ...userSearchBreakdown,
      // We use global data for the "Market Insights" breakdown to show the total talent pool
      uniqueCandidatesLast7Days: marketInsights.totalCount,
      topSkillsLast7Days: marketInsights.topSkills.slice(0, 3)
    };

    return NextResponse.json(
      {
        totalSearches: metrics?.totalSearches || 0,
        totalProfileViews: metrics?.totalProfileViews || 0,
        accessRequests: metrics?.accessRequests || {
          pending: 0,
          approved: 0,
          denied: 0,
        },
        totalCandidatesInteracted: metrics?.totalCandidatesInteracted || 0,
        lastActivityAt: metrics?.lastActivityAt || null,
        searchBreakdown,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    return handleApiError(error, "Failed to fetch recruiter metrics");
  }
}
