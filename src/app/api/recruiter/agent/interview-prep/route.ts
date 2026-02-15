import { NextRequest, NextResponse } from "next/server";
import { RecruiterAgentService } from "@/lib/services/recruiterAgentService";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { BillingService } from "@/lib/services/billingService";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { AgentInterviewPrepSchema } from "@/lib/schemas/api";
import { getUserRole } from "@/lib/services/userService";

const ESTIMATED_COST_INTERVIEW_PREP = 0.002; // $0.002 per run (Gemini 1.5 Pro)
const RATE_LIMIT_INTERVIEW_PREP = 50; // 50 requests per day

export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(req);
    if (error) return error;

    // Security: Only allow recruiter or admin roles
    const userRole = await getUserRole(userId!);
    if (userRole !== "recruiter" && userRole !== "admin") {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }

    // 1. Rate Limiting
    const rateLimit = await checkRateLimit(`${userId}:agent:interview-prep`, {
      limit: RATE_LIMIT_INTERVIEW_PREP,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    });

    if (!rateLimit.allowed) {
      return handleApiError(null, "Daily interview prep limit exceeded", 429);
    }

    const parseResult = AgentInterviewPrepSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { candidate, job, interviewType } = parseResult.data;

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
    BillingService.trackCost(
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
