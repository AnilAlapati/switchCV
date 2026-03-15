import { randomUUID } from "node:crypto";
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
    const requestId = request.headers.get("x-request-id") ?? randomUUID();

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

    // Rate limit: per-conversation-turn (generous — every chat message counts here)
    const conversationLimit = await checkDistributedRateLimit(userId, {
      tier: userRole as "basic" | "premium" | "enterprise",
      scope: "conversation_turn",
    });

    if (!conversationLimit.allowed) {
      const retryMinutes = Math.ceil(conversationLimit.resetIn / 60000);
      logger.warn(
        { userId, retryMinutes, resetIn: conversationLimit.resetIn },
        "Conversation turn rate limit reached",
      );
      return handleApiError(
        new Error("Too many requests"),
        "You're sending messages too quickly. Please wait a few minutes and try again. Your conversation progress is saved.",
        429,
      );
    }

    // Pre-check: Is the user at the resume creation hard cap?
    // This is a READ-ONLY check (dryRun) — we don't increment the counter here.
    // The counter is incremented only when a resume is actually created (after orchestration).
    const generationCapCheck = await checkDistributedRateLimit(userId, {
      limit: RESUME_GENERATION_HARD_CAP.limit,
      windowMs: RESUME_GENERATION_HARD_CAP.windowMs,
      scope: "resume_creation",
      dryRun: true,
    });

    if (!generationCapCheck.allowed) {
      const retryMinutes = Math.ceil(generationCapCheck.resetIn / 60000);
      logger.warn(
        {
          userId,
          remaining: generationCapCheck.remaining,
          resetIn: generationCapCheck.resetIn,
        },
        "⛔ Per-user resume creation cap reached",
      );
      return handleApiError(
        new Error("Resume creation limit reached"),
        "You've reached the hourly resume creation limit. Please wait a few minutes and try again. Your conversation progress is saved.",
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
      return NextResponse.json(
        {
          requestId,
          jobId,
          status: "pending",
          message:
            "Resume generation queued. Poll /api/resume/generate/status/{jobId} for updates.",
        },
        {
          headers: {
            "x-request-id": requestId,
          },
        },
      );
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
        requestId,
        entrypoint: "resume_generate",
      });

      // Only count toward the hard cap when a resume was actually created
      if (result.created && result.resumeId) {
        await checkDistributedRateLimit(userId, {
          limit: RESUME_GENERATION_HARD_CAP.limit,
          windowMs: RESUME_GENERATION_HARD_CAP.windowMs,
          scope: "resume_creation",
        }).catch((err) => {
          logger.error(
            { err, userId },
            "Failed to increment resume creation counter (non-blocking)",
          );
        });
      }

      return NextResponse.json(result, {
        headers: {
          "x-request-id": requestId,
        },
      });
    } catch (syncError) {
      logger.error({ err: syncError }, "Sync resume generation failed");
      return handleApiError(syncError, "Resume generation failed");
    }
  } catch (error: unknown) {
    logger.error({ err: error }, "Error in resume generation:");
    return handleApiError(error, "Internal server error");
  }
}
