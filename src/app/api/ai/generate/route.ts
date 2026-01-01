import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import { generateText } from "@/lib/services/aiGenerationService";
import admin, { adminDb } from "@/lib/firebase-admin";
import {
  getAuthenticatedUserId,
  handleApiError,
  safeParseBody,
} from "@/lib/utils/api-helpers";
import { logger } from "@/lib/logger";

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
    .optional()
    .default(0.9),
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

const RATE_LIMIT_WINDOW_MS = Number(
  process.env.AI_RATE_LIMIT_WINDOW_MS || 60_000
);

const BASE_LIMIT = Math.max(
  1,
  Number(
    process.env.RATE_LIMIT_AI_GENERATION ||
    process.env.NEXT_PUBLIC_RATE_LIMIT_AI_GENERATION ||
    10
  )
);
const PLAN_MULTIPLIER: Record<string, number> = {
  basic: 1,
  premium: 1,
  enterprise: 2,
};

const AUDIT_LOG_TTL_DAYS = Number(process.env.AI_AUDIT_LOG_TTL_DAYS || 30);
const AUDIT_LOG_TTL_MS = AUDIT_LOG_TTL_DAYS * 24 * 60 * 60 * 1000;

function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}

export async function POST(request: NextRequest) {
  const requestId = randomUUID();

  try {
    const { userId, error: authError } = await getAuthenticatedUserId(request);
    if (authError) {
      return authError;
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

    const { prompt, maxTokens, temperature } = validationResult.data;

    const entitlement = await getEntitlement(userId!);
    enforceEntitlement(entitlement);

    const rateLimit = await enforceRateLimit(userId!, entitlement.plan);

    const result = await generateText(prompt, maxTokens, temperature);

    await Promise.all([
      logUsage({
        userId: userId!,
        prompt,
        model: result.model,
        plan: entitlement.plan,
        maxTokens,
        temperature,
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
    return response;
  } catch (error) {
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

function enforceEntitlement(entitlement: Entitlement): void {
  // No explicit plan restrictions - all tiers can generate text
  // Limits are handled by Rate Limiting per plan
  return;
}

async function enforceRateLimit(userId: string, plan: string) {
  const planLimit = Math.max(
    1,
    Math.round(BASE_LIMIT * (PLAN_MULTIPLIER[plan] ?? PLAN_MULTIPLIER.basic))
  );
  const windowStartThreshold = Date.now() - RATE_LIMIT_WINDOW_MS;
  const docRef = adminDb
    .collection("rateLimits")
    .doc(`ai_generation_${userId}`);

  const { remaining, resetTime } = await adminDb.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    let count = 0;
    let windowStart = Date.now();

    if (doc.exists) {
      const data = doc.data();
      const storedWindowStart =
        data?.windowStart instanceof admin.firestore.Timestamp
          ? data.windowStart.toMillis()
          : typeof data?.windowStart === "number"
            ? data.windowStart
            : windowStart;

      if (storedWindowStart > windowStartThreshold) {
        windowStart = storedWindowStart;
        count = data?.count || 0;
      } else {
        windowStart = Date.now();
        count = 0;
      }
    }

    if (count >= planLimit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((windowStart + RATE_LIMIT_WINDOW_MS - Date.now()) / 1000)
      );
      throw new RateLimitError(retryAfterSeconds);
    }

    tx.set(
      docRef,
      {
        userId,
        scope: "ai_generation",
        plan,
        count: count + 1,
        windowStart: admin.firestore.Timestamp.fromMillis(windowStart),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromMillis(
          windowStart + RATE_LIMIT_WINDOW_MS * 2
        ),
      },
      { merge: true }
    );

    return {
      remaining: Math.max(0, planLimit - (count + 1)),
      resetTime: windowStart + RATE_LIMIT_WINDOW_MS,
    };
  });

  return { remaining, resetTime, limit: planLimit };
}

function attachRateLimitHeaders(
  response: NextResponse,
  data: { remaining: number; resetTime: number; limit: number }
) {
  response.headers.set("X-RateLimit-Limit", data.limit.toString());
  response.headers.set("X-RateLimit-Remaining", data.remaining.toString());
  response.headers.set(
    "X-RateLimit-Reset",
    Math.floor(data.resetTime / 1000).toString()
  );
}

async function logUsage(params: {
  userId: string;
  prompt: string;
  model: string;
  plan: string;
  maxTokens: number;
  temperature: number;
}) {
  await adminDb.collection("aiUsageLogs").add({
    userId: params.userId,
    plan: params.plan,
    scope: "ai_generation",
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
    return handleApiError(error, error.message, 403);
  }

  return handleApiError(error, "AI text generation failed");
}
