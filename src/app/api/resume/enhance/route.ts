// src/app/api/resume/enhance/route.ts
/**
 * Resume Enhancement API Endpoint
 * Provides ATS scoring, optimization tips, and keyword analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { generateResumeEnhancement } from "@/lib/resumeEnhancer";
import { logger } from "@/lib/logger";
import type { Resume } from "@/lib/resumeComparison.types";
import { handleApiError } from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const { resume, jobDescription } = await request.json();

    if (!resume || typeof resume !== "object") {
      return handleApiError(
        new Error("Invalid resume data"),
        "Invalid resume data",
        400
      );
    }

    const enhancement = generateResumeEnhancement(
      resume as Resume,
      jobDescription
    );

    return NextResponse.json(enhancement, { status: 200 });
  } catch (error) {
    logger.error("Error enhancing resume:", error);
    return handleApiError(error, "Failed to enhance resume");
  }
}
