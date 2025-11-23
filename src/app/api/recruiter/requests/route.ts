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

    // Fetch all requests made by this recruiter using Collection Group Query
    const requestsSnapshot = await adminDb
      .collectionGroup("accessRequests")
      .where("fromUserId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();

    const requests = await Promise.all(
      requestsSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const resumeId = doc.ref.parent.parent?.id; // accessRequests -> resumeDoc
        let resumeTitle = "Unknown Resume";
        let candidateName = "Unknown Candidate";

        if (resumeId) {
          const resumeDoc = await adminDb
            .collection("resumes")
            .doc(resumeId)
            .get();
          if (resumeDoc.exists) {
            const resumeData = resumeDoc.data();
            resumeTitle = resumeData?.title || "Untitled Resume";

            // Try to get candidate name from user profile
            if (resumeData?.userId) {
              const userDoc = await adminDb
                .collection("users")
                .doc(resumeData.userId)
                .get();
              candidateName =
                userDoc.data()?.displayName || "Unknown Candidate";
            }
          }
        }

        let timestampStr = new Date().toISOString();
        try {
          if (data.timestamp && typeof data.timestamp.toDate === "function") {
            timestampStr = data.timestamp.toDate().toISOString();
          } else if (data.timestamp) {
            timestampStr = new Date(data.timestamp).toISOString();
          }
        } catch (e) {
          console.warn(`Error parsing timestamp for request ${doc.id}`, e);
        }

        return {
          id: doc.id,
          ...data,
          resumeId,
          resumeTitle,
          candidateName,
          timestamp: timestampStr,
        };
      })
    );

    return NextResponse.json({ requests });
  } catch (error) {
    return handleApiError(error, "Failed to fetch recruiter requests");
  }
}
