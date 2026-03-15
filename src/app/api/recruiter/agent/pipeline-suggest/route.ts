import { NextRequest, NextResponse } from "next/server";
import { RecruiterAgentService } from "@/lib/services/recruiterAgentService";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { BillingService } from "@/lib/services/billingService";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { AgentPipelineSuggestSchema } from "@/lib/schemas/api";
import { getUserRole } from "@/lib/services/userService";

const ESTIMATED_COST_PIPELINE = 0.0003; // $0.0003 per run (Gemini 1.5 Flash)
const RATE_LIMIT_PIPELINE = 100; // 100 requests per day

export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(req);
    if (error) return error;

    // Security: Only allow recruiter or admin roles
    const userRole = await getUserRole(userId!);
    if (userRole !== "recruiter" && userRole !== "admin") {
      return handleApiError(null, "Forbidden: Recruiter role required", 403);
    }

    // 1. Distributed Rate Limiting (works across serverless instances)
    const rateLimit = await checkDistributedRateLimit(userId!, {
      limit: RATE_LIMIT_PIPELINE,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      scope: "agent-pipeline-suggest",
    });

    if (!rateLimit.allowed) {
      return handleApiError(
        null,
        "Daily pipeline suggestion limit exceeded",
        429,
      );
    }

    const parseResult = AgentPipelineSuggestSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return handleApiError(parseResult.error, "Invalid input", 400);
    }
    const { candidate, currentStage, interactionHistory } = parseResult.data;

    logger.info(
      { userId, currentStage },
      "Suggesting pipeline action via Agent",
    );

    const result = await RecruiterAgentService.suggestPipelineAction(
      candidate,
      currentStage,
      interactionHistory,
    );

    // 2. Cost Tracking (Fire & Forget)
    BillingService.trackCost(
      userId!,
      ESTIMATED_COST_PIPELINE,
      "agent_pipeline_suggest",
    ).catch((err) =>
      logger.error({ err }, "Failed to track cost for pipeline suggestion"),
    );

    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err }, "Pipeline suggestion API failed");
    return handleApiError(err, "Failed to suggest pipeline action");
  }
}
