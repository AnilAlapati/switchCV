import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  doc,
  addDoc,
  serverTimestamp,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RecruiterContactRequest } from "@/types/profileSearch";

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
 */
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as RequestContactPayload;

    // Validation
    if (
      !payload.recruiterId ||
      !payload.userId ||
      !payload.resumeId ||
      !payload.requestedFields?.length
    ) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["recruiterId", "userId", "resumeId", "requestedFields"],
        },
        { status: 400 }
      );
    }

    // Validate requested fields
    const validFields = ["email", "phone", "address", "personalLinks"];
    const invalidFields = payload.requestedFields.filter(
      (f) => !validFields.includes(f)
    );
    if (invalidFields.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid fields requested: ${invalidFields.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Prevent self-requests
    if (payload.recruiterId === payload.userId) {
      return NextResponse.json(
        { error: "Recruiters cannot request their own contact info" },
        { status: 400 }
      );
    }

    // Verify resume exists
    const resumeRef = doc(db, "resumeProfiles", payload.resumeId);
    const resumeDoc = await getDoc(resumeRef);

    if (!resumeDoc.exists()) {
      return NextResponse.json(
        {
          error: "Resume not found",
          resumeId: payload.resumeId,
        },
        { status: 404 }
      );
    }

    const resumeData = resumeDoc.data();

    // Verify recruiter and candidate match
    if (resumeData.userId !== payload.userId) {
      return NextResponse.json(
        { error: "Resume does not belong to specified user" },
        { status: 400 }
      );
    }

    // Check for duplicate pending requests (same recruiter, same candidate, same resume)
    const existingRequests = await getDocs(
      query(
        collection(db, "recruiterRequests"),
        where("toUserId", "==", payload.userId),
        where("resumeId", "==", payload.resumeId),
        where("fromRecruiter.recruiterId", "==", payload.recruiterId),
        where("status", "==", "pending")
      )
    );

    if (!existingRequests.empty) {
      return NextResponse.json(
        {
          error: "You already have a pending request for this candidate",
          existingRequestId: existingRequests.docs[0].id,
        },
        { status: 409 }
      );
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

    // Save to Firestore
    const requestRef = await addDoc(collection(db, "recruiterRequests"), {
      ...contactRequest,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log(
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
      timestamp: serverTimestamp(),
      read: false,
      actionUrl: `/dashboard/recruiter-requests/${requestRef.id}`,
    };

    // Store in admin notifications collection
    await addDoc(collection(db, "adminNotifications"), adminNotification);

    console.log(`🔔 Admin notification created for request: ${requestRef.id}`);

    return NextResponse.json({
      success: true,
      requestId: requestRef.id,
      status: "pending_review",
      message:
        "Your request has been submitted for admin review. You will be notified when it is approved or denied.",
    });
  } catch (error) {
    console.error("❌ Request contact error:", error);
    return NextResponse.json(
      {
        error: "Failed to create contact request",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recruiters/request-contact?recruiterId=XXX
 * Get recruiter's pending and approved contact requests
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const recruiterId = searchParams.get("recruiterId");

    if (!recruiterId) {
      return NextResponse.json(
        { error: "recruiterId is required" },
        { status: 400 }
      );
    }

    // Get all requests from this recruiter
    const snapshot = await getDocs(
      query(
        collection(db, "recruiterRequests"),
        where("fromRecruiter.recruiterId", "==", recruiterId)
      )
    );

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
    console.error("❌ Get requests error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch requests",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
