// src/app/api/profiles/request-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

interface RequestAccessPayload {
  resumeId: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId: currentUserId, error } = await getAuthenticatedUserId(
      request
    );
    if (error) return error;
    if (!currentUserId) return handleApiError(null, "Unauthorized", 401);

    const { resumeId, message } =
      (await request.json()) as RequestAccessPayload;

    if (!resumeId) {
      return handleApiError(null, "Resume ID is required", 400);
    }

    const currentUserDoc = await adminDb
      .collection("users")
      .doc(currentUserId)
      .get();
    const currentUserName =
      currentUserDoc.data()?.displayName || "Unknown User";

    const resumeRef = adminDb.collection("resumeProfiles").doc(resumeId);
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
      .where("status", "==", "pending")
      .get();

    if (!existingRequests.empty) {
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
    };

    const requestRef = await resumeRef
      .collection("accessRequests")
      .add(accessRequest);

    console.log(`📨 Access request created: ${requestRef.id}`);

    const notification = {
      userId: resumeOwnerId,
      type: "request",
      fromUserId: currentUserId,
      fromUserName: currentUserName,
      resumeId: resumeId,
      resumeTitle: resumeData?.title || "Resume",
      message: message || `${currentUserName} requested access to your resume`,
      timestamp: FieldValue.serverTimestamp(),
      read: false,
      actionUrl: `/dashboard/access-requests`,
    };

    await adminDb
      .collection("notifications")
      .doc(resumeOwnerId)
      .collection("messages")
      .add(notification);

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
