import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { COLLECTIONS, collectionRef, serverTimestamp } from "@/lib/dal";
import { RecruiterContactRequest } from "@/types/profileSearch";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { DenyRecruiterContactSchema } from "@/lib/schemas/api";

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

    const parseResult = DenyRecruiterContactSchema.safeParse(
      await request.json()
    );
    if (!parseResult.success) {
      return handleApiError(
        new Error("Missing required fields"),
        "Missing required fields",
        400
      );
    }
    const payload = parseResult.data as DenyContactPayload;

    // SECURITY: Verify the authenticated user IS the admin making the denial
    if (authUserId !== payload.adminUserId) {
      return handleApiError(
        new Error("Forbidden: adminUserId must match authenticated user"),
        "Forbidden: adminUserId must match authenticated user",
        403
      );
    }

    // SECURITY: Verify the user has admin role
    const adminDoc = await collectionRef(COLLECTIONS.USERS).doc(authUserId).get();
    const adminData = adminDoc.data();
    if (!adminData || adminData.role !== "admin") {
      return handleApiError(
        new Error("Forbidden: Only admins can deny contact requests"),
        "Forbidden: Only admins can deny contact requests",
        403
      );
    }

    // Get the contact request
    const requestRef = collectionRef(COLLECTIONS.RECRUITER_REQUESTS).doc(
      payload.requestId
    );
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
        new Error("Request is no longer pending"),
        "Request status is not pending",
        400
      );
    }

    // Update request status
    await requestRef.update({
      status: "denied",
      updatedAt: serverTimestamp(),
      reviewedBy: payload.adminUserId,
      reviewedAt: serverTimestamp(),
      denialReason: payload.reason,
    } as Record<string, unknown>);

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

    await collectionRef(COLLECTIONS.RECRUITER_NOTIFICATIONS)
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
      timestamp: serverTimestamp(),
    };

    await collectionRef(COLLECTIONS.AUDIT_LOGS).add(auditLog);

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
