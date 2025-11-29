import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import { Resume } from "@/lib/resumeComparison.types";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import {
  RESUME_CREATION_LIMITS,
  RESUME_RETENTION_DAYS,
  RESUME_DELETION_GRACE_DAYS,
  RESUME_EXPIRY_WARNING_HOURS,
} from "@/lib/config";

interface CreateResumeRequest {
  userId: string;
  resume: Resume;
  isPublic?: boolean;
}

interface CreateResumeResponse {
  success: boolean;
  resumeId: string;
  numericId: number;
  publicUrl: string;
  expiresAt: string | null;
  deletionScheduledAt: string | null;
  countdownStartsAt: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId: authenticatedUserId, error } = await getAuthenticatedUserId(
      request
    );
    if (error) return error;

    // Parse request body
    const body = (await request.json()) as CreateResumeRequest;
    const { userId, resume, isPublic = true } = body;

    if (!userId || !resume) {
      return handleApiError(
        new Error("Missing required fields"),
        "Missing required fields: userId or resume",
        400
      );
    }

    // Security: Only users can save their own resumes
    if (authenticatedUserId !== userId) {
      return handleApiError(
        new Error("Unauthorized"),
        "Unauthorized: Cannot save resume for another user",
        403
      );
    }

    // Check Quota
    const tier = await getUserTier(userId);
    const limit = RESUME_CREATION_LIMITS[tier];

    // We use "resume_create" scope and "monthly" period (or "forever" if we want total limit)
    // For now, let's assume it's a total limit on active resumes, but consumeQuota is for "events over time".
    // If we want "Max 3 resumes total", we should count existing resumes, not use consumeQuota.
    // Let's check existing resumes count first.

    const existingResumesSnapshot = await adminDb
      .collection("resumes")
      .where("userId", "==", userId)
      .count()
      .get();

    const currentCount = existingResumesSnapshot.data()?.count ?? 0;

    if (currentCount >= limit) {
      return handleApiError(
        new Error("Plan limit reached"),
        `You have reached the limit of ${limit} resumes for the ${tier} plan. Please upgrade to create more.`,
        403
      );
    }

    // Generate numeric ID (1-99,999,999)
    const numericId = await generateNumericResumeId();

    if (!numericId) {
      return handleApiError(
        new Error("Failed to generate ID"),
        "Failed to generate numeric resume ID",
        500
      );
    }

    // Calculate Expiration
    const retentionDays = RESUME_RETENTION_DAYS[tier];
    const deletionGraceDays = RESUME_DELETION_GRACE_DAYS[tier];
    const warningHours = RESUME_EXPIRY_WARNING_HOURS[tier];

    let expiresAt: string | null = null;
    let deletionScheduledAt: string | null = null;
    let countdownStartsAt: string | null = null;

    if (retentionDays) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + retentionDays);
      expiresAt = expirationDate.toISOString();

      if (deletionGraceDays) {
        const deletionDate = new Date(expirationDate);
        deletionDate.setDate(deletionDate.getDate() + deletionGraceDays);
        deletionScheduledAt = deletionDate.toISOString();

        if (warningHours) {
          const warningDate = new Date(
            deletionDate.getTime() - warningHours * 60 * 60 * 1000
          );
          countdownStartsAt = warningDate.toISOString();
        }
      }
    }

    // Prepare resume document
    const resumeDoc = {
      ...resume,
      userId,
      numericId,
      isPublic: isPublic,
      visibility: isPublic ? "public" : "private",
      published: isPublic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "active",
      expiresAt, // Null for premium, date for basic
      deletionScheduledAt,
      countdownStartsAt,
      expirationWarningHours: warningHours ?? null,
    };

    // Persist single source of truth document. Fan-out Cloud Function will
    // propagate to user + global indexes asynchronously.
    await adminDb.collection("resumes").doc(String(numericId)).set(resumeDoc);

    logger.info(
      {
        userId,
        numericId,
        resumeTitle: resume.title,
        isPublic,
      },
      `✅ Resume saved successfully`
    );

    const response: CreateResumeResponse = {
      success: true,
      resumeId: String(numericId),
      numericId,
      publicUrl: `/resumes/${numericId}`,
      expiresAt,
      deletionScheduledAt,
      countdownStartsAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error({ err: error }, "❌ Error creating resume:");
    return handleApiError(error, "Failed to create resume");
  }
}
