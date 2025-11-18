// src/app/api/resume/enhance/route.ts
/**
 * Resume Enhancement API Endpoint
 * Provides ATS scoring, optimization tips, and keyword analysis
 */

import { NextRequest, NextResponse } from "next/server";
import { generateResumeEnhancement } from "@/lib/resumeEnhancer";
import { logger } from "@/lib/logger";
import type { Resume } from "@/lib/resumeComparison.types";

export async function POST(request: NextRequest) {
  try {
    const { resume, jobDescription } = await request.json();

    if (!resume || typeof resume !== "object") {
      return NextResponse.json(
        { error: "Invalid resume data" },
        { status: 400 }
      );
    }

    const enhancement = generateResumeEnhancement(
      resume as Resume,
      jobDescription
    );

    return NextResponse.json(enhancement, { status: 200 });
  } catch (error) {
    logger.error("Error enhancing resume:", error);
    return NextResponse.json(
      { error: "Failed to enhance resume" },
      { status: 500 }
    );
  }
}
