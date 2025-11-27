import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import {
  getAuthenticatedUserId,
  handleApiError,
  safeParseBody,
} from "@/lib/utils/api-helpers";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { createResumeSchema } from "@/lib/validations/resume";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError || !userId) {
      return (
        authError ||
        handleApiError(new Error("Unauthorized"), "Unauthorized", 401)
      );
    }

    // Rate Limiting
    const rateLimitResult = checkRateLimit(`${userId}:resume:create`, {
      limit: 10,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (!rateLimitResult.allowed) {
      return handleApiError(
        null,
        "Rate limit exceeded. Max 10 resumes per hour.",
        429
      );
    }

    // 2. Parse Body
    const body = await safeParseBody(request);

    // Validation
    const validationResult = createResumeSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(
        new Error("Invalid resume data"),
        "Invalid resume data: " +
          validationResult.error?.errors?.map((e) => e.message).join(", "),
        400
      );
    }
    const validatedBody = validationResult.data;

    // 3. Generate ID
    const numericId = await generateNumericResumeId();
    const resumeId = numericId.toString();

    // 4. Prepare Resume Document
    const resumeData = {
      ...validatedBody,
      id: resumeId,
      userId,
      numericId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: false, // Default to private
      published: false,
      status: "draft",
    };

    // 5. Save to Firestore
    // Using the numeric ID as the document ID for clean URLs
    await adminDb.collection("resumes").doc(resumeId).set(resumeData);

    // 6. Update User Profile with a reference
    // This helps in listing user's resumes without querying the main collection
    await adminDb
      .collection("users")
      .doc(userId)
      .collection("userResumes")
      .doc(resumeId)
      .set({
        id: resumeId,
        title: validatedBody.title || "Untitled Resume",
        createdAt: resumeData.createdAt,
        updatedAt: resumeData.updatedAt,
        numericId,
      });

    return NextResponse.json({
      success: true,
      resumeId,
      numericId,
    });
  } catch (error) {
    return handleApiError(error, "Error creating resume");
  }
}
