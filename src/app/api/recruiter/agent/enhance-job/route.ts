import { NextRequest, NextResponse } from "next/server";
import { RecruiterAgentService } from "@/lib/services/recruiterAgentService";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { BillingService } from "@/lib/services/billingService";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { AgentEnhanceJobSchema } from "@/lib/schemas/api";
import { getUserRole } from "@/lib/services/userService";

const ESTIMATED_COST_ENHANCE_JOB = 0.002; // $0.002 per run (Gemini 1.5 Pro)
const RATE_LIMIT_ENHANCE_JOB = 20; // 20 requests per day (job descriptions are less frequent)

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
    const rateLimit = await checkRateLimit(`${userId}:agent:enhance-job`, {
      limit: RATE_LIMIT_ENHANCE_JOB,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    });

    if (!rateLimit.allowed) {
      return handleApiError(null, "Daily job enhancement limit exceeded", 429);
    }

    const parseResult = AgentEnhanceJobSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }
    const { job } = parseResult.data;

    logger.info(
      { userId, jobTitle: job.title },
      "Enhancing job description via Agent",
    );

    const result = await RecruiterAgentService.enhanceJobDescription(job);

    // 2. Cost Tracking (Fire & Forget)
    BillingService.trackCost(
      userId!,
      ESTIMATED_COST_ENHANCE_JOB,
      "agent_enhance_job",
    ).catch((err) =>
      logger.error({ err }, "Failed to track cost for job enhancement"),
    );

    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err }, "Job enhancement API failed");
    return handleApiError(err, "Failed to enhance job description");
  }
}
