import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import {
  decrementJobSeekerMetric,
  updateRecruiterAccessMetric,
} from "@/lib/services/metricsService";

/**
 * Helper to verify recruiter role
 */
async function verifyRecruiterRole(userId: string): Promise<boolean> {
  const userSnap = await adminDb.collection("users").doc(userId).get();
  const userData = userSnap.data();
  return userData?.role === "recruiter" || userData?.role === "admin";
}

export async function GET(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    if (!(await verifyRecruiterRole(userId))) {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }

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
  } catch (error: unknown) {
    return handleApiError(error, "Failed to fetch recruiter requests");
  }
}

function serializeTimestamp(value: unknown): string | null {
  if (!value) return null;
  try {
    const timestampValue = value as { toDate?: () => Date };
    if (typeof timestampValue.toDate === "function") {
      return timestampValue.toDate().toISOString();
    }
    if (typeof value === "string" || value instanceof Date) {
      return new Date(value).toISOString();
    }
  } catch (error: unknown) {
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

export async function POST(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    if (!(await verifyRecruiterRole(userId))) {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }

    // This route could be used for bulk requests or other recruiter-specific POST actions
    // For now, we'll just return a 405 or handle simple ping
    return handleApiError(null, "Method not allowed", 405);
  } catch (error: unknown) {
    return handleApiError(error, "Failed to process recruiter request");
  }
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

    // Update Metrics
    const status = data?.status;
    const resumeDoc = await adminDb.collection("resumes").doc(resumeId).get();
    const resumeOwnerId = resumeDoc.data()?.userId;

    if (status === "pending" && resumeOwnerId) {
      await decrementJobSeekerMetric(resumeOwnerId, "contactRequests");
    }

    if (status && ["pending", "approved", "denied"].includes(status)) {
      await updateRecruiterAccessMetric(userId, status, -1);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, "Failed to delete request");
  }
}
