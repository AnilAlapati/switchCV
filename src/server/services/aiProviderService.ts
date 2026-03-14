import "server-only";

/**
 * AI Provider Service - Tiered Model Selection
 *
 * This service provides tier-based AI model selection:
 * - Basic: Free/cheapest models only (Groq free tier, Gemini Flash)
 * - Premium: Better models with fallback (GPT-4o-mini, Gemini Pro)
 * - Enterprise: Best available models (GPT-4o, Claude, Gemini Pro)
 */

import { logger } from "@/lib/logger";
import {
  classifyAIFailure,
  markAIStageFailed,
  markAIStageSuccess,
  noteAIStageAttempt,
  persistAIFailureEvent,
  type AIObservationContext,
  type AIObservationStage,
} from "@/lib/services/aiMonitoringService";
import { CircuitBreaker } from "@/lib/utils/CircuitBreaker";
import type {
  AIModelConfig,
  GenerateOptions,
  GenerateResult,
  SelectableModel,
  UserTier,
} from "@/types/ai";
import { AI_MODELS, TIER_ACCESS, TIER_PROVIDER_PRIORITY } from "./ai/registry";
import { callOpenAI, callGemini, callAnthropic, callXAI } from "./ai/providers";

export type {
  AIModelConfig,
  GenerateOptions,
  GenerateResult,
  SelectableModel,
  UserTier,
} from "@/types/ai";

type MonitoredGenerateOptions = GenerateOptions & {
  observationContext?: AIObservationContext;
  stage?: AIObservationStage;
};

// ==================== CIRCUIT BREAKERS ====================

const breakers = {
  google: new CircuitBreaker("google"),
  openai: new CircuitBreaker("openai"),
  anthropic: new CircuitBreaker("anthropic"),
  xai: new CircuitBreaker("xai"),
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if a provider has a valid API key configured.
 *
 * Checks process.env first (fast path).  When process.env is empty the key
 * may still be available via Firebase Secret Manager at call time, so we
 * return true for known providers and let callProvider() resolve it.
 */
function isProviderConfigured(provider: string): boolean {
  switch (provider) {
    case "openai":
      return true; // Key resolved lazily via getSecret() in callOpenAI
    case "google":
      return true; // Key resolved lazily via getSecret() in callGemini
    case "anthropic":
      return true; // Key resolved lazily via getSecret() in callAnthropic
    case "xai":
      return true; // Key resolved lazily via getSecret() in callXAI
    default:
      return false;
  }
}

/**
 * Get models available for a specific user tier, sorted by cost
 */
export function getModelsForTier(userTier: UserTier): AIModelConfig[] {
  const allowedTiers = TIER_ACCESS[userTier];
  const providerPriority = TIER_PROVIDER_PRIORITY[userTier];

  return AI_MODELS.filter((model) => allowedTiers.includes(model.tier)).sort(
    (a, b) => {
      // First sort by provider priority
      const aProviderIndex = providerPriority.indexOf(a.provider);
      const bProviderIndex = providerPriority.indexOf(b.provider);
      if (aProviderIndex !== bProviderIndex) {
        return aProviderIndex - bProviderIndex;
      }
      // Then by cost (cheapest first for basic, quality first for premium)
      if (userTier === "basic") {
        return a.costPer1MTokens - b.costPer1MTokens;
      }
      // For premium/enterprise, prioritize quality
      return b.quality - a.quality;
    },
  );
}

/**
 * Models a user can explicitly select for a tier.
 * Already filtered by provider configuration and tier access.
 */
export function getSelectableModels(userTier: UserTier): SelectableModel[] {
  return getModelsForTier(userTier)
    .filter((model) => isProviderConfigured(model.provider))
    .map((model) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      tier: model.tier,
      quality: model.quality,
      costPer1MTokens: model.costPer1MTokens,
    }));
}

/**
 * Call the appropriate provider
 */
async function callProvider(
  model: AIModelConfig,
  prompt: string,
  maxTokens: number,
  temperature: number,
  options?: { jsonMode?: boolean; responseSchema?: Record<string, unknown> },
): Promise<{ text: string; model: string }> {
  switch (model.provider) {
    case "openai":
      return callOpenAI(model.id, prompt, maxTokens, temperature, {
        jsonMode: options?.jsonMode,
      });
    case "google":
      return callGemini(model.id, prompt, maxTokens, temperature, {
        jsonMode: options?.jsonMode,
        responseSchema: options?.responseSchema,
      });
    case "anthropic":
      return callAnthropic(model.id, prompt, maxTokens, temperature);
    case "xai":
      return callXAI(model.id, prompt, maxTokens, temperature);
    default:
      throw new Error(`Unknown provider: ${model.provider}`);
  }
}

// ==================== MAIN API ====================

/**
 * Generate text using tier-appropriate models
 *
 * @param options - Generation options including prompt and user tier
 * @returns Generated text with metadata
 * @throws Error if no models are available or all fail
 */
export async function generateTextWithTier(
  options: MonitoredGenerateOptions,
): Promise<GenerateResult> {
  const {
    prompt,
    maxTokens = 2000,
    temperature = 0.7,
    userTier,
    modelId,
    jsonMode,
    responseSchema,
    observationContext,
    stage = "generation",
  } = options;
  const stageStartTime = Date.now();

  let preferredModel: AIModelConfig | undefined;
  if (modelId) {
    preferredModel = AI_MODELS.find((m) => m.id === modelId);

    const allowedTiers = TIER_ACCESS[userTier];
    const isAllowedTier = preferredModel
      ? allowedTiers.includes(preferredModel.tier)
      : false;

    if (
      !preferredModel ||
      !isAllowedTier ||
      !isProviderConfigured(preferredModel.provider)
    ) {
      logger.warn(
        { modelId, userTier },
        "Requested AI model is not allowed or not configured; falling back to automatic selection",
      );
      preferredModel = undefined;
    }
  }

  const tierModels = getModelsForTier(userTier).filter((model) =>
    isProviderConfigured(model.provider),
  );

  const availableModels: AIModelConfig[] = preferredModel
    ? [preferredModel, ...tierModels.filter((m) => m.id !== preferredModel!.id)]
    : tierModels;

  if (availableModels.length === 0) {
    const message =
      userTier === "basic"
        ? "AI service temporarily unavailable. Please try again later."
        : "No AI providers configured. Please contact support.";

    if (observationContext) {
      const classification = classifyAIFailure({
        errorMessage: message,
        providerNotConfigured: true,
      });
      await persistAIFailureEvent({
        context: observationContext,
        stage,
        failureCode: classification.failureCode,
        errorMessage: classification.errorMessage,
        httpStatus: classification.httpStatus,
        latencyMs: Date.now() - stageStartTime,
        promptPreview: prompt,
        providerErrorClass: classification.providerErrorClass,
      });
      markAIStageFailed(observationContext, stage, {
        latencyMs: Date.now() - stageStartTime,
      });
    }

    throw new Error(message);
  }

  const errors: Record<string, string> = {};

  for (const [modelIndex, model] of availableModels.entries()) {
    const breaker = breakers[model.provider as keyof typeof breakers];
    noteAIStageAttempt(observationContext ?? null, stage, {
      provider: model.provider,
      model: model.id,
    });

    if (breaker && breaker.isOpen()) {
      logger.warn(
        { model: model.id, provider: model.provider },
        "🚫 Circuit Breaker OPEN - Skipping",
      );

      if (observationContext) {
        const classification = classifyAIFailure({
          errorMessage: `Circuit breaker open for provider ${model.provider}`,
          circuitOpen: true,
        });

        await persistAIFailureEvent({
          context: observationContext,
          stage,
          provider: model.provider,
          model: model.id,
          failureCode: classification.failureCode,
          errorMessage: classification.errorMessage,
          latencyMs: 0,
          fallbackUsed: modelIndex < availableModels.length - 1,
          fallbackSucceeded: false,
          promptPreview: prompt,
          providerErrorClass: classification.providerErrorClass,
        });
      }
      continue;
    }

    const attemptStartTime = Date.now();

    try {
      logger.info(
        { model: model.id, provider: model.provider, tier: userTier },
        `Trying ${model.name}...`,
      );

      const result = await callProvider(model, prompt, maxTokens, temperature, {
        jsonMode,
        responseSchema,
      });

      if (breaker) breaker.recordSuccess();

      const estimatedTokens = prompt.length / 4 + result.text.length / 4;
      const estimatedCost =
        (estimatedTokens / 1_000_000) * model.costPer1MTokens;

      logger.info(
        { model: model.id, provider: model.provider, estimatedCost },
        `${model.name} success`,
      );

      if (observationContext) {
        await markAIStageSuccess(observationContext, stage, {
          provider: model.provider,
          model: result.model,
          latencyMs: Date.now() - stageStartTime,
        });
      }

      return {
        text: result.text,
        model: result.model,
        provider: model.provider,
        tier: model.tier,
        estimatedCost,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors[model.id] = errorMsg;

      if (breaker) breaker.recordFailure();

      logger.warn(
        { model: model.id, error: errorMsg },
        `${model.name} failed, trying next...`,
      );

      if (observationContext) {
        const classification = classifyAIFailure({
          error,
          errorMessage: errorMsg,
        });

        await persistAIFailureEvent({
          context: observationContext,
          stage,
          provider: model.provider,
          model: model.id,
          failureCode: classification.failureCode,
          errorMessage: classification.errorMessage,
          httpStatus: classification.httpStatus,
          latencyMs: Date.now() - attemptStartTime,
          fallbackUsed: modelIndex < availableModels.length - 1,
          fallbackSucceeded: false,
          promptPreview: prompt,
          responsePreview: errorMsg,
          failureSubcode: classification.failureSubcode,
          providerErrorClass: classification.providerErrorClass,
          schemaErrorCount: classification.schemaErrorCount,
        });
      }
    }
  }

  const finalErrorMessage = `All AI providers failed. Errors: ${JSON.stringify(errors)}`;

  if (observationContext) {
    const classification = classifyAIFailure({
      errorMessage: finalErrorMessage,
      allModelsFailed: true,
    });
    await persistAIFailureEvent({
      context: observationContext,
      stage,
      failureCode: classification.failureCode,
      errorMessage: classification.errorMessage,
      latencyMs: Date.now() - stageStartTime,
      promptPreview: prompt,
      responsePreview: finalErrorMessage,
      failureSubcode: classification.failureSubcode,
      providerErrorClass: classification.providerErrorClass,
      schemaErrorCount: classification.schemaErrorCount,
    });
    markAIStageFailed(observationContext, stage, {
      latencyMs: Date.now() - stageStartTime,
    });
  }

  if (userTier === "basic") {
    throw new Error(
      "AI service is currently unavailable. Please try again in a few minutes.",
    );
  }

  throw new Error(finalErrorMessage);
}
