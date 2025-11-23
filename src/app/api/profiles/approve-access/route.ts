// src/app/api/profiles/approve-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAuthenticatedUserId,
  handleApiError,
  verifyResumeOwnership,
} from "@/lib/utils/api-helpers";

interface ApproveAccessPayload {
  requestId: string;
  resumeId: string;
  duration: "1hour" | "1day" | "1week" | "forever";
}

function calculateExpiryDate(
  duration: "1hour" | "1day" | "1week" | "forever"
): Date | null {
  const now = new Date();

  switch (duration) {
    case "1hour":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "1day":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "1week":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "forever":
      return null;
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError) {
      return authError;
    }

    const { requestId, resumeId, duration } =
      (await request.json()) as ApproveAccessPayload;

    if (!requestId || !resumeId || !duration) {
      return handleApiError(null, "Missing required fields", 400);
    }

    // Validate duration parameter
    const validDurations = ["1hour", "1day", "1week", "forever"];
    if (!validDurations.includes(duration)) {
      return handleApiError(null, "Invalid duration parameter", 400);
    }

    // Verify current user is owner of the resume
    const verification = await verifyResumeOwnership(request, resumeId);
    if (!verification.success) {
      return verification.error;
    }
    const { docRef: resumeRef } = verification;

    // 1. Get the access request
    const requestRef = resumeRef.collection("accessRequests").doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return handleApiError(null, "Request not found", 404);
    }

    const requestData = requestDoc.data();
    const fromUserId = requestData?.fromUserId;
    const fromUserName = requestData?.fromUserName;

    // 2. Update request status to approved
    await requestRef.update({
      status: "approved",
      approvedAt: FieldValue.serverTimestamp(),
    });

    // Update recruiter metrics
    if (fromUserId) {
      const metricsRef = adminDb.collection("recruiterMetrics").doc(fromUserId);
      await metricsRef
        .set(
          {
            "accessRequests.pending": FieldValue.increment(-1),
            "accessRequests.approved": FieldValue.increment(1),
          },
          { merge: true }
        )
        .catch((err) => {
          console.error("Failed to update recruiter metrics:", err);
        });
    }

    // 3. Create access grant
    const expiresAt = calculateExpiryDate(duration);

    const accessGrant = {
      toUserId: fromUserId,
      grantedAt: FieldValue.serverTimestamp(),
      expiresAt: expiresAt,
      duration: duration,
      grantedBy: userId,
    };

    const grantRef = await resumeRef
      .collection("accessGrants")
      .add(accessGrant);

    console.log(`✅ Access approved: ${grantRef.id} for duration: ${duration}`);

    // 4. Send notification to requester
    const expiryText =
      duration === "forever"
        ? "forever"
        : `until ${expiresAt?.toLocaleDateString()}`;

    const notification = {
      userId: fromUserId,
      type: "approval",
      resumeId: resumeId,
      resumeTitle: "Your resume access request",
      message: `Your request was approved! You can view the resume ${expiryText}.`,
      timestamp: FieldValue.serverTimestamp(),
      read: false,
      approvalDuration: duration,
      expiresAt: expiresAt,
      actionUrl: `/resume/${requestData?.resumeSlug || ""}`,
    };

    await adminDb
      .collection("notifications")
      .doc(fromUserId)
      .collection("messages")
      .add(notification);

    console.log(`📬 Approval notification sent to: ${fromUserId}`);

    return NextResponse.json({
      success: true,
      grantId: grantRef.id,
      expiresAt: expiresAt,
      message: `Access approved for ${fromUserName}!`,
    });
  } catch (error) {
    return handleApiError(error, "Failed to approve access");
  }
}
