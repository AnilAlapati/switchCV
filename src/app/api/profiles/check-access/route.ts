// src/app/api/profiles/check-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AccessCheckResponse } from "@/types/profileSearch";

export async function GET(request: NextRequest) {
  try {
    const resumeId = request.nextUrl.searchParams.get("resumeId");
    // TODO: Get current user from auth context
    const currentUserId = "placeholder-uid";

    if (!resumeId) {
      return NextResponse.json(
        { error: "Resume ID is required" },
        { status: 400 }
      );
    }

    // 1. Get resume document
    const resumeRef = doc(db, "resumeProfiles", resumeId);
    const resumeDoc = await getDoc(resumeRef);

    if (!resumeDoc.exists()) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const resumeData = resumeDoc.data();
    const resumeOwnerId = resumeData.userId;

    // If user is owner, they always have access
    if (currentUserId === resumeOwnerId) {
      const response: AccessCheckResponse = {
        hasAccess: true,
        accessType: "owner",
        message: "You are the owner of this resume",
      };
      return NextResponse.json(response);
    }

    // If resume is published, public access
    if (resumeData.published) {
      const response: AccessCheckResponse = {
        hasAccess: true,
        accessType: "public",
        message: "This resume is publicly shared",
      };
      return NextResponse.json(response);
    }

    // 2. Check access grants collection
    const grantsRef = collection(
      db,
      "resumeProfiles",
      resumeId,
      "accessGrants"
    );
    const q = query(grantsRef, where("toUserId", "==", currentUserId));
    const grantsSnapshot = await getDocs(q);

    if (grantsSnapshot.empty) {
      const response: AccessCheckResponse = {
        hasAccess: false,
        accessType: "none",
        message: "You do not have access to this resume",
      };
      return NextResponse.json(response);
    }

    // Check if any grant is still valid
    const now = new Date();
    for (const grantDoc of grantsSnapshot.docs) {
      const grant = grantDoc.data();
      const expiresAt = grant.expiresAt?.toDate?.() || null;

      // If expiresAt is null, it's forever access
      if (expiresAt === null || expiresAt > now) {
        const response: AccessCheckResponse = {
          hasAccess: true,
          accessType: "granted",
          grantId: grantDoc.id,
          duration: grant.duration,
          expiresAt: expiresAt,
          message:
            expiresAt === null
              ? "You have permanent access to this resume"
              : `You have access until ${expiresAt.toLocaleDateString()}`,
        };
        return NextResponse.json(response);
      }
    }

    // All grants expired
    const response: AccessCheckResponse = {
      hasAccess: false,
      accessType: "none",
      message: "Your access to this resume has expired",
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Check access error:", error);
    return NextResponse.json(
      {
        error: "Failed to check access",
        message: error instanceof Error ? error.message : "Unknown error",
        hasAccess: false,
        accessType: "none",
      },
      { status: 500 }
    );
  }
}
