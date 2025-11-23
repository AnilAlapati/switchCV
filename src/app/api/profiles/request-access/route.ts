// src/app/api/profiles/request-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  FieldValue,
  CollectionReference,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
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

type AccessRequestDoc = QueryDocumentSnapshot<DocumentData>;

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

    const accessRequestsCollection = resumeRef.collection("accessRequests");

    const existingRequestDocs = await fetchUserRequestDocs(
      accessRequestsCollection,
      currentUserId
    );

    const pendingRequest = existingRequestDocs.find(
      (doc) => doc.data().status === "pending"
    );
    const approvedRequest = existingRequestDocs.find(
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

    const requestRef = await accessRequestsCollection.add(accessRequest);

    console.log(`📨 Access request created: ${requestRef.id}`);

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

async function fetchUserRequestDocs(
  collectionRef: CollectionReference<DocumentData>,
  currentUserId: string
): Promise<AccessRequestDoc[]> {
  try {
    const snapshot = await collectionRef
      .where("fromUserId", "==", currentUserId)
      .get();
    return snapshot.docs as AccessRequestDoc[];
  } catch (error) {
    if (isFailedPreconditionError(error)) {
      console.warn(
        "[accessRequests] Missing Firestore index on fromUserId. Falling back to in-memory filter. Run `firebase deploy --only firestore:indexes` to restore optimal performance."
      );
      const fallbackSnapshot = await collectionRef.get();
      return fallbackSnapshot.docs.filter(
        (doc) => doc.data().fromUserId === currentUserId
      ) as AccessRequestDoc[];
    }
    throw error;
  }
}

function isFailedPreconditionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: number | string; message?: string };
  if (typeof maybeError.code === "number" && maybeError.code === 9) {
    return true;
  }
  if (typeof maybeError.code === "string") {
    const normalizedCode = maybeError.code.toLowerCase();
    if (normalizedCode.includes("failed_precondition")) {
      return true;
    }
  }
  return !!maybeError.message?.includes("FAILED_PRECONDITION");
}
