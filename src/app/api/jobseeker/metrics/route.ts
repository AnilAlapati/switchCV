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

    // Get job seeker metrics from Firestore
    const metricsDoc = await adminDb
      .collection("jobSeekerMetrics")
      .doc(userId)
      .get();

    let metrics = metricsDoc.exists ? metricsDoc.data() : {};

    // Self-healing: If contactRequests is missing or 0, verify with actual count
    // This ensures users see correct counts even if the incremental update failed previously
    if (!metrics?.contactRequests) {
      const resumesSnapshot = await adminDb
        .collection("resumes")
        .where("userId", "==", userId)
        .get();

      if (!resumesSnapshot.empty) {
        const countPromises = resumesSnapshot.docs.map((doc) =>
          doc.ref
            .collection("accessRequests")
            .where("status", "==", "pending")
            .count()
            .get()
        );

        const countSnapshots = await Promise.all(countPromises);
        const actualCount = countSnapshots.reduce(
          (acc, snap) => acc + snap.data().count,
          0
        );

        if (actualCount > 0) {
          metrics = { ...metrics, contactRequests: actualCount };
          // Update Firestore to fix the drift
          await adminDb
            .collection("jobSeekerMetrics")
            .doc(userId)
            .set({ contactRequests: actualCount }, { merge: true });
        }
      }
    }

    if (!metricsDoc.exists && !metrics?.contactRequests) {
      // Return default metrics if not found and no requests found
      return NextResponse.json({
        profileViews: 0,
        contactRequests: 0,
        downloads: 0,
        quality: 0,
        lastUpdated: null,
      });
    }

    return NextResponse.json(metrics);
  } catch (error) {
    return handleApiError(error, "Failed to fetch job seeker metrics");
  }
}
