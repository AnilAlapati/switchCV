import { logger } from "@/lib/logger";
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

    logger.info(`Fetching access requests for user: ${userId}`);
    logger.info(`Found ${resumesSnapshot.size} resumes.`);

    for (const resumeDoc of resumesSnapshot.docs) {
      const accessRequestsSnapshot = await resumeDoc.ref
        .collection("accessRequests")
        .orderBy("timestamp", "desc")
        .get();

      logger.info(
        `Resume ${resumeDoc.id}: Found ${accessRequestsSnapshot.size} total requests.`
      );

      accessRequestsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        let timestampStr = new Date().toISOString();
        let approvedAtStr: string | null = null;
        let expiresAtStr: string | null = null;

        try {
          if (data.timestamp && typeof data.timestamp.toDate === "function") {
            timestampStr = data.timestamp.toDate().toISOString();
          } else if (data.timestamp) {
            // Handle case where it might be a string or number already
            timestampStr = new Date(data.timestamp).toISOString();
          }

          if (data.approvedAt && typeof data.approvedAt.toDate === "function") {
            approvedAtStr = data.approvedAt.toDate().toISOString();
          } else if (data.approvedAt) {
            approvedAtStr = new Date(data.approvedAt).toISOString();
          }

          if (data.expiresAt && typeof data.expiresAt.toDate === "function") {
            expiresAtStr = data.expiresAt.toDate().toISOString();
          } else if (data.expiresAt) {
            expiresAtStr = new Date(data.expiresAt).toISOString();
          }
        } catch (e) {
          logger.warn(
            { err: e },
            `Error parsing timestamp for request ${doc.id}`
          );
        }

        const rest = { ...data };
        delete rest.approvedAt;
        delete rest.expiresAt;

        const responsePayload: Record<string, any> = {
          id: doc.id,
          ...rest,
          resumeId: resumeDoc.id,
          resumeTitle: resumeDoc.data().title || "Untitled Resume",
          timestamp: timestampStr,
        };

        if (approvedAtStr) {
          responsePayload.approvedAt = approvedAtStr;
        }

        if (expiresAtStr) {
          responsePayload.expiresAt = expiresAtStr;
        }

        requests.push(responsePayload);
      });
    }

    logger.info(`Total requests returning: ${requests.length}`);
    return NextResponse.json({ requests }, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch requests");
  }
}
