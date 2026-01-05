import { NextRequest, NextResponse } from "next/server";
import { generateNumericResumeId } from "@/lib/numericIdGenerator";
import {
  getAuthenticatedUserId,
  handleApiError,
  safeParseBody,
} from "@/lib/utils/api-helpers";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { getConstants } from "@/lib/getSystemConfig";
import { createResumeSchema } from "@/lib/validations/resume";
import { createResume } from "@/lib/services/resumeService";

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
    const constants = await getConstants();
    const rateLimitResult = await checkRateLimit(`${userId}:resume:create`, {
      limit: constants.RATE_LIMITS.RESUME_CREATE_PER_HOUR,
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
        validationResult.error?.issues?.map((e) => e.message).join(", "),
        400
      );
    }
    const validatedBody = validationResult.data;

    // 3. Delegate to Service
    const { resumeId, numericId } = await createResume(userId, validatedBody);

    return NextResponse.json({
      success: true,
      resumeId,
      numericId,
    });
  } catch (error) {
    return handleApiError(error, "Error creating resume");
  }
}
