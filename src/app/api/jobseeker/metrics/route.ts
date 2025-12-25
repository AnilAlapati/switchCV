import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError || !authUserId) {
      return authError || handleApiError(null, "Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get("userId");

    if (!requestedUserId) {
      return handleApiError(null, "userId is required", 400);
    }

    // BOLA FIX: Verify that the authenticated user is accessing their own metrics
    if (authUserId !== requestedUserId) {
      logger.warn(
        { authUserId, requestedUserId },
        "BOLA attempt detected in JobSeeker Metrics API"
      );
      return handleApiError(
        null,
        "Forbidden: Cannot access metrics for another user",
        403
      );
    }

    const userId = requestedUserId;

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
