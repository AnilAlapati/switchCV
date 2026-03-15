import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
  safeParseBody,
} from "@/lib/utils/api-helpers";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { getConstants } from "@/lib/getSystemConfig";
import { createResumeSchema } from "@/lib/validations/resume";
import { createResume } from "@/lib/services/resumeService";
import { logger } from "@/lib/logger";
import {
  getIdempotencyKey,
  checkIdempotency,
  markProcessing,
  storeIdempotencyResponse,
  clearIdempotencyKey,
  createCachedResponse,
  createProcessingResponse,
} from "@/lib/utils/idempotency";

export async function POST(request: NextRequest) {
  const idempotencyKey = getIdempotencyKey(request);

  try {
    // 1. Authenticate
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError || !userId) {
      return (
        authError ||
        handleApiError(new Error("Unauthorized"), "Unauthorized", 401)
      );
    }

    // Idempotency check (if key provided)
    if (idempotencyKey) {
      const idempotencyCheck = await checkIdempotency(idempotencyKey, userId);

      if (idempotencyCheck.status === "cached" && idempotencyCheck.data) {
        logger.info(
          { userId, idempotencyKey },
          "Returning cached idempotent resume create response",
        );
        return createCachedResponse(idempotencyCheck.data);
      }

      if (idempotencyCheck.status === "processing") {
        logger.warn(
          { userId, idempotencyKey },
          "Duplicate resume create request still processing",
        );
        return createProcessingResponse();
      }

      // Mark as processing to prevent concurrent duplicates
      await markProcessing(idempotencyKey, userId);
    }

    // Rate Limiting
    const constants = await getConstants();
    const rateLimitResult = await checkDistributedRateLimit(userId!, {
      scope: "resume-create",
      limit: constants.RATE_LIMITS.RESUME_CREATE_PER_HOUR,
      windowMs: 60 * 60 * 1000, // 1 hour
    });

    if (!rateLimitResult.allowed) {
      // Clear idempotency on rate limit (not a processing error)
      if (idempotencyKey) {
        await clearIdempotencyKey(idempotencyKey, userId);
      }
      return handleApiError(
        null,
        "Rate limit exceeded. Max 10 resumes per hour.",
        429,
      );
    }

    // 2. Parse Body
    const body = await safeParseBody(request);

    // Validation
    const validationResult = createResumeSchema.safeParse(body);
    if (!validationResult.success) {
      // Clear idempotency on validation error
      if (idempotencyKey) {
        await clearIdempotencyKey(idempotencyKey, userId);
      }
      return handleApiError(
        new Error("Invalid resume data"),
        "Invalid resume data: " +
          validationResult.error?.issues?.map((e) => e.message).join(", "),
        400,
      );
    }
    const validatedBody = validationResult.data;

    // 3. Delegate to Service
    const { resumeId, numericId } = await createResume(userId, validatedBody);

    const result = {
      success: true,
      resumeId,
      numericId,
    };

    // Store idempotent response for future duplicate requests
    if (idempotencyKey) {
      await storeIdempotencyResponse(idempotencyKey, userId, result);
    }

    return NextResponse.json(result);
  } catch (error) {
    // Clear idempotency key on error to allow retry
    if (idempotencyKey) {
      const { userId } = await getAuthenticatedUserId(request);
      if (userId) {
        await clearIdempotencyKey(idempotencyKey, userId);
      }
    }
    return handleApiError(error, "Error creating resume");
  }
}
