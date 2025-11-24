import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getRecruiterSearchBreakdown } from "@/lib/recruiterSearchHistory";
import { handleApiError } from "@/lib/utils/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return handleApiError(null, "userId is required", 400);
    }

    // Always compute access requests from source of truth (collectionGroup query)
    // We fetch both requests (for pending/denied) and grants (for active approved)
    const [requestsSnapshot, grantsSnapshot] = await Promise.all([
      adminDb
        .collectionGroup("accessRequests")
        .where("fromUserId", "==", userId)
        .get(),
      adminDb
        .collectionGroup("accessGrants")
        .where("toUserId", "==", userId)
        .get(),
    ]);

    const accessRequests = {
      pending: 0,
      approved: 0,
      denied: 0,
    };

    const now = new Date();

    // Count pending and denied from requests
    requestsSnapshot.forEach((doc) => {
      const data = doc.data();
      const status = data.status as "pending" | "approved" | "denied";

      if (status === "pending" || status === "denied") {
        accessRequests[status]++;
      }
    });

    // Count active approved from grants
    grantsSnapshot.forEach((doc) => {
      const data = doc.data();
      // If expiresAt is null/undefined, it's forever
      if (!data.expiresAt) {
        accessRequests.approved++;
        return;
      }

      try {
        const expiresAt = data.expiresAt.toDate
          ? data.expiresAt.toDate()
          : new Date(data.expiresAt);

        if (expiresAt > now) {
          accessRequests.approved++;
        }
      } catch (e) {
        console.warn("Failed to parse expiresAt:", e);
      }
    });

    // Get other metrics from recruiterMetrics collection (preserved for backward compatibility)
    const metricsDoc = await adminDb
      .collection("recruiterMetrics")
      .doc(userId)
      .get();

    const metrics = metricsDoc.exists ? metricsDoc.data() : {};
    const searchBreakdown = await getRecruiterSearchBreakdown(userId);

    return NextResponse.json({
      totalSearches: metrics?.totalSearches || 0,
      totalProfileViews: metrics?.totalProfileViews || 0,
      accessRequests, // Always use computed values
      totalCandidatesInteracted: metrics?.totalCandidatesInteracted || 0,
      lastActivityAt: metrics?.lastActivityAt || null,
      searchBreakdown,
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch recruiter metrics");
  }
}
