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

    // Always compute access requests from source of truth (collectionGroup query)
    const requestsSnapshot = await adminDb
      .collectionGroup("accessRequests")
      .where("fromUserId", "==", userId)
      .get();

    const accessRequests = {
      pending: 0,
      approved: 0,
      denied: 0,
    };

    const now = Date.now();

    requestsSnapshot.forEach((doc) => {
      const data = doc.data();
      const status = data.status as "pending" | "approved" | "denied";

      // For approved requests, check if they're expired
      if (status === "approved" && data.expiresAt) {
        try {
          const expiresAtMs = data.expiresAt.toDate
            ? data.expiresAt.toDate().getTime()
            : new Date(data.expiresAt).getTime();

          // If expired, don't count it
          if (expiresAtMs <= now) {
            return;
          }
        } catch (e) {
          console.warn("Failed to parse expiresAt:", e);
        }
      }

      if (accessRequests[status] !== undefined) {
        accessRequests[status]++;
      }
    });

    // Get other metrics from recruiterMetrics collection (preserved for backward compatibility)
    const metricsDoc = await adminDb
      .collection("recruiterMetrics")
      .doc(userId)
      .get();

    const metrics = metricsDoc.exists ? metricsDoc.data() : {};

    return NextResponse.json({
      totalSearches: metrics?.totalSearches || 0,
      totalProfileViews: metrics?.totalProfileViews || 0,
      accessRequests, // Always use computed values
      totalCandidatesInteracted: metrics?.totalCandidatesInteracted || 0,
      lastActivityAt: metrics?.lastActivityAt || null,
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch recruiter metrics");
  }
}
