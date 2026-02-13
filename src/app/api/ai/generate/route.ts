import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { generateText } from "@/lib/services/aiGenerationService";

import {
  getAuthenticatedUserId,
  handleApiError,
  safeParseBody,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { BillingService } from "@/lib/services/billingService";
import { getTierForRole } from "@/lib/services/userService";
import {
  getIdempotencyKey,
  checkIdempotency,
  markProcessing,
  storeIdempotencyResponse,
  clearIdempotencyKey,
  createCachedResponse,
  createProcessingResponse,
} from "@/lib/utils/idempotency";
import { withAppCheck } from "@/lib/middleware/appCheck";
import { lookupCache, storeInCache } from "@/lib/services/semanticCache";

import {
  GenerateRequestSchema
} from "@/lib/schemas/api/ai.schemas";
import {
  RateLimitError,
  EntitlementError,
  attachRateLimitHeaders,
  logUsage,
  logAuditEvent,
  handleRouteError
} from "@/lib/services/ai/ai-logging";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();
  const idempotencyKey = getIdempotencyKey(request);

  try {
    // App Check verification (when enabled via ENFORCE_APP_CHECK=true)
    const appCheckResult = await withAppCheck(request);
    if (appCheckResult) {
      return appCheckResult; // Returns 401 if App Check fails
    }

    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError) {
      return authError;
    }

    // Idempotency check (if key provided)
    if (idempotencyKey && userId) {
      const idempotencyCheck = await checkIdempotency(idempotencyKey, userId);

      if (idempotencyCheck.status === "cached" && idempotencyCheck.data) {
        logger.info(
          { userId, requestId, idempotencyKey },
          "Returning cached idempotent response",
        );
        return createCachedResponse(idempotencyCheck.data);
      }

      if (idempotencyCheck.status === "processing") {
        logger.warn(
          { userId, requestId, idempotencyKey },
          "Duplicate request still processing",
        );
        return createProcessingResponse();
      }

      // Mark as processing to prevent concurrent duplicates
      await markProcessing(idempotencyKey, userId);
    }

    // Parse and validate request body using Zod
    const body = await safeParseBody(request);
    const validationResult = GenerateRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((e: z.ZodIssue) => e.message)
        .join(", ");
      logger.warn(
        { userId, errors: validationResult.error.issues, requestId },
        "Invalid AI generate request",
      );
      return handleApiError(null, errorMessage, 400);
    }

    const {
      prompt,
      maxTokens,
      temperature: userTemp,
      task,
      role,
      skipCache,
    } = validationResult.data;

    // Semantic cache lookup (unless explicitly skipped)
    if (!skipCache && userId) {
      const cached = await lookupCache(userId, prompt);
      if (cached.hit && cached.response) {
        logger.info(
          {
            userId,
            requestId,
            similarity: cached.similarity,
            cacheKey: cached.cacheKey,
          },
          "🎯 Returning semantically cached AI response",
        );

        const cachedResult = {
          text: cached.response,
          model: cached.model || "cached",
          cached: true,
          similarity: cached.similarity,
        };

        // Store for idempotency as well
        if (idempotencyKey) {
          await storeIdempotencyResponse(idempotencyKey, userId, cachedResult);
        }

        return NextResponse.json(cachedResult, { status: 200 });
      }
    }

    // Task-specific temperature defaults
    const defaultTemps = {
      creative: 0.9,
      balanced: 0.7,
      structured: 0.3, // Recommended for data extraction
      precise: 0.1, // Determinisitic
    };

    const temperature = userTemp ?? defaultTemps[task] ?? 0.7;
    const plan = await getTierForRole(userId!, role);
    if (plan === "basic") {
      throw new EntitlementError("AI generation is a premium feature");
    }
    const entitlement = { plan };

    const rateLimit = await checkDistributedRateLimit(userId!, {
      tier: entitlement.plan as "basic" | "premium" | "enterprise",
      scope: "ai_generation",
    });

    if (!rateLimit.allowed) {
      throw new RateLimitError(Math.ceil((rateLimit.resetIn || 60000) / 1000));
    }

    // Billing & Budget Check
    const budgetAllowed = await BillingService.checkBudget(
      userId!,
      entitlement.plan as "basic" | "premium" | "enterprise",
    );
    if (!budgetAllowed) {
      return handleApiError(
        new Error("Budget exceeded"),
        "Monthly usage limit reached. Please upgrade your plan.",
        402,
      );
    }

    const result = await generateText(prompt, maxTokens, temperature);
    if (!result) {
      throw new Error("AI text generation failed - no result returned");
    }

    // Track Billing - use actual token counts when available, fallback to heuristic
    const tokenUsage = result.usage
      ? {
        input: result.usage.promptTokens,
        output: result.usage.completionTokens,
      }
      : {
        // Fallback heuristic for providers that don't return usage (e.g., HuggingFace)
        input: Math.ceil(prompt.length / 4),
        output: Math.ceil(result.text.length / 4),
      };
    await BillingService.trackUsage(userId!, result.model, tokenUsage);

    // Store in semantic cache for future similar queries
    if (!skipCache && userId) {
      const cachePromise = storeInCache(userId, prompt, result.text, {
        model: result.model,
        provider: "ai", // Generic provider label
        tokens: tokenUsage.input + tokenUsage.output,
      });

      if (cachePromise && typeof cachePromise.catch === "function") {
        cachePromise.catch((err) => {
          // Don't fail the request if caching fails
          logger.warn({ err, userId }, "Failed to store in semantic cache");
        });
      }
    }

    await Promise.all([
      logUsage({
        userId: userId!,
        prompt,
        model: result.model,
        plan: entitlement.plan,
        maxTokens,
        temperature,
        task,
      }),
      logAuditEvent({
        userId: userId!,
        prompt,
        model: result.model,
        status: "success",
        requestId,
      }),
    ]);

    const response = NextResponse.json(result, { status: 200 });
    attachRateLimitHeaders(response, rateLimit);
    logger.info(
      { userId, model: result.model, plan: entitlement.plan, requestId },
      "AI text generation succeeded",
    );

    // Store idempotent response for future duplicate requests
    if (idempotencyKey && userId) {
      await storeIdempotencyResponse(idempotencyKey, userId, result);
    }

    return response;
  } catch (error) {
    // Clear idempotency key on error to allow retry
    if (idempotencyKey) {
      const { userId } = await getAuthenticatedUserId(request);
      if (userId) {
        await clearIdempotencyKey(idempotencyKey, userId);
      }
    }
    return handleRouteError(error);
  }
}

