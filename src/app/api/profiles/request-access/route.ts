// src/app/api/profiles/request-access/route.ts
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
import {
  DurationSelectionInput,
  normalizeDuration,
} from "@/lib/accessDuration";

interface RequestAccessPayload {
  resumeId: string;
  message?: string;
  duration?: DurationSelectionInput;
  timezone?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId: currentUserId, error } = await getAuthenticatedUserId(
      request
    );
    if (error) return error;
    if (!currentUserId) return handleApiError(null, "Unauthorized", 401);

    const { resumeId, message, duration, timezone } =
      (await request.json()) as RequestAccessPayload;

    if (!resumeId) {
      return handleApiError(null, "Resume ID is required", 400);
    }

    if (!duration) {
      return handleApiError(null, "Duration selection is required", 400);
    }

    let normalizedDuration;
    try {
      normalizedDuration = normalizeDuration(duration, timezone || "UTC");
    } catch (durationError) {
      return handleApiError(
        durationError,
        durationError instanceof Error
          ? durationError.message
          : "Invalid duration",
        400
      );
    }

    const currentUserDoc = await adminDb
      .collection("users")
      .doc(currentUserId)
      .get();

    const userData = currentUserDoc.data();
    const currentUserName = userData?.displayName || "Unknown User";

    // Enforce mandatory company name for recruiters
    const companyName = userData?.companyName || userData?.company;
    if (!companyName || companyName.trim() === "") {
      return handleApiError(
        null,
        "Company name is required to request access. Please update your profile settings.",
        403
      );
    }

    const resumeRef = adminDb.collection("resumes").doc(resumeId);
    const resumeDoc = await resumeRef.get();

    if (!resumeDoc.exists) {
      return handleApiError(null, "Resume not found", 404);
    }

    const resumeData = resumeDoc.data();
    const resumeOwnerId = resumeData?.userId;

    if (currentUserId === resumeOwnerId) {
      return handleApiError(
        null,
        "Cannot request access to your own resume",
        400
      );
    }

    const existingRequests = await resumeRef
      .collection("accessRequests")
      .where("fromUserId", "==", currentUserId)
      .get();

    const pendingRequest = existingRequests.docs.find(
      (doc) => doc.data().status === "pending"
    );
    const approvedRequest = existingRequests.docs.find(
      (doc) => doc.data().status === "approved"
    );

    if (approvedRequest) {
      return handleApiError(
        null,
        "You already have access to this resume",
        409
      );
    }

    if (pendingRequest) {
      return handleApiError(
        null,
        "You already have a pending request for this resume",
        409
      );
    }

    const accessRequest = {
      fromUserId: currentUserId,
      fromUserName: currentUserName,
      timestamp: FieldValue.serverTimestamp(),
      message: message || "",
      status: "pending",
      requestedDuration: normalizedDuration,
    };

    const requestRef = await resumeRef
      .collection("accessRequests")
      .add(accessRequest);

    console.log(`📨 Access request created: ${requestRef.id}`);

    // Update recruiter metrics
    await adminDb
      .collection("recruiterMetrics")
      .doc(currentUserId)
      .set(
        {
          accessRequests: {
            pending: FieldValue.increment(1),
          },
          totalCandidatesInteracted: FieldValue.increment(1),
          lastActivityAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    // Update job seeker metrics
    await adminDb
      .collection("jobSeekerMetrics")
      .doc(resumeOwnerId)
      .set(
        {
          contactRequests: FieldValue.increment(1),
          lastActivityAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    await createNotification(
      NotificationType.ACCESS_REQUEST,
      resumeOwnerId,
      {
        title: "Resume Access Request",
        body:
          message ||
          `${currentUserName} requested ${normalizedDuration.label} of resume access`,
        actionUrl: `/dashboard/access-requests`,
        data: {
          requestId: requestRef.id,
          resumeId,
          fromUserId: currentUserId,
        },
      },
      [NotificationChannel.IN_APP],
      NotificationPriority.HIGH
    );

    console.log(`✉️ Notification sent to resume owner: ${resumeOwnerId}`);

    return NextResponse.json({
      success: true,
      requestId: requestRef.id,
      message: "Request sent! The resume owner will review it soon.",
    });
  } catch (error) {
    return handleApiError(error, "Failed to create access request");
  }
}
