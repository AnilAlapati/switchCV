
import "server-only";
/* eslint-disable max-lines -- Service aggregates provider-specific logic until we split transports */

/**
 * AI Provider Service - Tiered Model Selection
 *
 * This service provides tier-based AI model selection:
 * - Basic: Free/cheapest models only (Groq free tier, Gemini Flash)
 * - Premium: Better models with fallback (GPT-4o-mini, Gemini Pro)
 * - Enterprise: Best available models (GPT-4o, Claude, Gemini Pro)
 */

import { withRetry } from "@/lib/utils/retry";
import { logger } from "@/lib/logger";
import type {
  AIModelConfig,
  GenerateOptions,
  GenerateResult,
  SelectableModel,
  UserTier,
} from "@/types/ai";
export type {
  AIModelConfig,
  GenerateOptions,
  GenerateResult,
  SelectableModel,
  UserTier,
} from "@/types/ai";

// ==================== MODEL REGISTRY ====================

/**
 * All available models sorted by cost (cheapest first)
 */
export const AI_MODELS: AIModelConfig[] = [
  // CHEAP TIER - Gemini Flash
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "google",
    costPer1MTokens: 0.1,
    quality: 7,
    speed: 9,
    maxTokens: 8192,
    tier: "cheap",
  },
  // STANDARD TIER - GPT-4o-mini, Gemini Flash
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    costPer1MTokens: 0.6,
    quality: 8,
    speed: 8,
    maxTokens: 16384,
    tier: "standard",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "google",
    costPer1MTokens: 0.15,
    quality: 8,
    speed: 9,
    maxTokens: 8192,
    tier: "standard",
  },
  // PREMIUM TIER - Best models
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    costPer1MTokens: 10.0,
    quality: 10,
    speed: 7,
    maxTokens: 16384,
    tier: "premium",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "google",
    costPer1MTokens: 2.5,
    quality: 9,
    speed: 7,
    maxTokens: 32768,
    tier: "premium",
  },
  {
    id: "claude-3-5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    costPer1MTokens: 1.0,
    quality: 8,
    speed: 9,
    maxTokens: 8192,
    tier: "standard",
  },
  {
    id: "claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    costPer1MTokens: 6.0,
    quality: 9,
    speed: 8,
    maxTokens: 8192,
    tier: "premium",
  },
  {
    id: "grok-beta",
    name: "Grok Beta",
    provider: "xai",
    costPer1MTokens: 5.0,
    quality: 9,
    speed: 8,
    maxTokens: 32768,
    tier: "premium",
  },
];

// ==================== TIER CONFIGURATION ====================

/**
 * Define which model tiers each user tier can access
 */
const TIER_ACCESS: Record<UserTier, string[]> = {
  basic: ["free", "cheap"], // Only free and cheap models
  premium: ["free", "cheap", "standard"], // Up to standard models
  enterprise: ["free", "cheap", "standard", "premium"], // All models
};

/**
 * Define provider priority for each tier (try in this order)
 */
const TIER_PROVIDER_PRIORITY: Record<UserTier, string[]> = {
  basic: ["google"], // Gemini Flash
  premium: ["google", "openai"], // Gemini, then GPT
  enterprise: ["openai", "google", "anthropic"], // Best first
};

import { CircuitBreaker } from "@/lib/utils/CircuitBreaker";

const breakers = {
  google: new CircuitBreaker("google"),
  openai: new CircuitBreaker("openai"),
  anthropic: new CircuitBreaker("anthropic"),
  xai: new CircuitBreaker("xai"),
};

// ==================== PROVIDER IMPLEMENTATIONS ====================


async function callOpenAI(
  modelId: string,
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key not configured");

  const response = await withRetry(() =>
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    })
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No text generated from OpenAI");

  return { text: text.trim(), model: modelId };
}

async function callGemini(
  modelId: string,
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key not configured");

  const response = await withRetry(() =>
    fetch(
      `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      }
    )
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text generated from Gemini");

  return { text: text.trim(), model: modelId };
}

async function callAnthropic(
  modelId: string,
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Anthropic API key not configured");

  const response = await withRetry(() =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: "user", content: prompt }],
      }),
    })
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("No text generated from Anthropic");

  return { text: text.trim(), model: modelId };
}

async function callXAI(
  modelId: string,
  prompt: string,
  maxTokens: number,
  temperature: number
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("xAI API key not configured");

  const response = await withRetry(() =>
    fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
    })
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`xAI API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("No text generated from xAI");

  return { text: text.trim(), model: modelId };
}

// ==================== MAIN FUNCTION ====================

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
    }
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
  temperature: number
): Promise<{ text: string; model: string }> {
  switch (model.provider) {
    case "openai":
      return callOpenAI(model.id, prompt, maxTokens, temperature);
    case "google":
      return callGemini(model.id, prompt, maxTokens, temperature);
    case "anthropic":
      return callAnthropic(model.id, prompt, maxTokens, temperature);
    case "xai":
      return callXAI(model.id, prompt, maxTokens, temperature);
    default:
      throw new Error(`Unknown provider: ${model.provider}`);
  }
}

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
 * Generate text using tier-appropriate models
 *
 * @param options - Generation options including prompt and user tier
 * @returns Generated text with metadata
 * @throws Error if no models are available or all fail
 */
export async function generateTextWithTier(
  options: GenerateOptions
): Promise<GenerateResult> {
  const {
    prompt,
    maxTokens = 2000,
    temperature = 0.7,
    userTier,
    modelId,
  } = options;

  // If a specific model is requested (premium/enterprise UX), validate and prefer it.
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
        "Requested AI model is not allowed or not configured; falling back to automatic selection"
      );
      preferredModel = undefined;
    }
  }

  // Get models available for this tier
  const tierModels = getModelsForTier(userTier).filter((model) =>
    isProviderConfigured(model.provider)
  );

  // If we have a valid preferredModel, put it at the front of the list.
  const availableModels: AIModelConfig[] = preferredModel
    ? [preferredModel, ...tierModels.filter((m) => m.id !== preferredModel!.id)]
    : tierModels;

  if (availableModels.length === 0) {
    throw new Error(
      userTier === "basic"
        ? "AI service temporarily unavailable. Please try again later."
        : "No AI providers configured. Please contact support."
    );
  }

  const errors: Record<string, string> = {};

  // Try each model in order (cheapest/best based on tier)
  for (const model of availableModels) {
    const breaker = breakers[model.provider as keyof typeof breakers];

    if (breaker && breaker.isOpen()) {
      logger.warn({ model: model.id, provider: model.provider }, "🚫 Circuit Breaker OPEN - Skipping");
      continue;
    }

    try {
      logger.info(
        { model: model.id, provider: model.provider, tier: userTier },
        `Trying ${model.name}...`
      );

      const result = await callProvider(model, prompt, maxTokens, temperature);

      if (breaker) breaker.recordSuccess();

      // Estimate cost (rough: assume ~500 tokens for a resume generation)
      const estimatedTokens = prompt.length / 4 + result.text.length / 4;
      const estimatedCost =
        (estimatedTokens / 1_000_000) * model.costPer1MTokens;

      logger.info(
        { model: model.id, provider: model.provider, estimatedCost },
        `${model.name} success`
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
        `${model.name} failed, trying next...`
      );
    }
  }

  // All models failed
  if (userTier === "basic") {
    // For basic users, give a friendly error
    throw new Error(
      "AI service is currently unavailable. Please try again in a few minutes."
    );
  }

  // For premium/enterprise, give details
  throw new Error(`All AI providers failed. Errors: ${JSON.stringify(errors)}`);
}
