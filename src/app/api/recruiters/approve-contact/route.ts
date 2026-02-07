import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { COLLECTIONS, collectionRef, serverTimestamp } from "@/lib/dal";
import { tokenGenerator } from "@/lib/tokenGenerator";
import { RecruiterContactRequest } from "@/types/profileSearch";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { ApproveRecruiterContactSchema } from "@/lib/schemas/api";

interface ApproveContactPayload {
  requestId: string;
  duration?: "1hour" | "1day" | "1week" | "30days";
  adminUserId: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * POST /api/recruiters/approve-contact
 * Admin approves recruiter's contact request and generates secure access token
 *
 * This endpoint:
 * 1. Verifies the request exists and is pending
 * 2. Generates a secure JWT token for PII access
 * 3. Stores token with expiration and revocation support
 * 4. Sends notifications to both recruiter and candidate
 * 5. Creates audit log entry
 *
 * SECURITY: Requires authentication. Only admins can approve requests.
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify authentication
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    const parseResult = ApproveRecruiterContactSchema.safeParse(
      await request.json()
    );
    if (!parseResult.success) {
      return handleApiError(
        new Error("Missing required fields"),
        "Missing required fields",
        400
      );
    }
    const payload = parseResult.data as ApproveContactPayload;

    // SECURITY: Verify the authenticated user IS the admin making the approval
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
        new Error("Forbidden: Only admins can approve contact requests"),
        "Forbidden: Only admins can approve contact requests",
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
        new Error(`Request is already ${contactRequest.status}`),
        `Request is already ${contactRequest.status}`,
        400
      );
    }

    // Determine duration
    const duration = payload.duration || contactRequest.proposedDuration;
    const validDurations = ["1hour", "1day", "1week", "30days"];
    if (!validDurations.includes(duration)) {
      return handleApiError(
        new Error("Invalid duration"),
        "Invalid duration",
        400
      );
    }

    // Calculate expiration
    const now = Math.floor(Date.now() / 1000);
    let durationSeconds = 24 * 60 * 60; // Default 1 day

    switch (duration) {
      case "1hour":
        durationSeconds = 60 * 60;
        break;
      case "1day":
        durationSeconds = 24 * 60 * 60;
        break;
      case "1week":
        durationSeconds = 7 * 24 * 60 * 60;
        break;
      case "30days":
        durationSeconds = 30 * 24 * 60 * 60;
        break;
    }

    const expiresAt = now + durationSeconds;

    // Generate secure token
    const {
      token,
      tokenHash,
      expiresAt: tokenExpiry,
    } = tokenGenerator.generateToken({
      tokenId: contactRequest.id, // Use request ID as token ID
      recruiterId: contactRequest.fromRecruiter.recruiterId,
      userId: contactRequest.toUserId,
      resumeId: contactRequest.resumeId,
      requestId: payload.requestId,
      accessFields: contactRequest.requestedFields,
      expiresAt,
    });

    // Store token in Firestore
    const tokenData = {
      tokenId: contactRequest.id,
      recruiterId: contactRequest.fromRecruiter.recruiterId,
      userId: contactRequest.toUserId,
      resumeId: contactRequest.resumeId,
      requestId: payload.requestId,
      token, // Store encrypted token
      tokenHash, // Store hash for verification
      accessFields: contactRequest.requestedFields as string[],
      accessType: "read-only",
      issuedAt: new Date(now * 1000),
      expiresAt: new Date(tokenExpiry * 1000),
      duration,
      isRevoked: false,
      usageCount: 0,
      ipAddressWhitelist: payload.ipAddress ? [payload.ipAddress] : undefined,
    };

    const tokenRef = await collectionRef(COLLECTIONS.ACCESS_TOKENS).add({
      ...tokenData,
      issuedAt: serverTimestamp(),
      expiresAt: serverTimestamp(),
    });

    // Update contact request status
    await requestRef.update({
      status: "approved",
      updatedAt: serverTimestamp(),
      reviewedBy: payload.adminUserId,
      reviewedAt: serverTimestamp(),
      tokenId: tokenRef.id,
      accessExpiresAt: serverTimestamp(),
    } as Record<string, unknown>);

    // Create notification for recruiter
    const recruiterNotification = {
      type: "contact_request_approved",
      recruiterId: contactRequest.fromRecruiter.recruiterId,
      requestId: payload.requestId,
      candidateId: contactRequest.toUserId,
      candidateEmail: contactRequest.toUserEmail,
      approvedAt: serverTimestamp(),
      expiresAt: serverTimestamp(),
      duration,
      message: `Your request to contact ${contactRequest.toUserEmail} has been approved. Access expires in ${duration}.`,
      timestamp: serverTimestamp(),
      read: false,
      actionUrl: `/recruiter/portal/requests/${payload.requestId}`,
      token: token.substring(0, 20) + "...", // Safe token preview
    };

    await collectionRef(COLLECTIONS.RECRUITER_NOTIFICATIONS)
      .add(recruiterNotification);

    // Create notification for candidate (they're being contacted)
    const candidateNotification = {
      type: "recruiter_contact_approved",
      userId: contactRequest.toUserId,
      recruiterId: contactRequest.fromRecruiter.recruiterId,
      recruiterName: contactRequest.fromRecruiter.name,
      recruiterEmail: contactRequest.fromRecruiter.email,
      companyName: contactRequest.fromRecruiter.companyName,
      requestId: payload.requestId,
      contactedFields: contactRequest.requestedFields,
      purpose: contactRequest.purpose,
      expiresAt: serverTimestamp(),
      duration,
      message: `Recruiter ${contactRequest.fromRecruiter.name} from ${contactRequest.fromRecruiter.companyName} has been granted access to view your contact information.`,
      timestamp: serverTimestamp(),
      read: false,
      actionUrl: `/dashboard/contact-requests/${payload.requestId}`,
    };

    await collectionRef(COLLECTIONS.NOTIFICATIONS).add(candidateNotification);

    // Create audit log
    const auditLog = {
      action: "contact_request_approved",
      requestId: payload.requestId,
      tokenId: tokenRef.id,
      recruiterId: contactRequest.fromRecruiter.recruiterId,
      recruiterEmail: contactRequest.fromRecruiter.email,
      candidateId: contactRequest.toUserId,
      adminUserId: payload.adminUserId,
      approvedFields: contactRequest.requestedFields,
      duration,
      expiresAt: new Date(tokenExpiry * 1000),
      timestamp: serverTimestamp(),
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
    };

    await collectionRef(COLLECTIONS.AUDIT_LOGS).add(auditLog);

    logger.info(
      `✅ Contact request approved: ${payload.requestId} by admin ${payload.adminUserId}`
    );
    logger.info(
      `🔐 Secure token generated: ${tokenRef.id} (expires in ${duration})`
    );

    return NextResponse.json({
      success: true,
      tokenId: tokenRef.id,
      requestId: payload.requestId,
      expiresAt: tokenExpiry,
      expiresAtDate: new Date(tokenExpiry * 1000).toISOString(),
      duration,
      durationSeconds,
      message: `Contact request approved. Recruiter and candidate have been notified.`,
      token: token.substring(0, 50) + "...", // Don't send full token
    });
  } catch (error) {
    logger.error({ err: error }, "❌ Approve contact error:");
    return handleApiError(error, "Failed to approve contact request");
  }
}
