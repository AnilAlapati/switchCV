// src/app/api/profiles/request-access/route.ts
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

interface RequestAccessPayload {
  resumeId: string;
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { resumeId, message } =
      (await request.json()) as RequestAccessPayload;

    if (!resumeId) {
      return NextResponse.json(
        { error: "Resume ID is required" },
        { status: 400 }
      );
    }

    // TODO: Get authenticated user from request
    // For now, this is placeholder
    const currentUserId = "placeholder-uid";
    const currentUserName = "Current User";

    // 1. Get resume to verify it exists
    const resumeRef = doc(db, "resumeProfiles", resumeId);
    const resumeDoc = await getDoc(resumeRef);

    if (!resumeDoc.exists()) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const resumeData = resumeDoc.data();
    const resumeOwnerId = resumeData.userId;

    // Prevent self-requests
    if (currentUserId === resumeOwnerId) {
      return NextResponse.json(
        { error: "Cannot request access to your own resume" },
        { status: 400 }
      );
    }

    // 2. Check if request already exists and is pending
    const existingRequests = query(
      collection(db, "resumeProfiles", resumeId, "accessRequests"),
      where("fromUserId", "==", currentUserId),
      where("status", "==", "pending")
    );

    const existingSnapshot = await getDocs(existingRequests);
    if (!existingSnapshot.empty) {
      return NextResponse.json(
        { error: "You already have a pending request for this resume" },
        { status: 409 }
      );
    }

    // 3. Create access request
    const accessRequest = {
      fromUserId: currentUserId,
      fromUserName: currentUserName,
      timestamp: serverTimestamp(),
      message: message || "",
      status: "pending",
    };

    const requestRef = await addDoc(
      collection(db, "resumeProfiles", resumeId, "accessRequests"),
      accessRequest
    );

    console.log(`📨 Access request created: ${requestRef.id}`);

    // 4. Create notification for resume owner
    const notification = {
      userId: resumeOwnerId,
      type: "request",
      fromUserId: currentUserId,
      fromUserName: currentUserName,
      resumeId: resumeId,
      resumeTitle: resumeData.title,
      message: message || `${currentUserName} requested access to your resume`,
      timestamp: serverTimestamp(),
      read: false,
      actionUrl: `/dashboard/access-requests`,
    };

    await addDoc(
      collection(db, "notifications", resumeOwnerId, "messages"),
      notification
    );

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
