import { logger } from "@/lib/logger";
// src/app/api/recruiter/request-access/route.ts
import { NextRequest, NextResponse } from "next/server";
import { COLLECTIONS, collectionRef, increment, serverTimestamp } from "@/lib/dal";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import { getRecruiterContactLimits } from "@/lib/config.server";
import {
  consumeQuota,
  QuotaExceededError,
  refundQuota,
} from "@/lib/services/quotaService";
import { RequestRecruiterAccessSchema } from "@/lib/schemas/api";

/**
 * Helper to verify recruiter role
 */
async function getRecruiterProfile(userId: string) {
  const userSnap = await collectionRef(COLLECTIONS.USERS).doc(userId).get();
  if (!userSnap.exists) return null;
  const userData = userSnap.data();
  if (userData?.role === "recruiter" || userData?.role === "admin") {
    return userData;
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { userId: recruiterId, error: authError } =
      await getAuthenticatedUserId(request);
    if (authError || !recruiterId)
      return authError || handleApiError(null, "Unauthorized", 401);

    const recruiterProfile = await getRecruiterProfile(recruiterId);
    if (!recruiterProfile) {
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

    // Resolve quota configuration (consumed later, after validations)
    const tier = await getUserTier(recruiterId!);
    const limitConfigs = await getRecruiterContactLimits();
    const limitConfig = limitConfigs[tier];
    const quotaPeriod = limitConfig.interval === "month" ? "monthly" : "lifetime";
    let quotaReserved = false;

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

    // Check if request already exists
    const existingQuery = await collectionRef(COLLECTIONS.RECRUITER_REQUESTS)
      .where("resumeId", "==", String(resumeId))
      .where("fromRecruiter.recruiterId", "==", recruiterId)
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

    try {
      await consumeQuota({
        subjectId: recruiterId!,
        scope: "recruiter_contact",
        limit: limitConfig.amount,
        period: quotaPeriod,
      });
      quotaReserved = true;
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        return handleApiError(
          error,
          "Contact limit reached for your plan. Upgrade to contact more candidates.",
          403
        );
      }
      throw error;
    }

    const newRequestRef = collectionRef(COLLECTIONS.RECRUITER_REQUESTS).doc();
    try {
      // Create new access request (Normalized Schema)
      await newRequestRef.set({
        resumeId: String(resumeId),
        toUserId: userId, // Normalized field name
        fromRecruiter: {
          recruiterId,
          name: recruiterProfile.displayName || "Recruiter",
          email: recruiterProfile.email,
          companyName: recruiterProfile.companyName || "",
        },
        resumeTitle: title,
        requestedFields,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Increment request count in user document
      try {
        await userRef.update({
          requestCount: increment(1),
        });
      } catch (err) {
        logger.warn({ err: err }, "Could not update request count:");
      }
    } catch (writeError) {
      if (quotaReserved) {
        try {
          await refundQuota({
            subjectId: recruiterId!,
            scope: "recruiter_contact",
            period: quotaPeriod,
          });
        } catch (refundError) {
          logger.error(
            { err: refundError, recruiterId, resumeId },
            "Failed to refund recruiter contact quota after write failure"
          );
        }
      }
      throw writeError;
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
