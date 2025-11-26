// src/app/api/recruiter/request-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import { RECRUITER_CONTACT_LIMITS } from "@/lib/config";
import { consumeQuota, QuotaExceededError } from "@/lib/services/quotaService";

export async function POST(request: NextRequest) {
  try {
    const { userId: recruiterId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError) return authError;

    const { resumeId, requestedFields = ["email", "phone"] } =
      await request.json();

    if (!resumeId) {
      return handleApiError(null, "resumeId is required", 400);
    }

    // Check Quota
    const tier = await getUserTier(recruiterId!);
    const limitConfig = RECRUITER_CONTACT_LIMITS[tier];

    try {
      await consumeQuota({
        subjectId: recruiterId!,
        scope: "recruiter_contact",
        limit: limitConfig.amount,
        period: limitConfig.interval === "month" ? "monthly" : "lifetime",
      });
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        return handleApiError(
          error,
          `You have reached your ${limitConfig.interval} limit of ${limitConfig.amount} contacts. Please upgrade to contact more candidates.`,
          403
        );
      }
      throw error;
    }

    // Get resume to find owner
    const resumeRef = adminDb.collection("resumes").doc(resumeId);
    const resumeDoc = await resumeRef.get();

    if (!resumeDoc.exists) {
      return handleApiError(null, "Resume not found", 404);
    }

    const resumeData = resumeDoc.data();
    const userId = resumeData?.userId;
    const title = resumeData?.title || "Untitled Resume";

    // Get user info
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return handleApiError(null, "User not found", 404);
    }

    const userData = userDoc.data();

    // Check if request already exists
    const existingQuery = await adminDb
      .collection("recruiterRequests")
      .where("resumeId", "==", resumeId)
      .where("fromRecruiterId", "==", recruiterId) // Also check if THIS recruiter already requested
      .where("status", "==", "pending")
      .get();

    if (!existingQuery.empty) {
      return handleApiError(
        new Error("A pending request already exists for this resume"),
        "A pending request already exists for this resume",
        409
      );
    }

    // Create new access request
    const newRequestRef = adminDb.collection("recruiterRequests").doc();
    await newRequestRef.set({
      resumeId,
      userId,
      fromRecruiterId: recruiterId,
      resumeTitle: title,
      userEmail: userData?.email,
      requestedFields,
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Increment request count in user document
    try {
      await userRef.update({
        requestCount: adminDb.firestore.FieldValue.increment(1),
      });
    } catch (err) {
      console.warn("Could not update request count:", err);
    }

    return NextResponse.json({
      success: true,
      requestId: newRequestRef.id,
      message:
        "Access request sent successfully. The candidate will be notified.",
    });
  } catch (error) {
    return handleApiError(error, "Failed to send access request");
  }
}
