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
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["requestId", "reason", "adminUserId"],
        },
        { status: 400 }
      );
    }

    // Get the contact request
    const requestRef = doc(db, "recruiterRequests", payload.requestId);
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const contactRequest = requestDoc.data() as RecruiterContactRequest;

    // Verify request is still pending
    if (contactRequest.status !== "pending") {
      return NextResponse.json(
        {
          error: `Request is already ${contactRequest.status}`,
          status: contactRequest.status,
        },
        { status: 400 }
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

    console.log(
      `❌ Contact request denied: ${payload.requestId} by admin ${payload.adminUserId}`
    );
    console.log(`Reason: ${payload.reason}`);

    return NextResponse.json({
      success: true,
      requestId: payload.requestId,
      status: "denied",
      message: "Request denied. Recruiter has been notified.",
    });
  } catch (error) {
    console.error("❌ Deny contact error:", error);
    return NextResponse.json(
      {
        error: "Failed to deny contact request",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
