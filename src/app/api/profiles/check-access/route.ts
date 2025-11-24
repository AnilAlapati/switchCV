// src/app/api/profiles/check-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { AccessCheckResponse } from "@/types/profileSearch";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const resumeId = request.nextUrl.searchParams.get("resumeId");
    const { userId: currentUserId, error } = await getAuthenticatedUserId(
      request
    );

    if (error) return error;
    if (!currentUserId) {
      return handleApiError(null, "Unauthorized", 401);
    }

    if (!resumeId) {
      return handleApiError(null, "Resume ID is required", 400);
    }

    // 1. Get resume document
    const resumeRef = adminDb.collection("resumes").doc(resumeId);
    const resumeDoc = await resumeRef.get();

    if (!resumeDoc.exists) {
      return handleApiError(null, "Resume not found", 404);
    }

    const resumeData = resumeDoc.data();
    const resumeOwnerId = resumeData?.userId;

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
    if (resumeData?.published) {
      const response: AccessCheckResponse = {
        hasAccess: true,
        accessType: "public",
        message: "This resume is publicly shared",
      };
      return NextResponse.json(response);
    }

    // 2. Check access grants collection
    const grantsSnapshot = await resumeRef
      .collection("accessGrants")
      .where("toUserId", "==", currentUserId)
      .get();

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
      const expiresAt = grant.expiresAt?.toDate
        ? grant.expiresAt.toDate()
        : grant.expiresAt
        ? new Date(grant.expiresAt)
        : null;

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
    return handleApiError(error, "Failed to check access");
  }
}
