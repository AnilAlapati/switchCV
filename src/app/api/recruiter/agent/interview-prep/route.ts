import { NextRequest, NextResponse } from "next/server";
import { RecruiterAgentService } from "@/lib/services/recruiterAgentService";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { trackCost } from "@/lib/services/costControlService";
import { checkRateLimit } from "@/lib/utils/rateLimit";

const ESTIMATED_COST_INTERVIEW_PREP = 0.002; // $0.002 per run (Gemini 1.5 Pro)
const RATE_LIMIT_INTERVIEW_PREP = 50; // 50 requests per day

export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(req);
    if (error) return error;

    // 1. Rate Limiting
    const rateLimit = await checkRateLimit(`${userId}:agent:interview-prep`, {
      limit: RATE_LIMIT_INTERVIEW_PREP,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    });

    if (!rateLimit.allowed) {
      return handleApiError(null, "Daily interview prep limit exceeded", 429);
    }

    const body = await req.json();
    const { candidate, job, interviewType } = body;

    if (!candidate || !job) {
      return handleApiError(
        new Error("Missing data"),
        "Missing candidate or job data",
        400,
      );
    }

    logger.info(
      { userId, interviewType },
      "Generating interview prep via Agent",
    );

    const result = await RecruiterAgentService.generateInterviewPrep({
      candidate,
      job,
      interviewType: interviewType || "general",
    });

    // 2. Cost Tracking (Fire & Forget)
    trackCost(
      userId!,
      ESTIMATED_COST_INTERVIEW_PREP,
      "agent_interview_prep",
    ).catch((err) =>
      logger.error({ err }, "Failed to track cost for interview prep"),
    );

    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err }, "Interview prep API failed");
    return handleApiError(err, "Failed to generate interview prep");
  }
}
