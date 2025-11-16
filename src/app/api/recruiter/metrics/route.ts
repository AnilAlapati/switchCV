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

    // Get recruiter metrics from Firestore
    const metricsDoc = await adminDb
      .collection("recruiterMetrics")
      .doc(userId)
      .get();

    if (!metricsDoc.exists) {
      // Return default metrics if not found
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

    return NextResponse.json(metricsDoc.data());
  } catch (error) {
    console.error("Error fetching recruiter metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch recruiter metrics" },
      { status: 500 }
    );
  }
}
