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

// ==================== CIRCUIT BREAKERS ====================

const breakers = {
  google: new CircuitBreaker("google"),
  openai: new CircuitBreaker("openai"),
  anthropic: new CircuitBreaker("anthropic"),
  xai: new CircuitBreaker("xai"),
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Check if a provider has a valid API key configured
 */
function isProviderConfigured(provider: string): boolean {
  switch (provider) {
    case "openai":
      return !!process.env.OPENAI_API_KEY;
    case "google":
      return !!process.env.GEMINI_API_KEY;
    case "anthropic":
      return !!process.env.ANTHROPIC_API_KEY;
    case "xai":
      return !!process.env.XAI_API_KEY;
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
  options: GenerateOptions,
): Promise<GenerateResult> {
  const {
    prompt,
    maxTokens = 2000,
    temperature = 0.7,
    userTier,
    modelId,
    jsonMode,
    responseSchema,
  } = options;

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
    throw new Error(
      userTier === "basic"
        ? "AI service temporarily unavailable. Please try again later."
        : "No AI providers configured. Please contact support.",
    );
  }

  const errors: Record<string, string> = {};

  for (const model of availableModels) {
    const breaker = breakers[model.provider as keyof typeof breakers];

    if (breaker && breaker.isOpen()) {
      logger.warn(
        { model: model.id, provider: model.provider },
        "🚫 Circuit Breaker OPEN - Skipping",
      );
      continue;
    }

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
    }
  }

  if (userTier === "basic") {
    throw new Error(
      "AI service is currently unavailable. Please try again in a few minutes.",
    );
  }

  throw new Error(`All AI providers failed. Errors: ${JSON.stringify(errors)}`);
}
