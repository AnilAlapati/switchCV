import { NextRequest, NextResponse } from "next/server";
import { RecruiterAgentService } from "@/lib/services/recruiterAgentService";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { trackCost } from "@/lib/services/costControlService";
import { checkRateLimit } from "@/lib/utils/rateLimit";
import { AgentAnalyzeSchema } from "@/lib/schemas/api";

const ESTIMATED_COST_ANALYZE = 0.0005; // $0.0005 per run (Gemini 1.5 Flash)
const RATE_LIMIT_ANALYZE = 100; // 100 requests per day

export async function POST(req: NextRequest) {
  try {
    const { userId, error } = await getAuthenticatedUserId(req);
    if (error) return error;

    // 1. Rate Limiting
    const rateLimit = await checkRateLimit(`${userId}:agent:analyze`, {
      limit: RATE_LIMIT_ANALYZE,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
    });

    if (!rateLimit.allowed) {
      return handleApiError(null, "Daily analysis limit exceeded", 429);
    }

    const parseResult = AgentAnalyzeSchema.safeParse(await req.json());
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }
    const { candidate, job } = parseResult.data;

    // NOTE: Intentionally BYPASSING tier checks here as requested.

    logger.info({ userId }, "Analyzing match via Agent");

    const analysis = await RecruiterAgentService.analyzeMatch(candidate, job);

    // 2. Cost Tracking (Fire & Forget)
    trackCost(userId!, ESTIMATED_COST_ANALYZE, "agent_analyze").catch((err) =>
      logger.error({ err }, "Failed to track cost for analyze"),
    );

    return NextResponse.json({ analysis });
  } catch (err) {
    logger.error({ err }, "Match analysis API failed");
    return handleApiError(err, "Failed to analyze match");
  }
}
