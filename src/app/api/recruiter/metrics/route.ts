import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { handleApiError } from "@/lib/utils/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return handleApiError(null, "userId is required", 400);
    }

    // Get recruiter metrics from Firestore
    const metricsDoc = await adminDb
      .collection("recruiterMetrics")
      .doc(userId)
      .get();

    let metrics = metricsDoc.exists ? metricsDoc.data() : null;

    // If metrics don't exist or access requests are all zero, try to recalculate
    const accessRequests = metrics?.accessRequests || {
      pending: 0,
      approved: 0,
      denied: 0,
    };

    const allZeros =
      accessRequests.pending === 0 &&
      accessRequests.approved === 0 &&
      accessRequests.denied === 0;

    if (!metrics || allZeros) {
      try {
        // Recalculate access requests from source of truth
        const requestsSnapshot = await adminDb
          .collectionGroup("accessRequests")
          .where("fromUserId", "==", userId)
          .get();

        const calculatedRequests = {
          pending: 0,
          approved: 0,
          denied: 0,
        };

        requestsSnapshot.forEach((doc) => {
          const status = doc.data().status as "pending" | "approved" | "denied";
          if (calculatedRequests[status] !== undefined) {
            calculatedRequests[status]++;
          }
        });

        // Update metrics with calculated values
        await adminDb
          .collection("recruiterMetrics")
          .doc(userId)
          .set(
            {
              accessRequests: calculatedRequests,
              // Preserve other metrics if they exist, otherwise init to 0
              totalSearches: metrics?.totalSearches || 0,
              totalProfileViews: metrics?.totalProfileViews || 0,
              totalCandidatesInteracted:
                metrics?.totalCandidatesInteracted || 0,
            },
            { merge: true }
          );

        // Use calculated values
        metrics = {
          ...metrics,
          accessRequests: calculatedRequests,
        };
      } catch (calcError) {
        console.error("Failed to recalculate metrics:", calcError);
        // Fallback to default if calculation fails (e.g. missing index)
      }
    }

    if (!metrics) {
      // Return default metrics if still not found
      return NextResponse.json({
        totalSearches: 0,
        totalProfileViews: 0,
        accessRequests: {
          pending: 0,
          approved: 0,
          denied: 0,
        },
        totalCandidatesInteracted: 0,
        lastActivityAt: null,
      });
    }

    return NextResponse.json(metrics);
  } catch (error) {
    return handleApiError(error, "Failed to fetch recruiter metrics");
  }
}
