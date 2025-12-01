// src/app/api/resume/enhance/route.ts
/**
 * Resume Enhancement API Endpoint
 * Provides ATS scoring, optimization tips, and keyword analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { generateResumeEnhancement } from "@/lib/resumeEnhancer";
import { logger } from "@/lib/logger";
import type { Resume } from "@/lib/resumeComparison.types";
import {
  getAuthenticatedUserId,
  handleApiError,
  safeParseBody,
} from "@/lib/utils/api-helpers";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { getConstants } from "@/lib/getSystemConfig";
import { enhanceResumeRequestSchema } from "@/lib/validations/resume";

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting
    const { userId } = await getAuthenticatedUserId(request);
    const identifier =
      userId || request.headers.get("x-forwarded-for") || "anonymous";

    const constants = await getConstants();
    const rateLimitResult = await checkRateLimit(
      `${identifier}:resume:enhance`,
      {
        limit: constants.RATE_LIMITS.RESUME_ENHANCE_PER_HOUR,
        windowMs: 60 * 60 * 1000, // 1 hour
      }
    );

    if (!rateLimitResult.allowed) {
      return handleApiError(
        null,
        "Rate limit exceeded. Max 20 enhancements per hour.",
        429
      );
    }

    const body = await safeParseBody(request);

    const validationResult = enhanceResumeRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(
        new Error("Invalid resume data"),
        "Invalid resume data: " +
          validationResult.error?.issues?.map((e) => e.message).join(", "),
        400
      );
    }

    const { resume, jobDescription } = validationResult.data;

    const enhancement = generateResumeEnhancement(
      resume as Resume,
      jobDescription
    );

    return NextResponse.json(enhancement, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "Error enhancing resume:");
    return handleApiError(error, "Failed to enhance resume");
  }
}
