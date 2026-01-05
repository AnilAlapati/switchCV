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

const FREE_RECRUITER_REQUEST_LIMIT = Number(
  process.env.RECRUITER_FREE_REQUEST_LIMIT ||
    process.env.NEXT_PUBLIC_RECRUITER_FREE_REQUEST_LIMIT ||
    2
);

const FREE_PLAN_ACTIVE_STATUSES: RecruiterContactRequest["status"][] = [
  "pending",
  "approved",
];

interface RequestContactPayload {
  recruiterId: string;
  recruiterName: string;
  recruiterEmail: string;
  companyName: string;
  userId: string; // Candidate ID
  resumeId: string;
  requestedFields: Array<"email" | "phone" | "address" | "personalLinks">;
  purpose: string;
  proposedDuration: "1hour" | "1day" | "1week" | "30days";
  ipAddress?: string;
  userAgent?: string;
}

/**
 * POST /api/recruiters/request-contact
 * Recruiter requests access to candidate's PII fields
 *
 * Creates a RecruiterContactRequest that must be approved by admin
 * before the candidate receives notification
 *
 * SECURITY: Requires authentication. recruiterId is verified against auth token.
 */
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Verify authentication
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    const payload = (await request.json()) as RequestContactPayload;

    // Validation
    if (
      !payload.recruiterId ||
      !payload.userId ||
      !payload.resumeId ||
      !payload.requestedFields?.length
    ) {
      return handleApiError(
        new Error("Missing required fields"),
        "Missing required fields",
        400
      );
    }

    // SECURITY: Verify the authenticated user IS the recruiter making the request
    if (authUserId !== payload.recruiterId) {
      return handleApiError(
        new Error("Forbidden: recruiterId must match authenticated user"),
        "Forbidden: recruiterId must match authenticated user",
        403
      );
    }

    // Validate requested fields
    const validFields = ["email", "phone", "address", "personalLinks"];
    const invalidFields = payload.requestedFields.filter(
      (f) => !validFields.includes(f)
    );
    if (invalidFields.length > 0) {
      return handleApiError(
        new Error(`Invalid fields requested: ${invalidFields.join(", ")}`),
        `Invalid fields requested: ${invalidFields.join(", ")}`,
        400
      );
    }

    // Prevent self-requests
    if (payload.recruiterId === payload.userId) {
      return handleApiError(
        new Error("Recruiters cannot request their own contact info"),
        "Recruiters cannot request their own contact info",
        400
      );
    }

    // Verify resume exists
    const resumeDoc = await adminDb
      .collection("resumeProfiles")
      .doc(payload.resumeId)
      .get();

    if (!resumeDoc.exists) {
      return handleApiError(
        new Error("Resume not found"),
        "Resume not found",
        404
      );
    }

    const resumeData = resumeDoc.data();

    // Verify recruiter and candidate match
    if (resumeData?.userId !== payload.userId) {
      return handleApiError(
        new Error("Resume does not belong to specified user"),
        "Resume does not belong to specified user",
        400
      );
    }

    // Check for duplicate pending requests (same recruiter, same candidate, same resume)
    const existingRequests = await adminDb
      .collection("recruiterRequests")
      .where("toUserId", "==", payload.userId)
      .where("resumeId", "==", payload.resumeId)
      .where("fromRecruiter.recruiterId", "==", payload.recruiterId)
      .where("status", "==", "pending")
      .get();

    if (!existingRequests.empty) {
      return handleApiError(
        new Error("You already have a pending request for this candidate"),
        "You already have a pending request for this candidate",
        409
      );
    }

    // Enforce free plan limits (basic = no payment)
    const recruiterDoc = await adminDb
      .collection("users")
      .doc(payload.recruiterId)
      .get();
    if (!recruiterDoc.exists) {
      return handleApiError(
        new Error("Recruiter profile not found"),
        "Recruiter profile not found",
        404
      );
    }

    const recruiterData = recruiterDoc.data();
    const subscriptionTier =
      (recruiterData?.subscriptionTier as string | undefined) || "basic";

    if (subscriptionTier === "basic") {
      const activeRequestSnapshot = await adminDb
        .collection("recruiterRequests")
        .where("fromRecruiter.recruiterId", "==", payload.recruiterId)
        .where("status", "in", FREE_PLAN_ACTIVE_STATUSES)
        .get();

      if (activeRequestSnapshot.size >= FREE_RECRUITER_REQUEST_LIMIT) {
        return handleApiError(
          new Error("Free recruiter limit reached"),
          `Free recruiters can request up to ${FREE_RECRUITER_REQUEST_LIMIT} resumes. Upgrade your plan to request more access.`,
          403
        );
      }
    }

    // Create contact request
    const contactRequest: Omit<RecruiterContactRequest, "id"> = {
      fromRecruiter: {
        recruiterId: payload.recruiterId,
        name: payload.recruiterName,
        email: payload.recruiterEmail,
        companyName: payload.companyName,
      },
      toUserId: payload.userId,
      resumeId: payload.resumeId,
      resumeTitle: resumeData.title,
      requestedFields: payload.requestedFields,
      purpose: payload.purpose,
      proposedDuration: payload.proposedDuration,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
      ipAddress: payload.ipAddress,
      userAgent: payload.userAgent,
    };

    // Save to Firestore using admin SDK
    const requestRef = await adminDb.collection("recruiterRequests").add({
      ...contactRequest,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info(
      `📨 Contact request created: ${requestRef.id} from ${payload.recruiterEmail} to ${payload.userId}`
    );

    // Create admin notification for review
    // (Admin must approve before candidate is notified)
    const adminNotification = {
      type: "recruiter_request_pending",
      recruiterId: payload.recruiterId,
      recruiterName: payload.recruiterName,
      recruiterEmail: payload.recruiterEmail,
      companyName: payload.companyName,
      candidateId: payload.userId,
      requestId: requestRef.id,
      requestedFields: payload.requestedFields,
      purpose: payload.purpose,
      timestamp: FieldValue.serverTimestamp(),
      read: false,
      actionUrl: `/dashboard/recruiter-requests/${requestRef.id}`,
    };

    // Store in admin notifications collection
    await adminDb.collection("adminNotifications").add(adminNotification);

    logger.info(`🔔 Admin notification created for request: ${requestRef.id}`);

    return NextResponse.json({
      success: true,
      requestId: requestRef.id,
      status: "pending_review",
      message:
        "Your request has been submitted for admin review. You will be notified when it is approved or denied.",
    });
  } catch (error) {
    logger.error({ err: error }, "❌ Request contact error:");
    return handleApiError(error, "Failed to create contact request");
  }
}

/**
 * GET /api/recruiters/request-contact?recruiterId=XXX
 * Get recruiter's pending and approved contact requests
 *
 * SECURITY: Requires authentication. User can only view their own requests.
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify authentication
    const { userId: authUserId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    const searchParams = request.nextUrl.searchParams;
    const recruiterId = searchParams.get("recruiterId");

    if (!recruiterId) {
      return handleApiError(
        new Error("recruiterId is required"),
        "recruiterId is required",
        400
      );
    }

    // SECURITY: Users can only view their own requests
    if (authUserId !== recruiterId) {
      return handleApiError(
        new Error("Forbidden: Can only view your own requests"),
        "Forbidden: Can only view your own requests",
        403
      );
    }

    // Get all requests from this recruiter
    const snapshot = await adminDb
      .collection("recruiterRequests")
      .where("fromRecruiter.recruiterId", "==", recruiterId)
      .get();

    const requests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as (RecruiterContactRequest & { id: string })[];

    // Group by status
    const byStatus = {
      pending: requests.filter((r) => r.status === "pending"),
      approved: requests.filter((r) => r.status === "approved"),
      denied: requests.filter((r) => r.status === "denied"),
      expired: requests.filter((r) => r.status === "expired"),
    };

    return NextResponse.json({
      success: true,
      recruiterId,
      requests,
      summary: {
        total: requests.length,
        pending: byStatus.pending.length,
        approved: byStatus.approved.length,
        denied: byStatus.denied.length,
        expired: byStatus.expired.length,
      },
      byStatus,
    });
  } catch (error) {
    logger.error({ err: error }, "❌ Get requests error:");
    return handleApiError(error, "Failed to fetch requests");
  }
}
