import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { BillingService } from "@/lib/services/billingService";
import {
  handleApiError,
  getAuthenticatedUserId,
} from "@/lib/utils/api-helpers";
import { getUserTier } from "@/lib/services/userService";
import type { SubscriptionTier } from "@/lib/config";
import { getResumeCount } from "@/lib/services/resumeService";
import { createGenerationJob } from "@/lib/services/resumeGenerationQueue";
import { GenerateResumeRequestSchema } from "@/lib/schemas/api";
import { processSyncGeneration } from "@/lib/services/resumeGenerationOrchestrator";
import { RESUME_GENERATION_HARD_CAP } from "@/lib/config/rateLimits";

// Cloud Functions URL for async processing (configured per environment)
const ASYNC_PROCESSOR_URL = process.env.ASYNC_RESUME_PROCESSOR_URL;

export async function POST(request: NextRequest) {
  try {
    // CRITICAL: Authentication is REQUIRED - no anonymous access
    const { userId: rawUserId, error } = await getAuthenticatedUserId(request);

    if (error) {
      logger.warn("🚨 SECURITY: Unauthenticated resume generation attempt");
      return error; // Return 401 Unauthorized
    }

    const userId = rawUserId!; // Assert non-null after error check

    logger.info({ userId }, "✅ Authenticated user generating resume:");

    // Use centralized service for tier info
    const userRole = await getUserTier(userId);

    const rateLimit = await checkDistributedRateLimit(userId, {
      tier: userRole as "basic" | "premium" | "enterprise",
      scope: "ai_generation",
    });

    if (!rateLimit.allowed) {
      return handleApiError(
        new Error("Too many requests"),
        "Too many requests. Please try again later.",
        429,
      );
    }

    // Hard per-user cap: max 10 resume generations per hour (regardless of tier)
    const generationCap = await checkDistributedRateLimit(userId, {
      limit: RESUME_GENERATION_HARD_CAP.limit,
      windowMs: RESUME_GENERATION_HARD_CAP.windowMs,
      scope: "resume_generation",
    });

    if (!generationCap.allowed) {
      logger.warn(
        {
          userId,
          remaining: generationCap.remaining,
          resetIn: generationCap.resetIn,
        },
        "⛔ Per-user resume generation cap reached",
      );
      return handleApiError(
        new Error("Resume generation limit reached"),
        `You have reached the limit of ${RESUME_GENERATION_HARD_CAP.limit} resume generations per hour. Please try again later.`,
        429,
      );
    }

    // Billing & Budget Check
    const budgetAllowed = await BillingService.checkBudget(userId, userRole);
    if (!budgetAllowed) {
      logger.warn(
        { userId, userRole },
        "⛔ Budget check blocked request (could be Firestore error or actual limit)",
      );
      return handleApiError(
        new Error("Budget exceeded"),
        "Monthly usage limit reached. Please upgrade your plan.",
        402,
      );
    }

    const parseResult = GenerateResumeRequestSchema.safeParse(
      await request.json(),
    );
    if (!parseResult.success) {
      return handleApiError(parseResult.error, "Message is required", 400);
    }
    const body = parseResult.data;
    const {
      message,
      conversationHistory,
      sessionData,
      modelId,
      inputSources,
      desiredStyle,
      strictMode,
      async: asyncMode,
    } = body;

    let userTier: SubscriptionTier = "basic";
    try {
      userTier = await getUserTier(userId);
    } catch (tierError) {
      logger.warn(
        { err: tierError, userId },
        "Failed to load user tier, defaulting to basic",
      );
    }

    // Enforce Quantity Limit for Basic Users
    if (userTier === "basic") {
      let resumeCount = 0;
      try {
        resumeCount = await getResumeCount(userId);
      } catch (countError) {
        logger.warn(
          { err: countError, userId },
          "Failed to get resume count, allowing request to proceed",
        );
      }

      if (resumeCount >= 1) {
        logger.warn(
          { userId, resumeCount },
          "⛔ Basic user attempted to create 2nd resume",
        );
        return handleApiError(
          new Error("Resume limit reached"),
          "You have reached the limit of 1 resume for the Basic plan. Please upgrade to Premium to create more resumes.",
          403,
        );
      }
    }

    if (!message) {
      return handleApiError(
        new Error("Message is required"),
        "Message is required",
        400,
      );
    }

    // ASYNC MODE: Queue the job for background processing
    if (asyncMode) {
      logger.info({ userId }, "🔄 Async mode: Queueing resume generation job");

      const normalizedConversationHistory = (conversationHistory || []).map(
        (entry, index) => ({
          id: entry.id ?? `msg-${index}`,
          content: entry.content,
          isUser: entry.isUser,
          timestamp: entry.timestamp ?? new Date().toISOString(),
        }),
      );

      // Create job in Firestore
      const { jobId } = await createGenerationJob(userId, {
        message,
        conversationHistory: normalizedConversationHistory,
        sessionData: sessionData ?? undefined,
        modelId,
        userTier,
        inputSources,
        desiredStyle,
        strictMode,
      });

      // Trigger Cloud Task to process the job
      if (ASYNC_PROCESSOR_URL) {
        try {
          // Fire-and-forget: don't await the processing
          fetch(ASYNC_PROCESSOR_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId }),
          }).catch((err) => {
            logger.error({ err, jobId }, "Failed to trigger async processor");
          });
        } catch (triggerError) {
          logger.error(
            { err: triggerError, jobId },
            "Error triggering async processor",
          );
        }
      } else {
        logger.warn(
          "ASYNC_RESUME_PROCESSOR_URL not configured, job will wait for manual processing",
        );
      }

      // Return immediately with job ID
      return NextResponse.json({
        jobId,
        status: "pending",
        message:
          "Resume generation queued. Poll /api/resume/generate/status/{jobId} for updates.",
      });
    }

    // SYNC MODE: Delegate to orchestrator service
    try {
      const result = await processSyncGeneration({
        userId,
        message,
        conversationHistory,
        sessionData: sessionData ?? undefined,
        modelId,
        userTier,
        inputSources,
        desiredStyle,
        strictMode,
      });

      return NextResponse.json(result);
    } catch (syncError) {
      logger.error({ err: syncError }, "Sync resume generation failed");
      return handleApiError(syncError, "Resume generation failed");
    }
  } catch (error: unknown) {
    logger.error({ err: error }, "Error in resume generation:");
    return handleApiError(error, "Internal server error");
  }
}
