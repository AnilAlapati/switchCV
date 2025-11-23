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

    // Always compute contactRequests from source of truth
    const resumesSnapshot = await adminDb
      .collection("resumes")
      .where("userId", "==", userId)
      .get();

    let contactRequests = 0;

    if (!resumesSnapshot.empty) {
      const countPromises = resumesSnapshot.docs.map((doc) =>
        doc.ref
          .collection("accessRequests")
          .where("status", "==", "pending")
          .count()
          .get()
      );

      const countSnapshots = await Promise.all(countPromises);
      contactRequests = countSnapshots.reduce(
        (acc, snap) => acc + snap.data().count,
        0
      );
    }

    // Get other metrics from jobSeekerMetrics collection (preserved for backward compatibility)
    const metricsDoc = await adminDb
      .collection("jobSeekerMetrics")
      .doc(userId)
      .get();

    const metrics = metricsDoc.exists ? metricsDoc.data() : {};

    return NextResponse.json({
      profileViews: metrics?.profileViews || 0,
      contactRequests, // Always use computed value
      downloads: metrics?.downloads || 0,
      quality: metrics?.quality || 0,
      lastUpdated: metrics?.lastUpdated || null,
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch job seeker metrics");
  }
}
