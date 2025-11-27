import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  updateDoc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RecruiterContactRequest } from "@/types/profileSearch";
import { handleApiError } from "@/lib/utils/api-helpers";

interface DenyContactPayload {
  requestId: string;
  reason: string;
  adminUserId: string;
}

/**
 * POST /api/recruiters/deny-contact
 * Admin denies recruiter's contact request
 *
 * This endpoint:
 * 1. Verifies the request exists
 * 2. Updates request status to denied
 * 3. Sends notification to recruiter with denial reason
 * 4. Creates audit log entry
 */
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as DenyContactPayload;

    if (!payload.requestId || !payload.reason || !payload.adminUserId) {
      return handleApiError(
        new Error("Missing required fields"),
        "Missing required fields",
        400
      );
    }

    // Get the contact request
    const requestRef = doc(db, "recruiterRequests", payload.requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      return handleApiError(
        new Error("Request not found"),
        "Request not found",
        404
      );
    }

    const contactRequest = requestDoc.data() as RecruiterContactRequest;

    // Verify request is still pending
    if (contactRequest.status !== "pending") {
      return handleApiError(
        new Error(`Request is already ${contactRequest.status}`),
        `Request is already ${contactRequest.status}`,
        400
      );
    }

    // Update request status
    await updateDoc(requestRef, {
      status: "denied",
      updatedAt: serverTimestamp(),
      reviewedBy: payload.adminUserId,
      reviewedAt: serverTimestamp(),
      denialReason: payload.reason,
    } as any);

    // Create notification for recruiter
    const recruiterNotification = {
      type: "contact_request_denied",
      recruiterId: contactRequest.fromRecruiter.recruiterId,
      requestId: payload.requestId,
      candidateId: contactRequest.toUserId,
      reason: payload.reason,
      deniedAt: serverTimestamp(),
      message: `Your request to contact ${contactRequest.toUserEmail} has been denied. Reason: ${payload.reason}`,
      timestamp: serverTimestamp(),
      read: false,
      actionUrl: `/recruiter/portal/requests/${payload.requestId}`,
    };

    await addDoc(
      collection(db, "recruiterNotifications"),
      recruiterNotification
    );

    // Create audit log
    const auditLog = {
      action: "contact_request_denied",
      requestId: payload.requestId,
      recruiterId: contactRequest.fromRecruiter.recruiterId,
      recruiterEmail: contactRequest.fromRecruiter.email,
      candidateId: contactRequest.toUserId,
      adminUserId: payload.adminUserId,
      denialReason: payload.reason,
      timestamp: serverTimestamp(),
    };

    await addDoc(collection(db, "auditLogs"), auditLog);

    logger.info(
      `❌ Contact request denied: ${payload.requestId} by admin ${payload.adminUserId}`
    );
    logger.info(`Reason: ${payload.reason}`);

    return NextResponse.json({
      success: true,
      requestId: payload.requestId,
      status: "denied",
      message: "Request denied. Recruiter has been notified.",
    });
  } catch (error) {
    logger.error({ err: error }, "❌ Deny contact error:");
    return handleApiError(error, "Failed to deny contact request");
  }
}
