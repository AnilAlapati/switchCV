// src/app/api/profiles/approve-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

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

async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch (e) {
    console.error("Auth verification failed", e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestId, resumeId, duration } =
      (await request.json()) as ApproveAccessPayload;

    if (!requestId || !resumeId || !duration) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate duration parameter
    const validDurations = ["1hour", "1day", "1week", "forever"];
    if (!validDurations.includes(duration)) {
      return NextResponse.json(
        { error: "Invalid duration parameter" },
        { status: 400 }
      );
    }

    // Verify current user is owner of the resume
    const resumeRef = adminDb.collection("resumeProfiles").doc(resumeId);
    const resumeDoc = await resumeRef.get();

    if (!resumeDoc.exists) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    if (resumeDoc.data()?.userId !== userId) {
      return NextResponse.json(
        { error: "Forbidden: You do not own this resume" },
        { status: 403 }
      );
    }

    // 1. Get the access request
    const requestRef = resumeRef.collection("accessRequests").doc(requestId);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const requestData = requestDoc.data();
    const fromUserId = requestData?.fromUserId;
    const fromUserName = requestData?.fromUserName;

    // 2. Update request status to approved
    await requestRef.update({
      status: "approved",
      approvedAt: FieldValue.serverTimestamp(),
    });

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
    console.error("Approve access error:", error);
    return NextResponse.json(
      {
        error: "Failed to approve access",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
