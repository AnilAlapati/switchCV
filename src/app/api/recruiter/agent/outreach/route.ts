import { NextRequest, NextResponse } from "next/server";
import { RecruiterAgentService } from "@/lib/services/recruiterAgentService";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { BillingService } from "@/lib/services/billingService";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { z } from "zod";
import { getUserRole } from "@/lib/services/userService";

const OutreachRequestSchema = z.object({
  candidate: z.object({
    name: z.string().optional(),
    title: z.string().optional(),
    skills: z.array(z.string()).optional(),
    bio: z.string().optional(),
    experience: z.string().optional(),
  }),
  job: z.object({
    title: z.string(),
    description: z.string().optional(),
    requirements: z.array(z.string()).optional(),
    location: z.string().optional(),
  }),
  recruiter: z
    .object({
      recruiterName: z.string().optional(),
      companyName: z.string().optional(),
    })
    .optional(),
});

const ESTIMATED_COST_OUTREACH = 0.002; // $0.002 per run (Gemini 1.5 Pro)
const RATE_LIMIT_OUTREACH = 50; // 50 requests per day per user

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
      limit: RATE_LIMIT_OUTREACH,
      windowMs: 24 * 60 * 60 * 1000, // 24 hours
      scope: "agent-outreach",
    });

    if (!rateLimit.allowed) {
      return handleApiError(null, "Daily outreach limit exceeded", 429);
    }

    const body = await req.json();

    // 2. Validation
    const result = OutreachRequestSchema.safeParse(body);
    if (!result.success) {
      logger.warn(
        { errors: result.error.issues },
        "Invalid outreach request body",
      );
      return handleApiError(null, "Invalid request body", 400);
    }

    const { candidate, job, recruiter } = result.data;

    // NOTE: Intentionally BYPASSING tier checks here as requested.
    // In production, we would check if user.subscriptionTier === 'premium' | 'enterprise'

    logger.info({ userId }, "Generating outreach message via Agent");

    const message = await RecruiterAgentService.generateOutreachMessage(
      candidate,
      job,
      recruiter || { recruiterName: "Recruiter" },
    );

    // 2. Cost Tracking (Fire & Forget)
    BillingService.trackCost(
      userId!,
      ESTIMATED_COST_OUTREACH,
      "agent_outreach",
    ).catch((err) =>
      logger.error({ err }, "Failed to track cost for outreach"),
    );

    return NextResponse.json({ message });
  } catch (err) {
    logger.error({ err }, "Outreach generation API failed");
    return handleApiError(err, "Failed to generate message");
  }
}
