import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
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

    let accessRequests = metrics?.accessRequests;

    // Lazy Migration: If accessRequests is missing, calculate and save it
    if (!accessRequests) {
      accessRequests = {
        pending: 0,
        approved: 0,
        denied: 0,
      };

      try {
        // Compute access requests from source of truth (collectionGroup query)
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
            logger.warn({ err: e }, "Failed to parse expiresAt:");
          }
        });

        // Save back to Firestore
        await metricsRef.set(
          {
            accessRequests,
            lastUpdated: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch (error: any) {
        logger.warn(
          "Failed to fetch access requests/grants (likely missing index):",
          error.message
        );
      }
    }

    const searchBreakdown = await getRecruiterSearchBreakdown(userId);

    return NextResponse.json({
      totalSearches: metrics?.totalSearches || 0,
      totalProfileViews: metrics?.totalProfileViews || 0,
      accessRequests,
      totalCandidatesInteracted: metrics?.totalCandidatesInteracted || 0,
      lastActivityAt: metrics?.lastActivityAt || null,
      searchBreakdown,
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch recruiter metrics");
  }
}
