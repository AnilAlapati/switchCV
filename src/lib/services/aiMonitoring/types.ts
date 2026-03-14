import type { SubscriptionTier } from "@/lib/config";

export const AI_FAILURE_CODES = [
  "AI_TIMEOUT",
  "AI_PROVIDER_4XX",
  "AI_PROVIDER_5XX",
  "AI_EMPTY_RESPONSE",
  "AI_NON_JSON_RESPONSE",
  "AI_SCHEMA_VALIDATION_FAILED",
  "AI_SECRET_MISSING",
  "AI_PROVIDER_NOT_CONFIGURED",
  "AI_CIRCUIT_OPEN",
  "AI_ALL_MODELS_FAILED",
  "AI_CONTEXT_TOO_LARGE",
  "AI_UNKNOWN_ERROR",
] as const;

export type AIFailureCode = (typeof AI_FAILURE_CODES)[number];
export type AIObservationStage = "extraction" | "generation" | "repair";
export type AIStageStatus = "success" | "degraded" | "failed";
export type AIRequestStatus = "success" | "degraded" | "failed";

export interface AIObservationContext {
  requestId: string;
  sessionId: string;
  userIdHash: string;
  userTier: SubscriptionTier;
  entrypoint: string;
  deployVersion: string;
  environment: string;
  conversationTurn: number;
  startedAt: Date;
  stages: Partial<Record<AIObservationStage, AIStageTracking>>;
  failureCount: number;
  fallbackCount: number;
}

export interface AIStageTracking {
  status: AIStageStatus;
  attemptCount: number;
  failureCount: number;
  fallbackUsed: boolean;
  fallbackSucceeded: boolean;
  providerSet: Set<string>;
  modelSet: Set<string>;
  failureCodes: AIFailureCode[];
  failureEventIds: string[];
  lastLatencyMs?: number;
  lastProvider?: string;
  lastModel?: string;
  fallbackCountApplied: boolean;
}

export interface AIFailureEventInput {
  context: AIObservationContext;
  stage: AIObservationStage;
  provider?: string;
  model?: string;
  failureCode: AIFailureCode;
  errorMessage: string;
  httpStatus?: number;
  latencyMs?: number;
  fallbackUsed?: boolean;
  fallbackSucceeded?: boolean;
  promptPreview?: string;
  responsePreview?: string;
  failureSubcode?: string;
  providerErrorClass?: string;
  schemaErrorCount?: number;
}

export interface AIRequestSummaryInput {
  context: AIObservationContext;
  userVisibleFailure: boolean;
  finalOutcome: string;
  createdResume: boolean;
}

export interface AIStageSummary {
  status: AIStageStatus;
  attempts: number;
  failureCount: number;
  fallbackUsed: boolean;
  fallbackSucceeded: boolean;
  failureCodes: AIFailureCode[];
  providers: string[];
  models: string[];
  latencyMs?: number;
}

export function getStageTracking(
  context: AIObservationContext,
  stage: AIObservationStage,
): AIStageTracking {
  const existing = context.stages[stage];
  if (existing) {
    return existing;
  }

  const created: AIStageTracking = {
    status: "success",
    attemptCount: 0,
    failureCount: 0,
    fallbackUsed: false,
    fallbackSucceeded: false,
    providerSet: new Set<string>(),
    modelSet: new Set<string>(),
    failureCodes: [],
    failureEventIds: [],
    fallbackCountApplied: false,
  };

  context.stages[stage] = created;
  return created;
}

export function removeUndefined(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => removeUndefined(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce<Record<string, unknown>>(
      (accumulator, [key, entryValue]) => {
        const cleaned = removeUndefined(entryValue);
        if (cleaned !== undefined) {
          accumulator[key] = cleaned;
        }
        return accumulator;
      },
      {},
    );
  }

  if (value === undefined) {
    return undefined;
  }

  return value;
}
