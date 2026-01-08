
import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import { generateText } from "@/lib/services/aiGenerationService";
// eslint-disable-next-line no-restricted-imports
import admin, { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  handleApiError,
  safeParseBody,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";
import { checkDistributedRateLimit } from "@/lib/utils/distributedRateLimit";
import { BillingService } from "@/lib/services/billingService";
import {
  getIdempotencyKey,
  checkIdempotency,
  markProcessing,
  storeIdempotencyResponse,
  clearIdempotencyKey,
  createCachedResponse,
  createProcessingResponse,
} from "@/lib/utils/idempotency";

/**
 * Zod schema for AI generation request validation
 */
const GenerateRequestSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt is required")
    .max(2000, "Prompt exceeds maximum length of 2000 characters"),
  maxTokens: z
    .number()
    .int()
    .min(1, "maxTokens must be at least 1")
    .max(4000, "maxTokens cannot exceed 4000")
    .optional()
    .default(150),
  temperature: z
    .number()
    .min(0, "Temperature must be between 0 and 2")
    .max(2, "Temperature must be between 0 and 2")
    .optional(),
  task: z
    .enum(["creative", "balanced", "structured", "precise"])
    .optional()
    .default("creative"),
});

interface Entitlement {
  plan: "basic" | "premium" | "enterprise" | string;
}

class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Too many requests");
    this.name = "RateLimitError";
  }
}

class EntitlementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EntitlementError";
  }
}

const AUDIT_LOG_TTL_DAYS = Number(process.env.AI_AUDIT_LOG_TTL_DAYS || 30);
const AUDIT_LOG_TTL_MS = AUDIT_LOG_TTL_DAYS * 24 * 60 * 60 * 1000;

function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();
  const idempotencyKey = getIdempotencyKey(request);

  try {
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError) {
      return authError;
    }

    // Idempotency check (if key provided)
    if (idempotencyKey && userId) {
      const idempotencyCheck = await checkIdempotency(idempotencyKey, userId);

      if (idempotencyCheck.status === "cached" && idempotencyCheck.data) {
        logger.info({ userId, requestId, idempotencyKey }, "Returning cached idempotent response");
        return createCachedResponse(idempotencyCheck.data);
      }

      if (idempotencyCheck.status === "processing") {
        logger.warn({ userId, requestId, idempotencyKey }, "Duplicate request still processing");
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
        "Invalid AI generate request"
      );
      return handleApiError(null, errorMessage, 400);
    }

    const { prompt, maxTokens, temperature: userTemp, task } = validationResult.data;

    // Task-specific temperature defaults
    const defaultTemps = {
      creative: 0.9,
      balanced: 0.7,
      structured: 0.3, // Recommended for data extraction
      precise: 0.1,    // Determinisitic
    };

    const temperature = userTemp ?? defaultTemps[task] ?? 0.7;

    const entitlement = await getEntitlement(userId!);

    // Unified Rate Limiting
    const rateLimit = await checkDistributedRateLimit(userId!, {
      tier: entitlement.plan as any,
      scope: "ai_generation",
    } as any);

    if (!rateLimit.allowed) {
      throw new RateLimitError(Math.ceil((rateLimit.resetIn || 60000) / 1000));
    }

    // Billing & Budget Check
    const budgetAllowed = await BillingService.checkBudget(userId!, entitlement.plan as any);
    if (!budgetAllowed) {
      return handleApiError(
        new Error("Budget exceeded"),
        "Monthly usage limit reached. Please upgrade your plan.",
        402
      );
    }

    const result = await generateText(prompt, maxTokens, temperature);

    // Track Billing - use actual token counts when available, fallback to heuristic
    const tokenUsage = result.usage ? {
      input: result.usage.promptTokens,
      output: result.usage.completionTokens
    } : {
      // Fallback heuristic for providers that don't return usage (e.g., HuggingFace)
      input: Math.ceil(prompt.length / 4),
      output: Math.ceil(result.text.length / 4)
    };
    await BillingService.trackUsage(userId!, result.model, tokenUsage);

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
      "AI text generation succeeded"
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

async function getEntitlement(userId: string): Promise<Entitlement> {
  const snapshot = await adminDb.collection("users").doc(userId).get();
  const data = snapshot.data();
  return {
    plan: (data?.subscriptionTier as string) || "basic",
  };
}

function attachRateLimitHeaders(
  response: NextResponse,
  data: { remaining: number; resetIn?: number; limit: number }
) {
  response.headers.set("X-RateLimit-Limit", data.limit.toString());
  response.headers.set("X-RateLimit-Remaining", data.remaining.toString());
  if (data.resetIn) {
    response.headers.set(
      "X-RateLimit-Reset",
      Math.floor(Date.now() / 1000 + data.resetIn / 1000).toString()
    );
  }
}

async function logUsage(params: {
  userId: string;
  prompt: string;
  model: string;
  plan: string;
  maxTokens: number;
  temperature: number;
  task?: string;
}) {
  await adminDb.collection("aiUsageLogs").add({
    userId: params.userId,
    plan: params.plan,
    scope: "ai_generation",
    task: params.task || "unknown",
    promptChars: params.prompt.length,
    requestedTokens: params.maxTokens,
    temperature: params.temperature,
    model: params.model,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function logAuditEvent(params: {
  userId: string;
  prompt: string;
  model: string;
  status: string;
  requestId: string;
}) {
  const promptHash = hashPrompt(params.prompt);
  const expiresAt = admin.firestore.Timestamp.fromMillis(
    Date.now() + AUDIT_LOG_TTL_MS
  );

  await adminDb.collection("aiAuditLogs").add({
    userId: params.userId,
    promptHash,
    promptLength: params.prompt.length,
    model: params.model,
    status: params.status,
    requestId: params.requestId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
  });
}

function handleRouteError(error: unknown) {
  if (error instanceof RateLimitError) {
    const response = handleApiError(
      error,
      "Too many requests. Please try again later.",
      429
    );
    response.headers.set("Retry-After", error.retryAfterSeconds.toString());
    return response;
  }

  if (error instanceof EntitlementError) {
    return handleApiError(error, "Access denied - insufficient entitlement", 403);
  }

  return handleApiError(error, "AI text generation failed");
}
