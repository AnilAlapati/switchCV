import { NextRequest, NextResponse } from "next/server";
import { RecruiterAgentService } from "@/lib/services/recruiterAgentService";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { trackCost } from "@/lib/services/costControlService";
import { checkRateLimit } from "@/lib/utils/rateLimit";

const ESTIMATED_COST_SCREEN = 0.0005; // $0.0005 per run (Gemini 1.5 Flash)
const RATE_LIMIT_SCREEN = 200; // 200 requests per day

export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(req);
    if (error) return error;

    // 1. Rate Limiting
    const rateLimit = await checkRateLimit(`${userId}:agent:screen`, {
      limit: RATE_LIMIT_SCREEN,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    });

    if (!rateLimit.allowed) {
      return handleApiError(null, "Daily screening limit exceeded", 429);
    }

    const body = await req.json();
    const { candidate, criteria } = body;

    if (!candidate || !criteria) {
      return handleApiError(
        new Error("Missing data"),
        "Missing candidate or screening criteria",
        400,
      );
    }

    if (
      !criteria.mustHave ||
      !Array.isArray(criteria.mustHave) ||
      criteria.mustHave.length === 0
    ) {
      return handleApiError(
        new Error("Invalid criteria"),
        "Must provide at least one must-have requirement",
        400,
      );
    }

    logger.info({ userId }, "Screening candidate via Agent");

    const result = await RecruiterAgentService.screenCandidate(
      candidate,
      criteria,
    );

    // 2. Cost Tracking (Fire & Forget)
    trackCost(userId!, ESTIMATED_COST_SCREEN, "agent_screen").catch((err) =>
      logger.error({ err }, "Failed to track cost for screening"),
    );

    return NextResponse.json(result);
  } catch (err) {
    logger.error({ err }, "Candidate screening API failed");
    return handleApiError(err, "Failed to screen candidate");
  }
}
