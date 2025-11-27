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

        const timestampStr = serializeTimestamp(data.timestamp);
        const approvedAt = serializeTimestamp(data.approvedAt);
        const expiresAt = serializeTimestamp(data.expiresAt);

        const { isExpired, timeRemainingMs } = calculateExpiryState(expiresAt);

        return {
          id: doc.id,
          ...data,
          resumeId,
          resumeTitle,
          candidateName,
          timestamp: timestampStr,
          approvedAt,
          expiresAt,
          isExpired,
          timeRemainingMs,
        };
      })
    );

    return NextResponse.json({ requests });
  } catch (error) {
    return handleApiError(error, "Failed to fetch recruiter requests");
  }
}

function serializeTimestamp(value: any): string | null {
  if (!value) return null;
  try {
    if (typeof value.toDate === "function") {
      return value.toDate().toISOString();
    }
    if (typeof value === "string" || value instanceof Date) {
      return new Date(value).toISOString();
    }
  } catch (error) {
    logger.warn({ err: error }, "Failed to serialize timestamp");
  }
  return null;
}

function calculateExpiryState(expiresAtIso: string | null) {
  if (!expiresAtIso) {
    return { isExpired: false, timeRemainingMs: null };
  }

  const expiresAtMs = Date.parse(expiresAtIso);
  if (Number.isNaN(expiresAtMs)) {
    return { isExpired: false, timeRemainingMs: null };
  }

  const nowMs = Date.now();
  const remaining = expiresAtMs - nowMs;

  return {
    isExpired: remaining <= 0,
    timeRemainingMs: remaining,
  };
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");
    const resumeId = searchParams.get("resumeId");

    if (!requestId || !resumeId) {
      return handleApiError(null, "Missing requestId or resumeId", 400);
    }

    const requestRef = adminDb
      .collection("resumes")
      .doc(resumeId)
      .collection("accessRequests")
      .doc(requestId);

    const doc = await requestRef.get();

    if (!doc.exists) {
      return handleApiError(null, "Request not found", 404);
    }

    const data = doc.data();
    if (data?.fromUserId !== userId) {
      return handleApiError(null, "Unauthorized to delete this request", 403);
    }

    await requestRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to delete request");
  }
}
