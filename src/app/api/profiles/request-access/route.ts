// src/app/api/profiles/request-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

interface RequestAccessPayload {
  resumeId: string;
  message?: string;
}

async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error("Request access auth error", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUserId = await verifyAuth(request);
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resumeId, message } =
      (await request.json()) as RequestAccessPayload;

    if (!resumeId) {
      return NextResponse.json(
        { error: "Resume ID is required" },
        { status: 400 }
      );
    }

    const currentUserDoc = await adminDb
      .collection("users")
      .doc(currentUserId)
      .get();
    const currentUserName =
      currentUserDoc.data()?.displayName || "Unknown User";

    const resumeRef = adminDb.collection("resumeProfiles").doc(resumeId);
    const resumeDoc = await resumeRef.get();

    if (!resumeDoc.exists) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const resumeData = resumeDoc.data();
    const resumeOwnerId = resumeData?.userId;

    if (currentUserId === resumeOwnerId) {
      return NextResponse.json(
        { error: "Cannot request access to your own resume" },
        { status: 400 }
      );
    }

    const existingRequests = await resumeRef
      .collection("accessRequests")
      .where("fromUserId", "==", currentUserId)
      .where("status", "==", "pending")
      .get();

    if (!existingRequests.empty) {
      return NextResponse.json(
        { error: "You already have a pending request for this resume" },
        { status: 409 }
      );
    }

    const accessRequest = {
      fromUserId: currentUserId,
      fromUserName: currentUserName,
      timestamp: FieldValue.serverTimestamp(),
      message: message || "",
      status: "pending",
    };

    const requestRef = await resumeRef
      .collection("accessRequests")
      .add(accessRequest);

    console.log(`📨 Access request created: ${requestRef.id}`);

    const notification = {
      userId: resumeOwnerId,
      type: "request",
      fromUserId: currentUserId,
      fromUserName: currentUserName,
      resumeId: resumeId,
      resumeTitle: resumeData?.title || "Resume",
      message: message || `${currentUserName} requested access to your resume`,
      timestamp: FieldValue.serverTimestamp(),
      read: false,
      actionUrl: `/dashboard/access-requests`,
    };

    await adminDb
      .collection("notifications")
      .doc(resumeOwnerId)
      .collection("messages")
      .add(notification);

    console.log(`✉️ Notification sent to resume owner: ${resumeOwnerId}`);

    return NextResponse.json({
      success: true,
      requestId: requestRef.id,
      message: "Request sent! The resume owner will review it soon.",
    });
  } catch (error) {
    console.error("Request access error:", error);
    return NextResponse.json(
      {
        error: "Failed to create access request",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
