import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
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
    console.error("Error fetching job seeker metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch job seeker metrics" },
      { status: 500 }
    );
  }
}
