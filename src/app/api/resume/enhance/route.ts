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
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { getConstants } from "@/lib/getSystemConfig";
import { enhanceResumeRequestSchema } from "@/lib/validations/resume";

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;
    const identifier = userId || "anonymous";

    const constants = await getConstants();
    const rateLimitResult = await checkDistributedRateLimit(identifier, {
      limit: constants.RATE_LIMITS.RESUME_ENHANCE_PER_HOUR,
      windowMs: 60 * 60 * 1000, // 1 hour
      scope: "resume-enhance",
    });

    if (!rateLimitResult.allowed) {
      return handleApiError(
        null,
        "Rate limit exceeded. Max 20 enhancements per hour.",
        429,
      );
    }

    const body = await safeParseBody(request);

    const validationResult = enhanceResumeRequestSchema.safeParse(body);
    if (!validationResult.success) {
      return handleApiError(
        new Error("Invalid resume data"),
        "Invalid resume data",
        400,
      );
    }

    const { resume, jobDescription } = validationResult.data;

    const enhancement = generateResumeEnhancement(
      resume as Resume,
      jobDescription,
    );

    return NextResponse.json(enhancement, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "Error enhancing resume:");
    return handleApiError(error, "Failed to enhance resume");
  }
}
