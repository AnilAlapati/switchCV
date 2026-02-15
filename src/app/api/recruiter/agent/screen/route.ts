import { NextRequest, NextResponse } from "next/server";
import { RecruiterAgentService } from "@/lib/services/recruiterAgentService";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { BillingService } from "@/lib/services/billingService";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { AgentScreenSchema } from "@/lib/schemas/api";
import { getUserRole } from "@/lib/services/userService";

const ESTIMATED_COST_SCREEN = 0.0005; // $0.0005 per run (Gemini 1.5 Flash)
const RATE_LIMIT_SCREEN = 200; // 200 requests per day

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
    const rateLimit = await checkRateLimit(`${userId}:agent:screen`, {
      limit: RATE_LIMIT_SCREEN,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    });

    if (!rateLimit.allowed) {
      return handleApiError(null, "Daily screening limit exceeded", 429);
    }

    const parseResult = AgentScreenSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return handleApiError(parseResult.error, "Invalid input", 400);
    }
    const { candidate, criteria } = parseResult.data;

    logger.info({ userId }, "Screening candidate via Agent");

    const result = await RecruiterAgentService.screenCandidate(
      candidate,
      criteria,
    );

    // 2. Cost Tracking (Fire & Forget)
    BillingService.trackCost(
      userId!,
      ESTIMATED_COST_SCREEN,
      "agent_screen",
    ).catch((err) =>
      logger.error({ err }, "Failed to track cost for screening"),
    );

    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err }, "Candidate screening API failed");
    return handleApiError(err, "Failed to screen candidate");
  }
}
