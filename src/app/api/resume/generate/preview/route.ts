import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  getAuthenticatedUserId,
  handleApiError,
} from "@/lib/utils/api-helpers";
import { GenerateResumePreviewRequestSchema } from "@/lib/schemas/api";
import { getUserTier } from "@/lib/services/userService";
import type { SubscriptionTier } from "@/lib/config";
import { processSyncGeneration } from "@/lib/services/resumeGenerationOrchestrator";
import { containsPromptInjection } from "@/lib/utils/promptSafety";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const { userId: rawUserId, error } = await getAuthenticatedUserId(request);
  if (error) return error;

  const userId = rawUserId!;

  try {
    const parseResult = GenerateResumePreviewRequestSchema.safeParse(
      await request.json(),
    );
    if (!parseResult.success) {
      return handleApiError(parseResult.error, "Invalid preview request", 400, request);
    }

    const {
      message,
      conversationHistory,
      sessionData,
      modelId,
      inputSources,
      desiredStyle,
      strictMode,
    } = parseResult.data;

    // SECURITY: Check for prompt injection attempts
    if (message && containsPromptInjection(message)) {
      logger.warn({ userId }, "Prompt injection attempt detected in resume preview");
      return handleApiError(null, "Invalid characters in input", 400);
    }

    let userTier: SubscriptionTier = "basic";
    try {
      userTier = await getUserTier(userId);
    } catch (tierError) {
      logger.warn(
        { err: tierError, userId },
        "Failed to load user tier for preview, defaulting to basic",
      );
    }

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
      persistResult: false,
      requestId,
      entrypoint: "resume_preview",
    });

    return NextResponse.json(result, {
      headers: {
        "x-request-id": requestId,
      },
    });
  } catch (routeError: unknown) {
    logger.error(
      { err: routeError, userId },
      "Resume preview generation failed",
    );
    return handleApiError(routeError, "Resume preview generation failed", 500, request);
  }
}
