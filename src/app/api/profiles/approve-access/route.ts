// src/app/api/profiles/approve-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  collection,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDoc,
  query,
  where,
  getDocs,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    const { requestId, resumeId, duration } =
      (await request.json()) as ApproveAccessPayload;

    if (!requestId || !resumeId || !duration) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // TODO: Verify current user is owner of the resume

    // 1. Get the access request
    const requestRef = doc(
      db,
      "resumeProfiles",
      resumeId,
      "accessRequests",
      requestId
    );
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const requestData = requestDoc.data();
    const fromUserId = requestData.fromUserId;
    const fromUserName = requestData.fromUserName;

    // 2. Update request status to approved
    await updateDoc(requestRef, {
      status: "approved",
      approvedAt: serverTimestamp(),
    });

    // 3. Create access grant
    const expiresAt = calculateExpiryDate(duration);

    const accessGrant = {
      toUserId: fromUserId,
      grantedAt: serverTimestamp(),
      expiresAt: expiresAt,
      duration: duration,
      grantedBy: "current-user-uid", // TODO: Get from auth
    };

    const grantsCollection = collection(
      db,
      "resumeProfiles",
      resumeId,
      "accessGrants"
    );
    const grantRef = await addDoc(grantsCollection, accessGrant);

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
      timestamp: serverTimestamp(),
      read: false,
      approvalDuration: duration,
      expiresAt: expiresAt,
      actionUrl: `/resume/${requestData.resumeSlug || ""}`,
    };

    await addDoc(
      collection(db, "notifications", fromUserId, "messages"),
      notification
    );

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
