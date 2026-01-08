import { NextRequest, NextResponse } from "next/server";
import { RecruiterAgentService } from "@/lib/services/recruiterAgentService";
import { getAuthenticatedUserId, handleApiError } from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { trackCost } from "@/lib/services/costControlService";
import { checkRateLimit } from "@/lib/utils/rateLimit";

const ESTIMATED_COST_OUTREACH = 0.002; // $0.002 per run (Gemini 1.5 Pro)
const RATE_LIMIT_OUTREACH = 50; // 50 requests per day per user

export async function POST(req: NextRequest) {
    try {
        const { userId, error } = await getAuthenticatedUserId(req);
        if (error) return error;

        // 1. Rate Limiting
        const rateLimit = await checkRateLimit(`${userId}:agent:outreach`, {
            limit: RATE_LIMIT_OUTREACH,
            windowMs: 24 * 60 * 60 * 1000, // 24 hours
        });

        if (!rateLimit.allowed) {
            return handleApiError(null, "Daily outreach limit exceeded", 429);
        }

        const body = await req.json();
        const { candidate, job, recruiter } = body;

        // TODO: Add strict validation library (zod) if needed, for now basic checks
        if (!candidate || !job) {
            return handleApiError(new Error("Missing data"), "Missing candidate or job data", 400);
        }

        // NOTE: Intentionally BYPASSING tier checks here as requested.
        // In production, we would check if user.subscriptionTier === 'premium' | 'enterprise'

        logger.info({ userId }, "Generating outreach message via Agent");

        const message = await RecruiterAgentService.generateOutreachMessage(
            candidate,
            job,
            recruiter || { recruiterName: "Recruiter" }
        );

        // 2. Cost Tracking (Fire & Forget)
        trackCost(userId!, ESTIMATED_COST_OUTREACH, "agent_outreach").catch((err) =>
            logger.error({ err }, "Failed to track cost for outreach")
        );

        return NextResponse.json({ message });
    } catch (err) {
        logger.error({ err }, "Outreach generation API failed");
        return handleApiError(err, "Failed to generate message");
    }
}
