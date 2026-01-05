import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line no-restricted-imports
import { adminDb } from "@/lib/firebase-admin";
// eslint-disable-next-line no-restricted-imports
import { FieldValue } from "firebase-admin/firestore";
import { RecruiterContactRequest } from "@/types/profileSearch";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";

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
 *
 * SECURITY: Requires authentication. Only admins can deny requests.
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify authentication
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    const payload = (await request.json()) as DenyContactPayload;

    if (!payload.requestId || !payload.reason || !payload.adminUserId) {
      return handleApiError(
        new Error("Missing required fields"),
        "Missing required fields",
        400
      );
    }

    // SECURITY: Verify the authenticated user IS the admin making the denial
    if (authUserId !== payload.adminUserId) {
      return handleApiError(
        new Error("Forbidden: adminUserId must match authenticated user"),
        "Forbidden: adminUserId must match authenticated user",
        403
      );
    }

    // SECURITY: Verify the user has admin role
    const adminDoc = await adminDb.collection("users").doc(authUserId).get();
    const adminData = adminDoc.data();
    if (!adminData || adminData.role !== "admin") {
      return handleApiError(
        new Error("Forbidden: Only admins can deny contact requests"),
        "Forbidden: Only admins can deny contact requests",
        403
      );
    }

    // Get the contact request
    const requestRef = adminDb
      .collection("recruiterRequests")
      .doc(payload.requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
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
    await requestRef.update({
      status: "denied",
      updatedAt: FieldValue.serverTimestamp(),
      reviewedBy: payload.adminUserId,
      reviewedAt: FieldValue.serverTimestamp(),
      denialReason: payload.reason,
    } as any);

    // Create notification for recruiter
    const recruiterNotification = {
      type: "contact_request_denied",
      recruiterId: contactRequest.fromRecruiter.recruiterId,
      requestId: payload.requestId,
      candidateId: contactRequest.toUserId,
      reason: payload.reason,
      deniedAt: FieldValue.serverTimestamp(),
      message: `Your request to contact ${contactRequest.toUserEmail} has been denied. Reason: ${payload.reason}`,
      timestamp: FieldValue.serverTimestamp(),
      read: false,
      actionUrl: `/recruiter/portal/requests/${payload.requestId}`,
    };

    await adminDb
      .collection("recruiterNotifications")
      .add(recruiterNotification);

    // Create audit log
    const auditLog = {
      action: "contact_request_denied",
      requestId: payload.requestId,
      recruiterId: contactRequest.fromRecruiter.recruiterId,
      recruiterEmail: contactRequest.fromRecruiter.email,
      candidateId: contactRequest.toUserId,
      adminUserId: payload.adminUserId,
      denialReason: payload.reason,
      timestamp: FieldValue.serverTimestamp(),
    };

    await adminDb.collection("auditLogs").add(auditLog);

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
