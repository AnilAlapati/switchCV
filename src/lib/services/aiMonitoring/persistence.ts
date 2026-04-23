import { randomUUID } from "node:crypto";
import admin, { adminDb } from "@/lib/firebase-admin";
import { logger } from "@/lib/logger";
import { redactMonitoringPreview } from "./context";
import type {
  AIFailureEventInput,
  AIObservationContext,
  AIObservationStage,
  AIRequestStatus,
  AIRequestSummaryInput,
  AIStageSummary,
  AIStageTracking,
} from "./types";
import { getStageTracking, removeUndefined } from "./types";

const AI_FAILURE_EVENTS_DOC = adminDb
  .collection("monitoring")
  .doc("aiFailureEvents");
const AI_REQUEST_SUMMARIES_DOC = adminDb
  .collection("monitoring")
  .doc("aiRequestSummaries");

export async function persistAIFailureEvent(
  input: AIFailureEventInput,
): Promise<string | null> {
  const eventId = randomUUID();
  const stageTracking = getStageTracking(input.context, input.stage);

  stageTracking.failureCount += 1;
  stageTracking.status = "failed";
  stageTracking.fallbackUsed =
    stageTracking.fallbackUsed || Boolean(input.fallbackUsed);
  stageTracking.fallbackSucceeded =
    stageTracking.fallbackSucceeded || Boolean(input.fallbackSucceeded);
  stageTracking.lastLatencyMs = input.latencyMs;

  if (input.provider) {
    stageTracking.providerSet.add(input.provider);
    stageTracking.lastProvider = input.provider;
  }

  if (input.model) {
    stageTracking.modelSet.add(input.model);
    stageTracking.lastModel = input.model;
  }

  stageTracking.failureCodes.push(input.failureCode);
  input.context.failureCount += 1;

  const eventDoc = removeUndefined({
    requestId: input.context.requestId,
    sessionId: input.context.sessionId,
    userIdHash: input.context.userIdHash,
    entrypoint: input.context.entrypoint,
    stage: input.stage,
    provider: input.provider,
    model: input.model,
    failureCode: input.failureCode,
    errorMessage: input.errorMessage,
    httpStatus: input.httpStatus,
    latencyMs: input.latencyMs,
    fallbackUsed: Boolean(input.fallbackUsed),
    fallbackSucceeded: Boolean(input.fallbackSucceeded),
    userTier: input.context.userTier,
    environment: input.context.environment,
    deployVersion: input.context.deployVersion,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    conversationTurn: input.context.conversationTurn,
    promptPreview: input.promptPreview
      ? redactMonitoringPreview(input.promptPreview)
      : undefined,
    responsePreview: input.responsePreview
      ? redactMonitoringPreview(input.responsePreview)
      : undefined,
    failureSubcode: input.failureSubcode,
    providerErrorClass: input.providerErrorClass,
    schemaErrorCount: input.schemaErrorCount,
  });

  try {
    await AI_FAILURE_EVENTS_DOC.collection("events")
      .doc(eventId)
      .set(eventDoc as Record<string, unknown>);
    stageTracking.failureEventIds.push(eventId);
    return eventId;
  } catch (error) {
    logger.error(
      {
        err: error,
        requestId: input.context.requestId,
        stage: input.stage,
        failureCode: input.failureCode,
      },
      "Failed to persist AI monitoring failure event",
    );
    return null;
  }
}

async function updateStageFailureEvents(
  context: AIObservationContext,
  stage: AIObservationStage,
  values: Record<string, unknown>,
): Promise<void> {
  const stageTracking = context.stages[stage];
  if (!stageTracking || stageTracking.failureEventIds.length === 0) {
    return;
  }

  const batch = adminDb.batch();
  for (const eventId of stageTracking.failureEventIds) {
    batch.set(
      AI_FAILURE_EVENTS_DOC.collection("events").doc(eventId),
      removeUndefined(values) as Record<string, unknown>,
      { merge: true },
    );
  }

  try {
    await batch.commit();
  } catch (error) {
    logger.error(
      {
        err: error,
        requestId: context.requestId,
        stage,
      },
      "Failed to update AI monitoring stage events",
    );
  }
}

export async function markAIStageSuccess(
  context: AIObservationContext,
  stage: AIObservationStage,
  metadata?: { provider?: string; model?: string; latencyMs?: number },
): Promise<void> {
  const stageTracking = getStageTracking(context, stage);

  if (metadata?.provider) {
    stageTracking.providerSet.add(metadata.provider);
    stageTracking.lastProvider = metadata.provider;
  }

  if (metadata?.model) {
    stageTracking.modelSet.add(metadata.model);
    stageTracking.lastModel = metadata.model;
  }

  if (metadata?.latencyMs !== undefined) {
    stageTracking.lastLatencyMs = metadata.latencyMs;
  }

  if (stageTracking.failureCount > 0) {
    stageTracking.status = "degraded";
    stageTracking.fallbackUsed = true;
    stageTracking.fallbackSucceeded = true;

    if (!stageTracking.fallbackCountApplied) {
      context.fallbackCount += stageTracking.failureCount;
      stageTracking.fallbackCountApplied = true;
    }

    await updateStageFailureEvents(context, stage, {
      fallbackUsed: true,
      fallbackSucceeded: true,
    });
    return;
  }

  stageTracking.status = "success";
}

export async function markAIStageRecoveredWithFallback(
  context: AIObservationContext,
  stage: AIObservationStage,
  metadata?: { latencyMs?: number },
): Promise<void> {
  const stageTracking = getStageTracking(context, stage);
  stageTracking.status = "degraded";
  stageTracking.fallbackUsed = true;
  stageTracking.fallbackSucceeded = true;

  if (metadata?.latencyMs !== undefined) {
    stageTracking.lastLatencyMs = metadata.latencyMs;
  }

  if (!stageTracking.fallbackCountApplied) {
    context.fallbackCount += stageTracking.failureCount;
    stageTracking.fallbackCountApplied = true;
  }

  await updateStageFailureEvents(context, stage, {
    fallbackUsed: true,
    fallbackSucceeded: true,
  });
}

export function markAIStageFailed(
  context: AIObservationContext,
  stage: AIObservationStage,
  metadata?: { latencyMs?: number },
): void {
  const stageTracking = getStageTracking(context, stage);
  stageTracking.status = "failed";

  if (metadata?.latencyMs !== undefined) {
    stageTracking.lastLatencyMs = metadata.latencyMs;
  }
}

function buildStageSummaries(
  context: AIObservationContext,
): Partial<Record<AIObservationStage, AIStageSummary>> {
  const entries = Object.entries(context.stages) as Array<
    [AIObservationStage, AIStageTracking]
  >;

  return entries.reduce<Partial<Record<AIObservationStage, AIStageSummary>>>(
    (accumulator, [stage, tracking]) => {
      accumulator[stage] = removeUndefined({
        status: tracking.status,
        attempts: tracking.attemptCount,
        failureCount: tracking.failureCount,
        fallbackUsed: tracking.fallbackUsed,
        fallbackSucceeded: tracking.fallbackSucceeded,
        failureCodes: tracking.failureCodes,
        providers: [...tracking.providerSet],
        models: [...tracking.modelSet],
        latencyMs: tracking.lastLatencyMs,
      }) as AIStageSummary;
      return accumulator;
    },
    {},
  );
}

export function deriveAIRequestStatus(
  context: AIObservationContext,
  userVisibleFailure: boolean,
): AIRequestStatus {
  if (userVisibleFailure) {
    return "failed";
  }

  if (context.failureCount > 0) {
    return "degraded";
  }

  return "success";
}

export async function persistAIRequestSummary(
  input: AIRequestSummaryInput,
): Promise<void> {
  const completedAt = new Date();
  const status = deriveAIRequestStatus(input.context, input.userVisibleFailure);

  const summaryDoc = removeUndefined({
    requestId: input.context.requestId,
    userIdHash: input.context.userIdHash,
    entrypoint: input.context.entrypoint,
    startedAt: input.context.startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - input.context.startedAt.getTime(),
    status,
    userVisibleFailure: input.userVisibleFailure,
    failureCount: input.context.failureCount,
    fallbackCount: input.context.fallbackCount,
    stages: buildStageSummaries(input.context),
    finalOutcome: input.finalOutcome,
    createdResume: input.createdResume,
    environment: input.context.environment,
    deployVersion: input.context.deployVersion,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  try {
    await AI_REQUEST_SUMMARIES_DOC.collection("requests")
      .doc(input.context.requestId)
      .set(summaryDoc as Record<string, unknown>, { merge: true });
  } catch (error) {
    logger.error(
      {
        err: error,
        requestId: input.context.requestId,
      },
      "Failed to persist AI monitoring request summary",
    );
  }
}
