import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import { checkResumeCreationQuota } from "@/lib/services/resumeQuotaService";

/**
 * GET /api/resumes/quota
 *
 * Returns the resume creation quota status for the authenticated user.
 * Used by the dashboard and /create-resume page to show upgrade prompts.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(request);
    if (error) return error;

    const tier = await getUserTier(userId!);
    const quota = await checkResumeCreationQuota(userId!, tier);

    return NextResponse.json(quota, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return handleApiError(err, "Failed to fetch resume quota");
  }
}
