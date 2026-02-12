import { logger } from "@/lib/logger";
// src/app/api/recruiter/request-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { COLLECTIONS, collectionRef, increment } from "@/lib/dal";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import { getRecruiterContactLimits } from "@/lib/config.server";
import { consumeQuota, QuotaExceededError } from "@/lib/services/quotaService";
import { RequestRecruiterAccessSchema } from "@/lib/schemas/api";

/**
 * Helper to verify recruiter role
 */
async function verifyRecruiterRole(userId: string): Promise<boolean> {
  const userSnap = await collectionRef(COLLECTIONS.USERS).doc(userId).get();
  const userData = userSnap.data();
  return userData?.role === "recruiter" || userData?.role === "admin";
}

export async function POST(request: NextRequest) {
  try {
    const { userId: recruiterId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError || !recruiterId)
      return authError || handleApiError(null, "Unauthorized", 401);

    if (!(await verifyRecruiterRole(recruiterId))) {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }

    const parseResult = RequestRecruiterAccessSchema.safeParse(
      await request.json()
    );
    if (!parseResult.success) {
      return handleApiError(parseResult.error, "resumeId is required", 400);
    }
    const { resumeId, requestedFields = ["email", "phone"] } = parseResult.data;

    if (!resumeId) {
      return handleApiError(null, "resumeId is required", 400);
    }

    // Check Quota
    const tier = await getUserTier(recruiterId!);
    const limitConfigs = await getRecruiterContactLimits();
    const limitConfig = limitConfigs[tier];

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
    const resumeRef = collectionRef(COLLECTIONS.RESUMES).doc(String(resumeId));
    const resumeDoc = await resumeRef.get();

    if (!resumeDoc.exists) {
      return handleApiError(null, "Resume not found", 404);
    }

    const resumeData = resumeDoc.data();
    const userId = resumeData?.userId;
    const title = resumeData?.title || "Untitled Resume";

    // Get user info
    const userRef = collectionRef(COLLECTIONS.USERS).doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return handleApiError(null, "User not found", 404);
    }

    const userData = userDoc.data();

    // Check if request already exists
    const existingQuery = await collectionRef(COLLECTIONS.RECRUITER_REQUESTS)
      .where("resumeId", "==", String(resumeId))
      .where("fromRecruiterId", "==", recruiterId) // Also check if THIS recruiter already requested
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      return handleApiError(
        new Error("A pending request already exists for this resume"),
        "A pending request already exists for this resume",
        409
      );
    }

    // Create new access request
    const newRequestRef = collectionRef(COLLECTIONS.RECRUITER_REQUESTS).doc();
    await newRequestRef.set({
      resumeId: String(resumeId),
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
        requestCount: increment(1),
      });
    } catch (err) {
      logger.warn({ err: err }, "Could not update request count:");
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
