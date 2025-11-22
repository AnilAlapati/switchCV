/**
 * Resume Comparison API Endpoint
 * POST /api/resume/compare
 */

import { NextRequest, NextResponse } from "next/server";
import { compareResumes } from "@/lib/resumeComparison";
import { Resume } from "@/lib/resumeComparison.types";
import { handleApiError } from "@/lib/utils/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resume1, resume2 } = body;

    // Validate input
    if (!resume1 || !resume2) {
      return handleApiError(null, "Both resume1 and resume2 are required", 400);
    }

    // Type validation
    if (!isValidResume(resume1) || !isValidResume(resume2)) {
      return handleApiError(null, "Invalid resume format", 400);
    }

    // Perform comparison
    const result = compareResumes(resume1, resume2);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleApiError(error, "Failed to compare resumes");
  }
}

/**
 * Validate resume object structure
 */
function isValidResume(resume: unknown): resume is Resume {
  if (typeof resume !== "object" || resume === null) return false;

  const r = resume as Record<string, unknown>;

  return (
    typeof r.id === "string" &&
    typeof r.title === "string" &&
    Array.isArray(r.skills) &&
    r.skills.every((s) => typeof s === "string") &&
    Array.isArray(r.experience) &&
    Array.isArray(r.education)
  );
}
