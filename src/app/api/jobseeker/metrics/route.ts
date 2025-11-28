import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { handleApiError } from "@/lib/utils/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return handleApiError(null, "userId is required", 400);
    }

    // Get metrics from jobSeekerMetrics collection
    const metricsRef = adminDb.collection("jobSeekerMetrics").doc(userId);
    const metricsDoc = await metricsRef.get();
    const metrics = metricsDoc.exists ? metricsDoc.data() : {};

    let contactRequests = metrics?.contactRequests;

    // Lazy Migration: If contactRequests is missing, calculate and save it
    if (typeof contactRequests !== "number") {
      const resumesSnapshot = await adminDb
        .collection("resumes")
        .where("userId", "==", userId)
        .get();

      let calculatedRequests = 0;

      if (!resumesSnapshot.empty) {
        const countPromises = resumesSnapshot.docs.map((doc) =>
          doc.ref
            .collection("accessRequests")
            .where("status", "==", "pending")
            .count()
            .get()
        );

        const countSnapshots = await Promise.all(countPromises);
        calculatedRequests = countSnapshots.reduce(
          (acc, snap) => acc + snap.data().count,
          0
        );
      }

      contactRequests = calculatedRequests;

      // Save back to Firestore
      await metricsRef.set(
        {
          contactRequests: calculatedRequests,
          lastUpdated: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      profileViews: metrics?.profileViews || 0,
      contactRequests: contactRequests,
      downloads: metrics?.downloads || 0,
      quality: metrics?.quality || 0,
      lastUpdated: metrics?.lastUpdated || null,
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch job seeker metrics");
  }
}
