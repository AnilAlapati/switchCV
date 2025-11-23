import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
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

export async function POST(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    if (!userId) return handleApiError(null, "Unauthorized", 401);

    const { requestId, resumeId, action } = await request.json();

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

    const status = action === "approve" ? "approved" : "denied";
    await requestRef.update({ status });

    const requestData = requestDoc.data();

    // Update recruiter metrics
    if (requestData?.fromUserId) {
      const metricsRef = adminDb
        .collection("recruiterMetrics")
        .doc(requestData.fromUserId);

      const updates: Record<string, any> = {
        "accessRequests.pending": FieldValue.increment(-1),
      };

      if (status === "approved") {
        updates["accessRequests.approved"] = FieldValue.increment(1);
      } else {
        updates["accessRequests.denied"] = FieldValue.increment(1);
      }

      await metricsRef.set(updates, { merge: true }).catch((err) => {
        console.error("Failed to update recruiter metrics:", err);
      });
    }

    // Notify Recruiter
    if (requestData?.fromUserId) {
      await createNotification(
        NotificationType.ACCESS_GRANTED,
        requestData.fromUserId,
        {
          title: `Resume Access ${
            status === "approved" ? "Granted" : "Denied"
          }`,
          body: `Your request to view ${
            resumeDoc.data()?.title || "resume"
          } has been ${status}.`,
          actionUrl: status === "approved" ? `/resumes/${resumeId}` : undefined,
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
