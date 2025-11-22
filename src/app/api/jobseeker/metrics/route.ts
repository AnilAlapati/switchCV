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

    if (!metricsDoc.exists) {
      // Return default metrics if not found
      return NextResponse.json({
        profileViews: 0,
        contactRequests: 0,
        downloads: 0,
        quality: 0,
        lastUpdated: null,
      });
    }

    return NextResponse.json(metricsDoc.data());
  } catch (error) {
    return handleApiError(error, "Failed to fetch job seeker metrics");
  }
}
