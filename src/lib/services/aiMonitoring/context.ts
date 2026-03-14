import { createHash, randomUUID } from "node:crypto";
import type { SubscriptionTier } from "@/lib/config";
import type { AIObservationContext, AIObservationStage } from "./types";
import { getStageTracking } from "./types";

const PREVIEW_MAX_LENGTH = 300;

export function hashMonitoringUserId(userId: string): string {
  return createHash("sha256").update(userId).digest("hex");
}

export function resolveMonitoringSessionId(
  sessionData: unknown,
  fallbackRequestId: string,
): string {
  if (sessionData && typeof sessionData === "object") {
    const typedSessionData = sessionData as {
      sessionId?: unknown;
      id?: unknown;
      progress?: { sessionId?: unknown };
    };

    if (typeof typedSessionData.sessionId === "string") {
      return typedSessionData.sessionId;
    }

    if (typeof typedSessionData.progress?.sessionId === "string") {
      return typedSessionData.progress.sessionId;
    }

    if (typeof typedSessionData.id === "string") {
      return typedSessionData.id;
    }
  }

  return fallbackRequestId;
}

export function redactMonitoringPreview(value: string): string {
  return value
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[EMAIL]")
    .replace(
      /(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?){2,}\d{3,4}\b/g,
      "[PHONE]",
    )
    .replace(/https?:\/\/\S+/gi, "[URL]")
    .replace(/\b\d{5,}\b/g, "[NUMBER]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, PREVIEW_MAX_LENGTH);
}

export function createAIObservationContext(params: {
  userId: string;
  userTier: SubscriptionTier;
  entrypoint: string;
  requestId?: string;
  sessionId?: string;
  conversationTurn?: number;
}): AIObservationContext {
  const requestId = params.requestId ?? randomUUID();
  const sessionId = params.sessionId?.trim() || requestId;

  return {
    requestId,
    sessionId,
    userIdHash: hashMonitoringUserId(params.userId),
    userTier: params.userTier,
    entrypoint: params.entrypoint,
    deployVersion:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.APP_VERSION ||
      process.env.NEXT_PUBLIC_APP_VERSION ||
      "unknown",
    environment: process.env.NODE_ENV || "unknown",
    conversationTurn: params.conversationTurn ?? 1,
    startedAt: new Date(),
    stages: {},
    failureCount: 0,
    fallbackCount: 0,
  };
}

export function noteAIStageAttempt(
  context: AIObservationContext | null | undefined,
  stage: AIObservationStage,
  metadata?: { provider?: string; model?: string },
): void {
  if (!context) {
    return;
  }

  const stageTracking = getStageTracking(context, stage);
  stageTracking.attemptCount += 1;

  if (metadata?.provider) {
    stageTracking.providerSet.add(metadata.provider);
    stageTracking.lastProvider = metadata.provider;
  }

  if (metadata?.model) {
    stageTracking.modelSet.add(metadata.model);
    stageTracking.lastModel = metadata.model;
  }
}
