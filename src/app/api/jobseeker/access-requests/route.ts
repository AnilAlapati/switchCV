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

    console.log(`Fetching access requests for user: ${userId}`);
    console.log(`Found ${resumesSnapshot.size} resumes.`);

    for (const resumeDoc of resumesSnapshot.docs) {
      const accessRequestsSnapshot = await resumeDoc.ref
        .collection("accessRequests")
        .orderBy("timestamp", "desc")
        .get();

      console.log(
        `Resume ${resumeDoc.id}: Found ${accessRequestsSnapshot.size} total requests.`
      );

      accessRequestsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        let timestampStr = new Date().toISOString();

        try {
          if (data.timestamp && typeof data.timestamp.toDate === "function") {
            timestampStr = data.timestamp.toDate().toISOString();
          } else if (data.timestamp) {
            // Handle case where it might be a string or number already
            timestampStr = new Date(data.timestamp).toISOString();
          }
        } catch (e) {
          console.warn(`Error parsing timestamp for request ${doc.id}`, e);
        }

        requests.push({
          id: doc.id,
          ...data,
          resumeId: resumeDoc.id,
          resumeTitle: resumeDoc.data().title || "Untitled Resume",
          timestamp: timestampStr,
        });
      });
    }

    console.log(`Total requests returning: ${requests.length}`);
    return NextResponse.json({ requests });
  } catch (error) {
    return handleApiError(error, "Failed to fetch requests");
  }
}
