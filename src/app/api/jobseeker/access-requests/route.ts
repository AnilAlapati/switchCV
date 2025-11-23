import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    // Get all resumes for user
    const resumesSnapshot = await adminDb
      .collection("resumes")
      .where("userId", "==", userId)
      .get();

    const requests: any[] = [];

    for (const resumeDoc of resumesSnapshot.docs) {
      const accessRequestsSnapshot = await resumeDoc.ref
        .collection("accessRequests")
        .where("status", "==", "pending")
        .get();

      accessRequestsSnapshot.docs.forEach((doc) => {
        requests.push({
          id: doc.id,
          ...doc.data(),
          resumeId: resumeDoc.id,
          resumeTitle: resumeDoc.data().title || "Untitled Resume",
          timestamp: doc.data().timestamp?.toDate().toISOString(),
        });
      });
    }

    return NextResponse.json({ requests });
  } catch (error) {
    return handleApiError(error, "Failed to fetch requests");
  }
}
