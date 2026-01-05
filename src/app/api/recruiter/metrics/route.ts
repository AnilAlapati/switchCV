import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
// eslint-disable-next-line no-restricted-imports
import { FieldValue } from "firebase-admin/firestore";
import { getRecruiterSearchBreakdown } from "@/lib/recruiterSearchHistory";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

/**
 * Helper to verify recruiter role
 */
async function verifyRecruiterRole(userId: string): Promise<boolean> {
  const userSnap = await adminDb.collection("users").doc(userId).get();
  const userData = userSnap.data();
  return userData?.role === "recruiter" || userData?.role === "admin";
}

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
      const authUserSnap = await adminDb
        .collection("users")
        .doc(authUserId)
        .get();
      const authUserData = authUserSnap.data();
      if (authUserData?.role !== "admin") {
        return handleApiError(
          null,
          "Forbidden: You can only access your own metrics",
          403
        );
      }
    }

    if (!(await verifyRecruiterRole(authUserId))) {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }

    // Get metrics from recruiterMetrics collection
    const metricsRef = adminDb.collection("recruiterMetrics").doc(userId);
    const metricsDoc = await metricsRef.get();
    const metrics = metricsDoc.exists ? metricsDoc.data() : {};

    // Return cached metrics immediately - no expensive calculations on the hot path
    // If accessRequests is missing, return default structure instead of calculating
    // A background job or admin script should handle backfilling missing data
    const accessRequests = metrics?.accessRequests || {
      pending: 0,
      approved: 0,
      denied: 0,
    };

    const searchBreakdown = await getRecruiterSearchBreakdown(userId);

    return NextResponse.json({
      totalSearches: metrics?.totalSearches || 0,
      totalProfileViews: metrics?.totalProfileViews || 0,
      accessRequests,
      totalCandidatesInteracted: metrics?.totalCandidatesInteracted || 0,
      lastActivityAt: metrics?.lastActivityAt || null,
      searchBreakdown,
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch recruiter metrics");
  }
}
