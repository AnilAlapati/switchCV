import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { createNotification } from "@/lib/notificationService";
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
} from "@/lib/notifications.types";
import {
  DurationSelectionInput,
  NormalizedDuration,
  normalizeDuration,
} from "@/lib/accessDuration";

interface RespondAccessPayload {
  requestId: string;
  resumeId: string;
  action: "approve" | "deny";
  grantDuration?: DurationSelectionInput;
  timezone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    const { requestId, resumeId, action, grantDuration, timezone } =
      (await request.json()) as RespondAccessPayload;

    if (!requestId || !resumeId || !["approve", "deny"].includes(action)) {
      return handleApiError(null, "Invalid request", 400);
    }

    // Verify ownership
    const resumeDoc = await adminDb.collection("resumes").doc(resumeId).get();
    if (!resumeDoc.exists || resumeDoc.data()?.userId !== userId) {
      return handleApiError(null, "Unauthorized", 403);
    }

    const requestRef = adminDb
      .collection("resumes")
      .doc(resumeId)
      .collection("accessRequests")
      .doc(requestId);

    const requestDoc = await requestRef.get();
    if (!requestDoc.exists) {
      return handleApiError(null, "Request not found", 404);
    }

    const requestData = requestDoc.data();

    const status = action === "approve" ? "approved" : "denied";

    let normalizedGrant: NormalizedDuration | null = null;
    let expiresAtTimestamp: Timestamp | null = null;

    if (status === "approved") {
      try {
        if (grantDuration) {
          normalizedGrant = normalizeDuration(
            grantDuration,
            timezone || requestData?.requestedDuration?.timezone || "UTC"
          );
        } else if (requestData?.requestedDuration) {
          normalizedGrant = {
            ...requestData.requestedDuration,
            timezone:
              timezone || requestData.requestedDuration.timezone || "UTC",
          };
        } else {
          normalizedGrant = normalizeDuration({ preset: "1_week" }, "UTC");
        }
      } catch (durationError) {
        return handleApiError(
          durationError,
          durationError instanceof Error
            ? durationError.message
            : "Invalid duration",
          400
        );
      }

      if (!normalizedGrant) {
        return handleApiError(null, "Unable to resolve duration", 400);
      }

      const requestedDurationMs =
        requestData?.requestedDuration?.durationMs ?? null;
      if (
        requestedDurationMs !== null &&
        normalizedGrant.durationMs > requestedDurationMs
      ) {
        return handleApiError(
          null,
          "Cannot grant longer than the requested duration",
          400
        );
      }

      const now = new Date();
      const expiresAtDate = new Date(
        now.getTime() + normalizedGrant.durationMs
      );
      expiresAtTimestamp = Timestamp.fromDate(expiresAtDate);
    }

    await requestRef.update({
      status,
      approvedAt: status === "approved" ? FieldValue.serverTimestamp() : null,
      grantedDuration: normalizedGrant,
      expiresAt: expiresAtTimestamp,
      processedBy: userId,
    });

    if (status === "approved" && normalizedGrant) {
      await adminDb
        .collection("resumes")
        .doc(resumeId)
        .collection("accessGrants")
        .add({
          toUserId: requestData?.fromUserId,
          requestId,
          grantedAt: FieldValue.serverTimestamp(),
          expiresAt: expiresAtTimestamp,
          duration: normalizedGrant,
          grantedBy: userId,
        });
    }

    // Notify Recruiter
    const resumeTitle = resumeDoc.data()?.title || "resume";

    if (requestData?.fromUserId) {
      const bodyMessage =
        status === "approved"
          ? `Your request to view ${resumeTitle} was approved for ${normalizedGrant?.label}.`
          : `Your request to view ${resumeTitle} was denied.`;

      await createNotification(
        NotificationType.ACCESS_GRANTED,
        requestData.fromUserId,
        {
          title: `Resume Access ${
            status === "approved" ? "Granted" : "Denied"
          }`,
          body: bodyMessage,
          actionUrl: status === "approved" ? `/resumes/${resumeId}` : undefined,
          data: {
            requestId,
            resumeId,
            duration: normalizedGrant,
            expiresAt: expiresAtTimestamp,
          },
        },
        [NotificationChannel.IN_APP],
        NotificationPriority.HIGH
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to process response");
  }
}
